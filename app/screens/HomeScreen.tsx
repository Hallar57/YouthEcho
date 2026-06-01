import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { auth, signInAnonymously } from "../../firebaseConfig";
import {
  deleteAllData,
  runAgenticWorkflow,
} from "../../services/aiService";
import type { Message, SystemState } from "../types";
import { colors, borderRadius, spacing, fontSize } from "../styles/theme";
import ChatBubble from "../components/ChatBubble";
import ParentalGate from "../components/ParentalGate";
import ParentDashboard from "../components/ParentDashboard";

let _msgCounter = 0;
const nextId = () => `msg_${Date.now()}_${++_msgCounter}`;

const AGENT_STEPS = ["Classifying...", "Cross-referencing...", "Drafting..."];

const INITIAL_MESSAGE: Message = {
  id: nextId(),
  text: "Hey there! 👋 I'm your YouthEcho guide. Tell me what's happening in your neighborhood — broken roads, garbage issues, or anything you'd like to report!",
  sender: "ai",
  timestamp: new Date(),
};

export default function HomeScreen() {
  const [currentState, setCurrentState] = useState<SystemState>("IDLE");
  const [parentalVerified, setParentalVerified] = useState(false);

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const scrollViewRef = useRef<ScrollView>(null);
  const buttonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const initFirebase = async () => {
      try {
        await signInAnonymously(auth);
        console.log("✅ Firebase loaded!");
      } catch (error) {
        console.error("❌ Firebase error:", error instanceof Error ? error.message : String(error));
      }
    };
    initFirebase();
  }, []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(buttonPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    if (!isAnalyzing) {
      setActiveStep(-1);
      return;
    }
    setActiveStep(0);
    const t1 = setTimeout(() => setActiveStep(1), 1500);
    const t2 = setTimeout(() => setActiveStep(2), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isAnalyzing]);

  const addMessage = (text: string, sender: "user" | "ai") => {
    const newMessage: Message = {
      id: nextId(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Camera access is required to take photos of issues.");
      return false;
    }
    return true;
  };

  const requestMicrophonePermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Microphone access is required for voice reports.");
      return false;
    }
    return true;
  };

  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text || isSending || isAnalyzing) return;
    setIsSending(true);

    const userMessage = text;
    addMessage(userMessage, "user");
    setInputText("");
    setCurrentState("ANALYZING");
    addMessage("⏳ Processing...", "ai");

    try {
      const agentResult = await runAgenticWorkflow(userMessage);

      setMessages((prev) => prev.slice(0, -1));

      if (agentResult.decision === "BLOCK") {
        addMessage(agentResult.friendlyResponse, "ai");
        setCurrentState("IDLE");
        setIsSending(false);
        return;
      }

      addMessage(agentResult.friendlyResponse, "ai");
      setCurrentState("IDLE");
    } catch (error) {
      setMessages((prev) => prev.slice(0, -1));
      addMessage("⚠️ AI failed to respond. Please try again.", "ai");
      console.error("AI workflow error:", error);
      setCurrentState("IDLE");
    }
    setIsSending(false);
  };

  const handleCameraCapture = async () => {
    if (isSending || isAnalyzing) return;
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
      setCurrentState("ANALYZING");
      setIsAnalyzing(true);

      try {
        const imageBase64 = result.assets[0].base64 ?? "";

        const agentResult = await runAgenticWorkflow(
          "What's in this image? Describe any civic issues you see.",
          { imageBase64 },
        );

        addMessage(agentResult.friendlyResponse, "ai");
        setIsAnalyzing(false);
        setCurrentState("IDLE");
      } catch (error) {
        setIsAnalyzing(false);
        console.error("Image analysis error:", error);
        addMessage("📸 I received your photo but couldn't analyze it. Please describe what you see!", "ai");
        setCurrentState("IDLE");
      }
    }
  };

  const startRecording = async () => {
    if (isSending || isAnalyzing) return;
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
    } catch (error) {
      console.error("Recording start error:", error);
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
      setCurrentState("IDLE");
      return;
    }

    addMessage("🎙️ [Voice recording submitted]", "user");
    setCurrentState("ANALYZING");
    setIsAnalyzing(true);

    try {
      const audioBase64 = await readAsStringAsync(uri, {
        encoding: EncodingType.Base64,
      });

      const agentResult = await runAgenticWorkflow("", {
        audioBase64,
      });

      addMessage(agentResult.friendlyResponse, "ai");
      setIsAnalyzing(false);
      setCurrentState("IDLE");
    } catch (error) {
      setIsAnalyzing(false);
      console.error("Voice transcription error:", error);
      addMessage("🎙️ I received your voice message but couldn't process it. Please try typing instead!", "ai");
      setCurrentState("IDLE");
    }
  };

  const resetConversation = () => {
    setCurrentState("IDLE");
    setMessages([{ ...INITIAL_MESSAGE, id: nextId(), timestamp: new Date() }]);
  };

  const handleDeleteAllData = async () => {
    await deleteAllData();
    setMessages([{
      id: nextId(),
      text: "Hey there! 👋 All previous data has been cleared. What's happening in your neighborhood?",
      sender: "ai",
      timestamp: new Date(),
    }]);
    setCurrentState("IDLE");
    setShowParentDashboard(false);
    Alert.alert("Data Deleted", "All activity history and AI session data has been permanently removed.");
  };

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

      {isAnalyzing && (
        <View style={styles.analyzingIndicator}>
          {activeStep >= 0 && (
            <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
              {AGENT_STEPS.map((step, i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  {i < activeStep ? (
                    <Ionicons name="checkmark-circle" size={14} color="#bbb" />
                  ) : i === activeStep ? (
                    <ActivityIndicator size={12} color="#888" />
                  ) : null}
                  <Text
                    style={{
                      color: i <= activeStep ? "#888" : "#ddd",
                      fontSize: fontSize.sm,
                    }}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
            <Ionicons name="mic" size={24} color="#FF4444" />
          </Animated.View>
          <Text style={styles.recordingIndicatorText}>Recording… Release to send</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.inputButton} onPress={handleCameraCapture}>
          <Ionicons name="camera" size={26} color="#FF6B6B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.inputButton, isRecording && styles.inputButtonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
        >
          <Ionicons name="mic" size={26} color={isRecording ? "#FF4444" : "#4ECDC4"} />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Type your concern..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          editable={!isRecording && !isSending && !isAnalyzing}
          blurOnSubmit={false}
          onSubmitEditing={handleSendText}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending || isAnalyzing) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendText}
          disabled={!inputText.trim() || isSending || isAnalyzing}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>YouthEcho</Text>
          <Text style={styles.headerSubtitle}>Your Voice. Heard. Amplified.</Text>
        </View>
        <View style={styles.headerRight}>
          {currentState !== "IDLE" && (
            <TouchableOpacity onPress={resetConversation} style={styles.headerButton}>
              <Ionicons name="refresh" size={20} color="#FF8C00" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowParentDashboard(true)}
            style={styles.headerButton}
          >
            <Ionicons name="shield-checkmark" size={22} color={colors.secondary} />
          </TouchableOpacity>
        </View>
      </View>

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

      {!parentalVerified ? (
        <ParentalGate onVerified={() => setParentalVerified(true)} />
      ) : (
        renderChat()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: fontSize.title, fontWeight: "bold", color: colors.primary },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginLeft: spacing.sm },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: "row", gap: spacing.sm },
  headerButton: { padding: spacing.sm },

  chatArea: { flex: 1, paddingHorizontal: 15 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    paddingBottom: Platform.OS === "ios" ? 25 : 15,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  inputButton: {
    padding: 10,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.inputBg,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  inputButtonActive: { backgroundColor: colors.accentRed },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: fontSize.lg,
    maxHeight: 100,
    minHeight: 45,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.success,
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  sendButtonDisabled: { backgroundColor: "#A8E6A8", elevation: 0 },

  analyzingIndicator: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#F0F0F0",
    borderRadius: borderRadius.round,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    zIndex: 1000,
  },

  recordingIndicator: {
    position: "absolute",
    bottom: 160,
    left: 20,
    right: 20,
    backgroundColor: colors.accentRed,
    borderRadius: borderRadius.round,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    zIndex: 1000,
  },
  recordingIndicatorText: { color: colors.error, fontWeight: "bold", fontSize: fontSize.base },

  dashboardModalContainer: { flex: 1, backgroundColor: colors.background },
});
