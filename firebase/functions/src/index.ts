import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";
import Groq from "groq-sdk";
import { Resend } from "resend";

admin.initializeApp();

const groqApiKey = defineSecret("GROQ_API_KEY");
const resendApiKey = defineSecret("RESEND_API_KEY");

const STRIP_PII = (text: string): string =>
  text
    .replace(/[\d{4}][\s-]?[\d{4}][\s-]?[\d{4}][\s-]?[\d{4}]/g, "[PHONE]")
    .replace(/[\w\.-]+@[\w\.-]+\.\w+/gi, "[EMAIL]")
    .replace(
      /(?:[A-Za-z]*\s)?(?:[A-Z][a-z]+)(?:\s[A-Z][a-z]+)*\s?(?:Road|Street|Lane|Colony|Block|Sector|Town)/gi,
      "[LOCATION]",
    )
    .trim();

const SEVERITIES = ["low", "medium", "high"] as const;
type Severity = (typeof SEVERITIES)[number];

const CATEGORIES = [
  "road",
  "waste_management",
  "water",
  "electricity",
  "sewage",
  "street_light",
  "encroachment",
  "other",
] as const;
type Category = (typeof CATEGORIES)[number];

interface ProcessResult {
  reportId: string;
  friendlyResponse: string;
  summary: string;
  category: Category;
  location: string;
  severity: Severity;
  action: {
    type: "email" | "letter" | "recommendation";
    content: string;
  };
  decision: "PROCEED" | "BLOCK";
}

const KARACHI_BODIES: Record<string, { body: string; description: string }> = {
  road: {
    body: "KMC Works Department + DMC",
    description: "Road maintenance and repair",
  },
  waste_management: {
    body: "KMC Solid Waste + DMC Sanitation",
    description: "Garbage collection and waste management",
  },
  water: {
    body: "KWSB (Karachi Water & Sewerage Board)",
    description: "Water supply issues",
  },
  sewage: {
    body: "KWSB (Karachi Water & Sewerage Board)",
    description: "Sewage and drainage",
  },
  electricity: {
    body: "K-Electric",
    description: "Electricity supply and maintenance",
  },
  street_light: {
    body: "DMC",
    description: "Street light installation and repair",
  },
  encroachment: { body: "DMC", description: "Encroachment removal" },
  garbage: {
    body: "KMC Solid Waste + DMC Sanitation",
    description: "Garbage collection",
  },
  light: { body: "DMC", description: "Street light repair" },
  other: { body: "Local DMC office", description: "General civic issues" },
};

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "classify_complaint",
      description: "Classify the complaint category and severity",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "water",
              "light",
              "garbage",
              "road",
              "waste_management",
              "electricity",
              "sewage",
              "street_light",
              "encroachment",
              "other",
            ],
            description: "The category of the civic issue",
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "How severe the issue is",
          },
          location: {
            type: "string",
            description:
              "The location or area mentioned in the report (e.g. Gulshan, Saddar)",
          },
        },
        required: ["category", "severity"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "crosscheck_karachi_issues",
      description:
        "Match complaint against known Karachi problem zones and identify the responsible civic body",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "The classified category of the issue",
          },
          location: {
            type: "string",
            description: "The location or area of the issue",
          },
        },
        required: ["category"],
      },
    },
  },
];

function classifyComplaint(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const category =
    typeof args.category === "string" &&
    CATEGORIES.includes(args.category as Category)
      ? args.category
      : "other";
  const severity =
    typeof args.severity === "string" &&
    SEVERITIES.includes(args.severity as Severity)
      ? args.severity
      : "medium";
  const location =
    typeof args.location === "string" ? args.location : "unknown";
  return { category, severity, location };
}

function crosscheckKarachiIssues(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const category = typeof args.category === "string" ? args.category : "other";
  const location =
    typeof args.location === "string" ? args.location : "unknown";
  const info = KARACHI_BODIES[category] || KARACHI_BODIES.other;
  return {
    category,
    location,
    relevantBody: info.body,
    description: info.description,
    note: `This ${category} issue in ${location} falls under ${info.body}.`,
  };
}

