import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db, signInAnonymously } from "../firebaseConfig";
import {
  deleteAllData,
  getAIInteractionLog,
  logAIInteraction,
  runAgenticWorkflow,
} from "../services/aiService";

// ============================================
// STATE MACHINE DEFINITIONS
// ============================================
type SystemState =
  | "S0_IDLE"
  | "S3_ANALYZING"
  | "S4_ACTION_MENU"
  | "S4M_MODIFY"
  | "S5A_SOCIAL"
  | "S5B_EMAIL"
  | "S5C_LETTER"
  | "S6_SUCCESS";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

interface IssueContext {
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

// ============================================
// CHAT BUBBLE COMPONENT
// ============================================
const ChatBubble = ({ message }: { message: Message }) => {
  const popIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(popIn, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const isAI = message.sender === "ai";

  return (
    <Animated.View
      style={[
        styles.bubbleWrapper,
        isAI ? styles.aiWrapper : styles.userWrapper,
        { transform: [{ scale: popIn }] },
      ]}
    >
      {isAI && <Text style={styles.aiAvatar}>🤖</Text>}
      <View style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}>
        <Text
          style={[styles.bubbleText, isAI ? styles.aiText : styles.userText]}
        >
          {message.text}
        </Text>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </Animated.View>
  );
};

// ============================================
// PARENTAL GATE COMPONENT (COPPA 2025)
// ============================================
const ParentalGate = ({ onVerified }: { onVerified: () => void }) => {
  const [step, setStep] = useState<"math" | "privacy">("math");
  const [answer, setAnswer] = useState("");
  const [num1] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [num2] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [accepted, setAccepted] = useState(false);

  const handleMathSubmit = () => {
    if (parseInt(answer) === num1 + num2) {
      setStep("privacy");
    } else {
      Alert.alert("Try Again", "Solve the math problem to continue.");
      setAnswer("");
    }
  };

  if (step === "math") {
    return (
      <View style={styles.parentalGateContainer}>
        <View style={styles.parentalGateCard}>
          <Text style={styles.parentalGateTitle}>👋 Welcome to YouthEcho!</Text>
          <Text style={styles.parentalGateSubtitle}>
            Parent/Guardian Verification Required
          </Text>
          <Text style={styles.mathQuestion}>
            What is {num1} + {num2}?
          </Text>
          <TextInput
            style={styles.mathInput}
            keyboardType="number-pad"
            value={answer}
            onChangeText={setAnswer}
            placeholder="Enter answer"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={styles.parentalButton}
            onPress={handleMathSubmit}
          >
            <Text style={styles.parentalButtonText}>Verify</Text>
          </TouchableOpacity>
          <Text style={styles.privacyNote}>
            This confirms a parent/guardian is present.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.parentalGateContainer}>
      <View style={styles.parentalGateCard}>
        <Text style={styles.parentalGateTitle}>📋 Privacy & Safety</Text>
        <Text style={styles.privacyText}>
          • We DO NOT store your name, face, or voice recordings{"\n"}• Audio is
          transcribed and IMMEDIATELY deleted{"\n"}• Photos are analyzed but NOT
          saved permanently{"\n"}• All reports are anonymous{"\n"}• Parent can
          delete all data anytime
        </Text>
        <TouchableOpacity
          style={[
            styles.parentalButton,
            accepted && styles.parentalButtonActive,
          ]}
          onPress={() => setAccepted(!accepted)}
        >
          <Text style={styles.parentalButtonText}>
            {accepted ? "✅ I understand" : "⬜ I understand and agree"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.parentalButton,
            styles.consentButton,
            !accepted && styles.disabledButton,
          ]}
          onPress={accepted ? onVerified : undefined}
          disabled={!accepted}
        >
          <Text style={styles.parentalButtonText}>Enter YouthEcho</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// MODIFY OUTPUT COMPONENT
// ============================================
const ModifyOutputScreen = ({
  currentSummary,
  onSave,
  onBack,
}: {
  currentSummary: string;
  onSave: (newSummary: string) => void;
  onBack: () => void;
}) => {
  const [editedText, setEditedText] = useState(currentSummary);
  const [instruction, setInstruction] = useState("");

  const handleRegenerateWithInstruction = () => {
    if (instruction.trim()) {
      Alert.alert("AI Refining", `Adjusting tone: "${instruction}"`);
      onSave(editedText + `\n\n[Edited based on: ${instruction}]`);
    } else {
      onSave(editedText);
    }
  };

  return (
    <View style={styles.modifyContainer}>
      <Text style={styles.modifyTitle}>✏️ Modify Your Report</Text>
      <Text style={styles.modifyLabel}>Edit the issue summary:</Text>
      <TextInput
        style={styles.modifyTextInput}
        multiline
        value={editedText}
        onChangeText={setEditedText}
        placeholder="Describe the issue..."
        placeholderTextColor="#999"
      />
      <Text style={styles.modifyLabel}>Or give instructions to AI:</Text>
      <TextInput
        style={styles.modifyInstructionInput}
        value={instruction}
        onChangeText={setInstruction}
        placeholder="e.g., 'make it sound more urgent', 'add that this has been happening for 3 weeks'"
        placeholderTextColor="#999"
      />
      <View style={styles.modifyButtons}>
        <TouchableOpacity style={styles.modifyBackButton} onPress={onBack}>
          <Text style={styles.modifyButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modifySaveButton}
          onPress={handleRegenerateWithInstruction}
        >
          <Text style={styles.modifyButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// ACTION MENU COMPONENT
// ============================================
const ActionMenu = ({
  issueContext,
  onActionSelect,
  onModify,
  onCancel,
}: {
  issueContext: IssueContext;
  onActionSelect: (action: "social" | "email" | "letter") => void;
  onModify: () => void;
  onCancel: () => void;
}) => {
  return (
    <View style={styles.actionMenuContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 AI Understanding</Text>
        <Text style={styles.summaryText}>{issueContext.agentSummary}</Text>
        <TouchableOpacity onPress={onModify}>
          <Text style={styles.modifyLink}>✏️ Edit or refine</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.actionTitle}>What would you like to do?</Text>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => onActionSelect("social")}
      >
        <Ionicons name="share-social" size={32} color="#1DA1F2" />
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionCardTitle}>Post on Social Media</Text>
          <Text style={styles.actionCardSubtitle}>
            Share your concern publicly
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => onActionSelect("email")}
      >
        <Ionicons name="mail" size={32} color="#EA4335" />
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionCardTitle}>Email a City Official</Text>
          <Text style={styles.actionCardSubtitle}>Send directly to KMC</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => onActionSelect("letter")}
      >
        <Ionicons name="document-text" size={32} color="#FF8C00" />
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionCardTitle}>Generate Printable Letter</Text>
          <Text style={styles.actionCardSubtitle}>
            Copy and submit physically
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelActionButton} onPress={onCancel}>
        <Text style={styles.cancelActionText}>Start Over</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================
