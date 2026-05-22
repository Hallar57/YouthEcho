export type SystemState =
  | "IDLE"
  | "ANALYZING"
  | "ACTION_MENU"
  | "MODIFY"
  | "SOCIAL"
  | "EMAIL"
  | "LETTER";

export interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export interface IssueContext {
  text?: string;
  imageUri?: string;
  voiceTranscript?: string;
  category?: string;
  location?: string;
  severity?: "low" | "medium" | "high";
  agentSummary?: string;
  generatedContent?: {
    socialPost?: string;
    emailDraft?: { subject: string; body: string; recipient?: string };
    letterText?: string;
  };
}

export interface ReportAction {
  type: "email" | "letter" | "recommendation";
  content: string;
}

export interface AgenticResult {
  reportId: string;
  friendlyResponse: string;
  summary: string;
  category: string;
  location: string;
  severity: "low" | "medium" | "high";
  decision: "PROCEED" | "BLOCK" | "ERROR";
  action: ReportAction;
}

export interface AILogEntry {
  id: string;
  timestamp: Date;
  type: "text" | "image" | "voice";
  userInput: string;
  aiResponse: string;
  toolsUsed: string[];
  category?: string;
  severity?: string;
}

export interface FirestoreReport {
  reportId: string;
  inputText: string;
  hasAudio: boolean;
  hasImage: boolean;
  friendlyResponse: string;
  summary: string;
  category: string;
  location: string;
  severity: string;
  action: ReportAction;
  createdAt: { seconds: number; nanoseconds: number };
}