const AGENT_SYSTEM_PROMPT = `You are YouthEcho — an AI assistant that helps young people in Karachi report civic issues.

You have two tools available:
1. classify_complaint — Classify the issue category and severity based on the user's report
2. crosscheck_karachi_issues — Identify the responsible civic body for the issue

Always call classify_complaint first, then crosscheck_karachi_issues.

After you have results from both tools, respond with valid JSON (no markdown). Format:
{
  "friendlyResponse": "warm, child-friendly message under 3 sentences. Mention what they reported, say it's brave to speak up, and name the government body being contacted. Sound like a supportive friend not a customer service bot. Respond only in the language the user sends the message in; from english, urdu, or romanised Urdu (Urdu written in English letters and dont use hindi words ( e.g. 'Aap ne bohot acha kiya')). Default language is English",
  "summary": "one-sentence issue summary",
  "category": "the detected category e.g. road, water, garbage",
  "location": "the location mentioned by the user, or unknown if not mentioned",
  "severity": "low, medium, or high",
  "decision": "PROCEED or BLOCK",
  "actionType": "email, letter, or recommendation",
  "actionContent": "full draft of the email / letter / recommendation"
}

- decision: "PROCEED" if the report is valid, "BLOCK" if inappropriate
- actionType: one of "email", "letter", or "recommendation"
- actionContent: full draft content depending on actionType
- In friendlyResponse, do not mention specific street names unless stated by user. Mention the issue type and general area only.

If the user sends a greeting or casual message (like "hi", "kya haal he", "hello"), respond warmly without calling any tools. Do not treat it as a complaint. Only call both tools if the user describes an actual civic issue like a broken road, water leak, electricity problem, etc.

If the user asks who you are tell them you are an AI and not a human.

IMPORTANT: Your ONLY valid response is a raw JSON object. Do NOT write any text before or after it. Do NOT use markdown. Start your response with { and end with }.

`;

async function transcribeAudio(
  client: Groq,
  audioBase64: string,
): Promise<string> {
  const buffer = Buffer.from(audioBase64, "base64");
  const file = new File([buffer], "audio.webm", { type: "audio/webm" });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    language: "en",
  });

  const text = transcription.text || "";
  logger.info("Transcription completed", { length: text.length });

  buffer.fill(0);
  logger.info("Audio buffer zeroed (COPPA)");

  return text;
}

async function analyseImage(
  client: Groq,
  imageBase64: string,
): Promise<string> {
  const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

  const completion = await client.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Describe the civic issue shown in this image in detail. " +
              "Include what type of problem it is (road damage, garbage, water, etc.), " +
              "how severe it looks, and any visible location clues.",
          },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    max_tokens: 1024,
  });

  const description = completion.choices[0]?.message?.content || "";
  logger.info("Image analysis completed", {
    length: description.length,
    model: "llama-4-scout",
  });

  return description;
}

async function runAgentWithTools(
  client: Groq,
  combinedInput: string,
): Promise<ProcessResult> {
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: AGENT_SYSTEM_PROMPT },
    { role: "user", content: combinedInput },
  ];

  const fallback = (msg: string): ProcessResult => ({
    reportId: "",
    friendlyResponse: msg,
    summary: "",
    category: "other",
    location: "unknown",
    severity: "medium",
    decision: "PROCEED",
    action: { type: "recommendation", content: msg },
  });

  try {
    let response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages as any,
      tools: TOOLS as any,
      tool_choice: "auto",
      max_tokens: 2048,
    });

    let message = response.choices[0]?.message;
    let rounds = 0;
    const MAX_ROUNDS = 4;

    while (
      message?.tool_calls &&
      message.tool_calls.length > 0 &&
      rounds < MAX_ROUNDS
    ) {
      rounds++;

      const assistantMsg: Record<string, unknown> = {
        role: "assistant",
        content: message.content || null,
      };
      assistantMsg.tool_calls = message.tool_calls.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      }));
      messages.push(assistantMsg);

      for (const toolCall of message.tool_calls) {
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        let result: Record<string, unknown>;

        if (toolCall.function.name === "classify_complaint") {
          result = classifyComplaint(args);
        } else if (toolCall.function.name === "crosscheck_karachi_issues") {
          result = crosscheckKarachiIssues(args);
        } else {
          result = { error: `Unknown tool: ${toolCall.function.name}` };
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages as any,
        tools: TOOLS as any,
        tool_choice: "auto",
        max_tokens: 2048,
      });

      message = response.choices[0]?.message;
    }

    const raw = message?.content || "";
    logger.error("RAW GROQ OUTPUT", { raw });
    logger.info("Agent final response received", { length: raw.length });

    if (!raw.trim()) {
      return fallback("I received your report but couldn't analyze it.");
    }

    const cleaned = raw
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');

    logger.info("Raw agent output", { raw: raw.slice(0, 500) });
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      logger.info("Agent responded with plain text (greeting/casual)", {
        text: raw.slice(0, 200),
      });
      return fallback(raw.trim());
    }

    const parsed = JSON.parse(match[0]);

    const severity: Severity = SEVERITIES.includes(parsed.severity)
      ? parsed.severity
      : "medium";

    const actionType =
      parsed.actionType === "letter"
        ? "letter"
        : parsed.actionType === "recommendation"
          ? "recommendation"
          : "email";

    return {
      reportId: "",
      friendlyResponse: parsed.friendlyResponse || "",
      summary: parsed.summary || "",
      category: parsed.category || "other",
      location: parsed.location || "unknown",
      severity,
      decision: parsed.decision === "BLOCK" ? "BLOCK" : "PROCEED",
      action: {
        type: actionType,
        content: parsed.actionContent || "",
      },
    };
  } catch (err) {
    logger.error("Agent error:", err);
    if ((err as any)?.status === 429) {
      return fallback(
        "I'm a bit busy right now. Please try again in a few minutes!",
      );
    }
    return fallback(
      "I'm having trouble processing your report. Please try again.",
    );
  }
}

