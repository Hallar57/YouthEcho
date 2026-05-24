# YouthEcho — Bugs Found & Fixes Applied

---

## Bug 1: Agent Returning Hardcoded-Looking Responses

**Symptom:**
- Saying "hi" returned a generic empathetic message about road issues in Gulshan-e-Maymar
- Saying "who are you" returned "I received your report but couldn't process it. Please try again."
- Saying "I saw trash" returned a generic sympathy message with no action

**Root Cause:**
The Groq API was returning plain conversational text instead of calling the tools and returning JSON. The JSON regex match failed, triggering the fallback message. The system prompt was not strict enough about forcing JSON output.

**Fix:**
1. Framed all user input as a civic complaint before sending to the agent:
```ts
let combined = `Civic complaint report: ${STRIP_PII(text || "")}`;
```
2. Strengthened the system prompt to force JSON-only responses:
```
IMPORTANT: Your ONLY valid response after calling both tools is a raw JSON object.
Do NOT write any text before or after it. Start your response with { and end with }.
If the user says anything at all, even greetings, treat it as a civic report attempt and call both tools.
```

**File:** `firebase/functions/src/index.ts`

---

## Bug 2: Invalid JSON From Agent Due to Missing Comma

**Symptom:**
Agent consistently returned "I'm having trouble processing your report" after system prompt was updated.

**Root Cause:**
The JSON format example in `AGENT_SYSTEM_PROMPT` was missing a comma after the `friendlyResponse` field. The model copies the format exactly, producing invalid JSON that failed `JSON.parse()`.

**Broken format:**
```json
{
  "friendlyResponse": "..."  
  "summary": "..."
}
```

**Fix:**
Added the missing comma and rewrote the friendlyResponse instruction as a description rather than example text:
```json
{
  "friendlyResponse": "warm, child-friendly message under 3 sentences...",
  "summary": "one-sentence issue summary",
  ...
}
```

**File:** `firebase/functions/src/index.ts` — `AGENT_SYSTEM_PROMPT`

---

## Bug 3: Rate Limit Showing as Generic Error

**Symptom:**
When Groq's daily token limit (100,000 TPD) was hit, the app showed "I'm having trouble processing your report. Please try again." — indistinguishable from other errors.

**Root Cause:**
The catch block had a single generic fallback message for all error types including 429 rate limit errors.

**Fix:**
Added a specific check for 429 status in the catch block:
```ts
} catch (err) {
  logger.error("Agent error:", err);
  if ((err as any)?.status === 429) {
    return fallback("I'm a bit busy right now. Please try again in a few minutes!");
  }
  return fallback("I'm having trouble processing your report. Please try again.");
}
```

**File:** `firebase/functions/src/index.ts` — `runAgentWithTools()`

---

## Bug 4: Firebase Logs Not Appearing

**Symptom:**
`logger.info` calls were not showing up in Firebase Console under Functions.

**Root Cause:**
Firebase v2 Cloud Functions run on Cloud Run, not the legacy Cloud Functions runtime. Logs appear under `resource.type="cloud_run_revision"` in Google Cloud Logging, not under the Functions tab in Firebase Console.

**Fix:**
Used Google Cloud Logging directly at `console.cloud.google.com` and searched:
```
resource.type="cloud_run_revision"
```
Also switched debug logs to `logger.error` temporarily since error logs surface more visibly.

---

## Bug 5: git Merge Conflict on package-lock.json

**Symptom:**
Running `git pull origin main` failed with:
```
error: Your local changes to the following files would be overwritten by merge: package-lock.json
```
After stash and pop, a conflict remained in `package-lock.json`.

**Root Cause:**
`package-lock.json` was modified locally and also changed on the remote branch, causing a merge conflict on an auto-generated file.

**Fix:**
Regenerated the file cleanly and committed it:
```bash
npm install
git add package-lock.json
git commit -m "resolve package-lock conflict"
```

---

## Summary

| # | Bug | Fix |
|---|---|---|
| 1 | Agent returning fallback due to no JSON from Groq | Framed input as complaint, stricter system prompt |
| 2 | Invalid JSON from missing comma in prompt template | Fixed comma, rewrote friendlyResponse instruction |
| 3 | Rate limit error showing as generic message | Added 429-specific catch and user-friendly message |
| 4 | Firebase logs not visible in Functions tab | Used Cloud Logging with cloud_run_revision filter |
| 5 | package-lock.json merge conflict | Regenerated with npm install and committed |
