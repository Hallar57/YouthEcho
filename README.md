# YouthEcho

> Empowering Karachi's youth to report civic issues through AI-powered advocacy.

YouthEcho lets children report broken infrastructure, waste, water, and electricity issues using text, voice, or photos. An autonomous AI agent classifies the complaint, cross-references Karachi's civic bodies, and generates an official email, printable letter, or social media post — all without human instruction.

---

## Features

- Voice, photo, and text input
- Agentic AI workflow (classify → crosscheck → act)
- Auto-drafted emails to KMC, KWSB, K-Electric, DMC
- Native share sheet for social media posts
- Parent dashboard with full activity log
- One-tap data deletion (COPPA compliant)
- Math-based parental gate before any data upload

---

## Agentic Workflow

Child submits report (text/voice/image)
→ Cloud Function triggers
→ Tool 1: classify_complaint (category + severity)
→ Tool 2: crosscheck_karachi_issues (responsible civic body)
→ Agent drafts action (email / letter / social post)
→ Result saved to Firestore

No human instruction required at any step.

---

## Tech Stack

| Layer     | Technology                                            |
| --------- | ----------------------------------------------------- |
| Frontend  | React Native (Expo) + TypeScript                      |
| Backend   | Firebase Cloud Functions (Node.js 20)                 |
| Database  | Firestore                                             |
| Auth      | Firebase Anonymous Auth                               |
| AI Models | Groq (llama-3.3-70b, whisper-large-v3, llama-4-scout) |
| Email     | Resend API                                            |

---

## Setup

```bash
git clone https://github.com/yourname/YouthEcho
cd YouthEcho
npm install
npx expo start -c
```
### Firebase Setup
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### Secrets Required

```bash
firebase functions:secrets:set GROQ_API_KEY
firebase functions:secrets:set RESEND_API_KEY
```

---

## Project Structure

YouthEcho/
├── app/
│ ├── screens/HomeScreen.tsx # Main chat interface
│ ├── components/
│ │ ├── ParentalGate.tsx # COPPA math gate + privacy disclosure
│ │ ├── ParentDashboard.tsx # Activity log + data deletion
│ │ ├── ActionMenu.tsx # Email / letter / social options
│ │ └── ChatBubble.tsx # Message UI
│ └── types.ts
├── firebase/
│ └── functions/src/index.ts # AI agent + Cloud Functions
├── services/
│ └── aiService.ts # Firebase function calls
├── firebaseConfig.ts
└── firestore.rules

---

## Safety & Compliance

- **COPPA:** Math gate + parental consent before any data upload
- **PII Stripping:** Phone numbers, emails, addresses removed before AI processing
- **Audio Deletion:** Voice recordings deleted immediately after transcription
- **Data Sovereignty:** Parent can delete all data with one button
- **Anonymous Auth:** No names or identifiers collected

---

## Team

| Name                | ID      | Role                           |
| ------------------- | ------- | ------------------------------ |
| Hallar Ahmed Khuhro | 2312367 | Team Lead & Agent Architecture |
| Vishesh             | 2312391 | Frontend                       |
| Inshall Anwar       | 2312375 | Backend & Firebase             |
| Bilal Sohail        | 2312386 | Safety & Compliance            |
| Muhammad Aashir     | 2312379 | QA & Testing                   |

---

## Course

CSC-4101 — SZABIST University Karachi

---

## License

Built for educational purposes as part of an AI for Social Good initiative.