const TEST_MODE = true; // set to false in production

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  if (TEST_MODE) {
    logger.info("TEST MODE — email not sent", { to, subject });
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "YouthEcho <reports@youthecho.app>",
    to,
    subject,
    text: body,
  });
  logger.info("Email sent", { to, subject });
}

export const processReport = onCall(
  {
    secrets: [groqApiKey, resendApiKey],
    cors: true,
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    const { text, audioBase64, imageBase64 } = request.data || {};
    const client = new Groq({ apiKey: groqApiKey.value() });

    let combined = `Civic complaint report: ${STRIP_PII(text || "")}`;

    if (audioBase64 && typeof audioBase64 === "string") {
      logger.info("Processing audio input");
      const transcription = await transcribeAudio(client, audioBase64);
      combined += `\n[Voice transcription]: ${STRIP_PII(transcription)}`;
    }

    if (imageBase64 && typeof imageBase64 === "string") {
      logger.info("Processing image input");
      const description = await analyseImage(client, imageBase64);
      combined += `\n[Image analysis]: ${description}`;
    }

    if (!combined.trim() && !audioBase64 && !imageBase64) {
      throw new Error("No input provided (text, audio, or image required)");
    }

    if (!combined.trim()) {
      combined =
        "The user submitted a report via voice or image. Please analyze it based on the available context.";
    }

    const result = await runAgentWithTools(client, combined);
    result.reportId = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const firestore = admin.firestore();
    await firestore
      .collection("reports")
      .doc(result.reportId)
      .set({
        reportId: result.reportId,
        inputText: STRIP_PII(text || ""),
        hasAudio: !!audioBase64,
        hasImage: !!imageBase64,
        friendlyResponse: result.friendlyResponse,
        summary: result.summary,
        category: result.category,
        location: result.location,
        severity: result.severity,
        decision: result.decision,
        action: result.action,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: request.auth?.uid || "anonymous",
      });

    logger.info("Report saved", { reportId: result.reportId });

    if (result.action.type === "email" && result.decision === "PROCEED") {
      const body = KARACHI_BODIES[result.category] || KARACHI_BODIES.other;
      await sendEmail(
        resendApiKey.value(),
        "kmc@karachicity.gov.pk",
        `Civic Issue Report: ${result.summary}`,
        result.action.content,
      );
    }

    return {
      reportId: result.reportId,
      friendlyResponse: result.friendlyResponse,
      summary: result.summary,
      category: result.category,
      location: result.location,
      severity: result.severity,
      decision: result.decision,
      action: result.action,
    };
  },
);

export const onNewReport = onDocumentWritten("reports/{reportId}", (event) => {
  const data = event.data?.after?.data();
  if (!data) return;
  logger.info("New report recorded", {
    reportId: event.params.reportId,
    category: data.category,
    severity: data.severity,
  });
});