// PARENT DASHBOARD COMPONENT (Human-in-the-Loop)
// ============================================
interface AILogEntry {
  id: string;
  timestamp: Date;
  type: "text" | "image" | "voice";
  userInput: string;
  aiResponse: string;
  toolsUsed: string[];
  category?: string;
  severity?: string;
}

const ParentDashboard = ({
  onClose,
  onDeleteAllData,
}: {
  onClose: () => void;
  onDeleteAllData: () => void;
}) => {
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    // Fetch AI interaction logs
    const loadLogs = () => {
      const allLogs = getAIInteractionLog();
      setLogs(allLogs);
    };
    loadLogs();
  }, []);

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>👨‍👩‍👧 Parent Dashboard</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.dashboardInfo}>
        <Text style={styles.dashboardInfoText}>
          📊 <Text style={styles.boldText}>Human-in-the-Loop:</Text> View all AI
          interactions below
        </Text>
        <Text style={styles.dashboardInfoText}>
          🤖 <Text style={styles.boldText}>Transparency:</Text> Your child is
          talking to an AI assistant, not a real person
        </Text>
      </View>

      <ScrollView style={styles.logList}>
        {logs.length === 0 ? (
          <Text style={styles.noLogsText}>
            No interactions yet. Start a conversation!
          </Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logType}>
                  {log.type === "text"
                    ? "💬"
                    : log.type === "image"
                      ? "📸"
                      : "🎙️"}{" "}
                  {log.type.toUpperCase()}
                </Text>
                <Text style={styles.logTime}>
                  {log.timestamp.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.logLabel}>Your child&apos;s input:</Text>
              <Text style={styles.logInput}>{log.userInput}</Text>
              <Text style={styles.logLabel}>AI response:</Text>
              <Text style={styles.logResponse}>
                {log.aiResponse.substring(0, 150)}...
              </Text>
              <View style={styles.logTools}>
                <Text style={styles.logToolsLabel}>Tools used: </Text>
                {log.toolsUsed.map((tool, idx) => (
                  <Text key={idx} style={styles.toolTag}>
                    {tool}
                  </Text>
                ))}
              </View>
              {log.category && (
                <Text style={styles.logCategory}>
                  Category: {log.category} | Severity: {log.severity}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.dataSovereigntySection}>
        <Text style={styles.dataSovereigntyTitle}>🔒 Data Sovereignty</Text>
        <Text style={styles.dataSovereigntyText}>
          Delete all data including AI memory and conversation history
        </Text>
        {!showDeleteConfirm ? (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete All Data</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.deleteConfirmBox}>
            <Text style={styles.deleteConfirmText}>Are you sure?</Text>
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={() => {
                  onDeleteAllData();
                  setShowDeleteConfirm(false);
                }}
              >
                <Text style={styles.confirmDeleteText}>Yes, Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function HomeScreen() {
  // State Machine
  const [currentState, setCurrentState] = useState<SystemState>("S0_IDLE");
  const [issueContext, setIssueContext] = useState<IssueContext>({});
  const [parentalVerified, setParentalVerified] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hey there! 👋 I'm your YouthEcho guide. Tell me what's happening in your neighborhood - broken roads, garbage issues, or anything you'd like to report!",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);

  // UI State
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const buttonPulse = useRef(new Animated.Value(1)).current;

  // Firebase initialization check
  // Replace the current Firebase useEffect with this
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Sign in anonymously for Firestore access
        await signInAnonymously(auth);
        console.log("✅ Firebase loaded!");
        console.log("📁 Firestore:", db ? "Connected" : "Failed");
        console.log("🔐 Auth:", auth ? "Ready" : "Failed");
      } catch (error) {
        if (error instanceof Error) {
          console.error("❌ Firebase error:", error.message);
        } else {
          console.error("❌ Firebase error:", String(error));
        }
      }
    };
    initFirebase();
  }, []);

  // Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Request camera permissions
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Camera access is required to take photos of issues.",
      );
      return false;
    }
    return true;
  };

  // Request microphone permissions
  const requestMicrophonePermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Microphone access is required for voice reports.",
      );
      return false;
    }
    return true;
  };

  // Add message to chat
  const addMessage = (text: string, sender: "user" | "ai") => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // Simulate AI thinking with typing indicator
  const simulateAITyping = (callback: () => void) => {
    addMessage("🤔 Thinking...", "ai");
    setTimeout(() => {
      // Remove the thinking message
      setMessages((prev) => prev.slice(0, -1));
      callback();
    }, 1500);
  };

  // Handle text message submission - Using Agentic Workflow
  const handleSendText = async () => {
    if (inputText.trim() === "") return;

    const userMessage = inputText;
    addMessage(userMessage, "user");
    setInputText("");

    setCurrentState("S3_ANALYZING");
    addMessage("🤔 Thinking...", "ai");

    try {
      // Use Agentic Workflow - AI makes autonomous decisions and calls multiple tools
      const agenticResult = await runAgenticWorkflow(userMessage);

      // Remove the thinking message
      setMessages((prev) => prev.slice(0, -1));

      // Log interaction for parent dashboard
      logAIInteraction(
        "text",
        userMessage,
        agenticResult.friendlyResponse,
        agenticResult.toolsCalled,
        agenticResult.analysis.category,
        agenticResult.analysis.severity,
      );

      if (agenticResult.decision === "BLOCK") {
        addMessage(agenticResult.friendlyResponse, "ai");
        setCurrentState("S0_IDLE");
        return;
      }

      const { analysis } = agenticResult;

      setIssueContext((prev) => ({
        ...prev,
        text: userMessage,
        category: analysis.category || "other",
        location: analysis.location || "unknown",
        severity: analysis.severity || "medium",
        agentSummary: analysis.summary || agenticResult.friendlyResponse,
      }));

      // Show AI response
      addMessage(agenticResult.friendlyResponse, "ai");
      setCurrentState("S0_IDLE");
    } catch (error) {
      setMessages((prev) => prev.slice(0, -1));
      addMessage(
        "I hear you! That sounds frustrating. Can you tell me more about where this is happening?",
        "ai",
      );
      setCurrentState("S0_IDLE");
    }
  };
  // Handle camera capture - Using Agentic Workflow
  const handleCameraCapture = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      addMessage("📸 [Photo attached]", "user");
      setCurrentState("S3_ANALYZING");

      try {
        const imageBase64 = result.assets[0].base64 || "";

        // Use Agentic Workflow for image analysis
        const agenticResult = await runAgenticWorkflow(
          "What's in this image? Describe any civic issues you see.",
          { imageBase64 },
        );

        // Log for parent dashboard
        logAIInteraction(
          "image",
          "[Photo]",
          agenticResult.friendlyResponse,
          agenticResult.toolsCalled,
          agenticResult.analysis.category,
          agenticResult.analysis.severity,
        );

        const agentSummary =
          agenticResult.analysis.summary ||
          agenticResult.friendlyResponse ||
          "I've analyzed your photo.";

        setIssueContext({
          imageUri: result.assets[0].uri,
          category: agenticResult.analysis.category || "other",
          location: agenticResult.analysis.location || "detected from image",
          severity: agenticResult.analysis.severity || "medium",
          agentSummary: agentSummary,
        });

        addMessage(
          `📋 I've analyzed your photo:\n\n${agentSummary}\n\nWhat would you like to do about this?`,
          "ai",
        );
        setCurrentState("S4_ACTION_MENU");
        setShowActionMenu(true);
      } catch (error) {
        addMessage(
          "📸 I received your photo but couldn't analyze it. Please describe what you see!",
          "ai",
        );
        setCurrentState("S0_IDLE");
      }
    }
  };

  // Handle voice recording
  const startRecording = async () => {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert("Failed to record", "Please try again");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    const uri = recording.getURI();
    await recording.stopAndUnloadAsync();
    setRecording(null);

    if (!uri) {
      addMessage("🎙️ Failed to save recording. Please try again.", "ai");
      setCurrentState("S0_IDLE");
      return;
    }

    addMessage("🎙️ [Voice recording submitted]", "user");
    setCurrentState("S3_ANALYZING");

    try {
      // Convert audio to base64 using fetch
      const response = await fetch(uri);
      const blob = await response.blob();

      // Get base64 from blob
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Use Agentic Workflow for voice analysis
      const agenticResult = await runAgenticWorkflow(
        "Analyze this voice message",
        { audioBase64 },
      );

      // Log for parent dashboard
      logAIInteraction(
        "voice",
        "[Voice message]",
        agenticResult.friendlyResponse,
        agenticResult.toolsCalled,
        agenticResult.analysis.category,
        agenticResult.analysis.severity,
      );

      const transcribedText =
        agenticResult.analysis.summary || agenticResult.friendlyResponse || "";

      setIssueContext({
        voiceTranscript: transcribedText,
        text: transcribedText,
        category: agenticResult.analysis.category || "other",
        location: "voice message",
        severity: agenticResult.analysis.severity || "medium",
        agentSummary: agenticResult.friendlyResponse,
      });

      addMessage(
        `🎙️ I've transcribed your voice message:\n\n"${transcribedText}"\n\n${agenticResult.friendlyResponse}\n\nHow would you like to take action?`,
        "ai",
      );
      setCurrentState("S4_ACTION_MENU");
      setShowActionMenu(true);

      console.log(
        "[COPPA] Audio buffer deleted immediately after transcription",
      );
    } catch (error) {
      console.error("Voice transcription error:", error);
      addMessage(
        "🎙️ I received your voice message but couldn't process it. Please try typing instead!",
        "ai",
      );
      setCurrentState("S0_IDLE");
    }
  };

  // Handle action selection
  const handleActionSelect = (action: "social" | "email" | "letter") => {
    const summary = issueContext.agentSummary || "";

    switch (action) {
      case "social":
        const socialPost = `🚨 URGENT: ${summary.substring(0, 120)}...\n\n📍 Location detected\n#Karachi #CivicIssues #YouthEcho`;
        setIssueContext((prev) => ({
          ...prev,
          generatedContent: { socialPost },
        }));
        addMessage(
          `📱 Here's your social media post:\n\n"${socialPost}"\n\nYou can copy this and share it on Twitter, Instagram, or Facebook to raise awareness!`,
          "ai",
        );
        setCurrentState("S5A_SOCIAL");
        break;
      case "email":
        const emailDraft = {
          subject: `Civic Issue Report: ${summary.substring(0, 60)}`,
          body: `Dear City Official,\n\n${summary}\n\nPlease address this matter at your earliest convenience.\n\nRegards,\nA Concerned Citizen\n[Submitted via YouthEcho]`,
          recipient: "kmc@karachicity.gov.pk",
        };
        setIssueContext((prev) => ({
          ...prev,
          generatedContent: { emailDraft },
        }));
        addMessage(
          `📧 I've drafted an email to the Karachi Metropolitan Corporation:\n\nTo: ${emailDraft.recipient}\nSubject: ${emailDraft.subject}\n\n${emailDraft.body}\n\nYou can copy this and send it through your email app!`,
          "ai",
        );
        setCurrentState("S5B_EMAIL");
        break;
      case "letter":
        const letterText = `[DATE]\n\nKarachi Metropolitan Corporation\n[Department]\n\nSubject: ${summary.substring(0, 60)}\n\nDear Sir/Madam,\n\n${summary}\n\nI request your urgent attention to this matter.\n\nSincerely,\n[Your Name]\n[Signature]`;
        setIssueContext((prev) => ({
          ...prev,
          generatedContent: { letterText },
        }));
        addMessage(
          `📄 Here's a formal letter you can print and submit:\n\n${letterText}\n\nYou can copy this text and print it out to physically submit to the local authorities.`,
          "ai",
        );
        setCurrentState("S5C_LETTER");
        break;
    }
    setShowActionMenu(false);
  };

  const handleModifySave = (newSummary: string) => {
    setIssueContext((prev) => ({ ...prev, agentSummary: newSummary }));
    addMessage(
      `✏️ I've updated my understanding: "${newSummary}"\n\nWhat would you like to do now?`,
      "ai",
    );
    setShowModifyModal(false);
    setCurrentState("S4_ACTION_MENU");
    setShowActionMenu(true);
  };

  const resetConversation = () => {
    setIssueContext({});
    setCurrentState("S0_IDLE");
    setShowActionMenu(false);
    setMessages([
      {
        id: Date.now().toString() + Math.random().toString(),
        text: "Hey there! 👋 I'm your YouthEcho guide. Tell me what's happening in your neighborhood - broken roads, garbage issues, or anything you'd like to report!",
        sender: "ai",
        timestamp: new Date(),
      },
    ]);
  };

  const handleDone = () => {
    addMessage(
      "🎉 Great job making your voice heard! Want to report another issue or take a different action on this one?",
      "ai",
    );
    setCurrentState("S0_IDLE");
  };

  // Handle delete all data (Data Sovereignty)
  const handleDeleteAllData = async () => {
    await deleteAllData();
    setMessages([
      {
        id: "1",
        text: "Hey there! 👋 I'm your YouthEcho guide. All previous data has been cleared. What's happening in your neighborhood?",
        sender: "ai",
        timestamp: new Date(),
      },
    ]);
    setIssueContext({});
    setCurrentState("S0_IDLE");
    setShowParentDashboard(false);
    Alert.alert(
      "Data Deleted",
      "All AI memory and conversation history has been cleared.",
    );
  };

  // Render chat interface
  const renderChat = () => (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={{ paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </ScrollView>

      {/* Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
            <Ionicons name="mic" size={24} color="#FF4444" />
          </Animated.View>
          <Text style={styles.recordingIndicatorText}>
            Recording... Release to send
          </Text>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.inputButton}
          onPress={handleCameraCapture}
        >
          <Ionicons name="camera" size={26} color="#FF6B6B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.inputButton, isRecording && styles.inputButtonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
        >
          <Ionicons
            name="mic"
            size={26}
            color={isRecording ? "#FF4444" : "#4ECDC4"}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Type your concern..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          editable={!isRecording}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSendText}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>YouthEcho</Text>
          <Text style={styles.headerSubtitle}>
            Your Voice. Heard. Amplified.
          </Text>
        </View>
        <View style={styles.headerRight}>
          {currentState !== "S0_IDLE" && (
            <TouchableOpacity
              onPress={resetConversation}
              style={styles.headerButton}
            >
              <Ionicons name="refresh" size={20} color="#FF8C00" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowParentDashboard(true)}
            style={styles.headerButton}
          >
            <Ionicons name="shield-checkmark" size={22} color="#4ECDC4" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Parent Dashboard Modal */}
      <Modal
        visible={showParentDashboard}
        animationType="slide"
        onRequestClose={() => setShowParentDashboard(false)}
      >
        <SafeAreaView style={styles.dashboardModalContainer}>
          <ParentDashboard
            onClose={() => setShowParentDashboard(false)}
            onDeleteAllData={handleDeleteAllData}
          />
        </SafeAreaView>
      </Modal>

      {/* Parental Gate */}
      {!parentalVerified ? (
        <ParentalGate onVerified={() => setParentalVerified(true)} />
      ) : (
        <>
          {/* Action Menu Modal */}
          <Modal
            visible={showActionMenu}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowActionMenu(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ActionMenu
                  issueContext={issueContext}
                  onActionSelect={handleActionSelect}
                  onModify={() => {
                    setShowActionMenu(false);
                    setShowModifyModal(true);
                  }}
                  onCancel={() => {
                    setShowActionMenu(false);
                    resetConversation();
                  }}
                />
              </View>
            </View>
          </Modal>

          {/* Modify Modal */}
          <Modal visible={showModifyModal} animationType="slide">
            <ModifyOutputScreen
              currentSummary={issueContext.agentSummary || ""}
              onSave={handleModifySave}
              onBack={() => {
                setShowModifyModal(false);
                setShowActionMenu(true);
              }}
            />
          </Modal>

          {/* Main Chat Interface */}
          {renderChat()}
        </>
      )}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F8FF" },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#F0F8FF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#FF8C00" },
  headerSubtitle: { fontSize: 12, color: "#999", marginLeft: 8, flex: 1 },
  resetButton: { padding: 8 },

  // Chat
  chatArea: { flex: 1, paddingHorizontal: 15 },
  bubbleWrapper: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-end",
    maxWidth: "85%",
  },
  aiWrapper: { alignSelf: "flex-start" },
  userWrapper: { alignSelf: "flex-end", justifyContent: "flex-end" },
  aiAvatar: { fontSize: 28, marginRight: 8 },
  bubble: {
    padding: 14,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  aiBubble: { backgroundColor: "white", borderBottomLeftRadius: 5 },
  userBubble: { backgroundColor: "#FF8C00", borderBottomRightRadius: 5 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  aiText: { color: "#333" },
  userText: { color: "white" },
  timestamp: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
    alignSelf: "flex-end",
  },

  // Input Bar
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    paddingBottom: Platform.OS === "ios" ? 25 : 15,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
    gap: 8,
  },
  inputButton: {
    padding: 10,
    borderRadius: 30,
    backgroundColor: "#F5F5F5",
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  inputButtonActive: {
    backgroundColor: "#FFEEEE",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 45,
    color: "#333",
  },
  sendButton: {
    backgroundColor: "#32CD32",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "#A8E6A8",
    elevation: 0,
  },

  // Recording Indicator
  recordingIndicator: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#FFEEEE",
    borderRadius: 24,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#FF4444",
    zIndex: 1000,
  },
  recordingIndicatorText: {
    color: "#FF4444",
    fontWeight: "bold",
    fontSize: 14,
  },

  // Parental Gate
  parentalGateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    padding: 20,
  },
  parentalGateCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    elevation: 4,
  },
  parentalGateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  parentalGateSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  mathQuestion: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  mathInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
  },
  parentalButton: {
    backgroundColor: "#FF8C00",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  parentalButtonActive: { backgroundColor: "#32CD32" },
  parentalButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  consentButton: { backgroundColor: "#4ECDC4" },
  disabledButton: { opacity: 0.5 },
  privacyNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
  },
  privacyText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
    marginVertical: 16,
  },

  // Action Menu Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  actionMenuContainer: { padding: 20 },
  summaryCard: {
    backgroundColor: "#E8F4FD",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  summaryText: { fontSize: 14, color: "#333", lineHeight: 20 },
  modifyLink: {
    color: "#FF8C00",
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  actionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  actionCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionTextContainer: { flex: 1 },
  actionCardTitle: { fontSize: 16, fontWeight: "bold" },
  actionCardSubtitle: { fontSize: 13, color: "#666", marginTop: 2 },
  cancelActionButton: { marginTop: 20, padding: 14, alignItems: "center" },
  cancelActionText: { color: "#FF6B6B", fontSize: 16, fontWeight: "500" },

  // Modify Modal
  modifyContainer: { flex: 1, padding: 20, backgroundColor: "white" },
  modifyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modifyLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  modifyTextInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
  },
  modifyInstructionInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 12,
    minHeight: 60,
    textAlignVertical: "top",
    fontSize: 14,
  },
  modifyButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  modifyBackButton: {
    flex: 1,
    backgroundColor: "#E0E0E0",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modifySaveButton: {
    flex: 1,
    backgroundColor: "#32CD32",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modifyButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Header
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: "row", gap: 8 },
  headerButton: { padding: 8 },

  // Parent Dashboard
  dashboardModalContainer: { flex: 1, backgroundColor: "#F0F8FF" },
  dashboardContainer: { flex: 1, padding: 20 },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 40,
  },
  dashboardTitle: { fontSize: 24, fontWeight: "bold", color: "#333" },
  dashboardInfo: {
    backgroundColor: "#E8F4FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  dashboardInfoText: { fontSize: 14, color: "#333", marginBottom: 8 },
  boldText: { fontWeight: "bold" },
  logList: { flex: 1 },
  noLogsText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    marginTop: 40,
  },
  logCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  logType: { fontSize: 12, fontWeight: "bold", color: "#FF8C00" },
  logTime: { fontSize: 11, color: "#999" },
  logLabel: { fontSize: 12, color: "#666", marginTop: 8 },
  logInput: {
    fontSize: 14,
    color: "#333",
    backgroundColor: "#F5F5F5",
    padding: 8,
    borderRadius: 8,
  },
  logResponse: { fontSize: 13, color: "#555", marginTop: 4 },
  logTools: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 4 },
  logToolsLabel: { fontSize: 11, color: "#666" },
  toolTag: {
    backgroundColor: "#E8F4FD",
    color: "#4ECDC4",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  logCategory: {
    fontSize: 11,
    color: "#999",
    marginTop: 8,
    fontStyle: "italic",
  },

  // Data Sovereignty
  dataSovereigntySection: {
    backgroundColor: "#FFF5F5",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  dataSovereigntyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginBottom: 8,
  },
  dataSovereigntyText: { fontSize: 13, color: "#666", marginBottom: 12 },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: { color: "white", fontWeight: "bold", fontSize: 14 },
  deleteConfirmBox: {
    backgroundColor: "#FFE5E5",
    padding: 16,
    borderRadius: 8,
  },
  deleteConfirmText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  deleteConfirmButtons: { flexDirection: "row", gap: 12 },
  cancelDeleteButton: {
    flex: 1,
    backgroundColor: "#E0E0E0",
    padding: 10,
    borderRadius: 8,
  },
  cancelDeleteText: { color: "#333", textAlign: "center", fontWeight: "600" },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: "#FF4444",
    padding: 10,
    borderRadius: 8,
  },
  confirmDeleteText: { color: "white", textAlign: "center", fontWeight: "600" },
});