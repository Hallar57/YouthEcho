import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
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
  const [isLockedRecording, setIsLockedRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const buttonPulse = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").width)).current;
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recordingIdRef = useRef(0);
  const isStoppingRef = useRef(false);
  const isLockedRef = useRef(false);
  const startRecRef = useRef<() => void>(() => {});
  const sendRecRef = useRef<() => void>(() => {});
  const cancelRecRef = useRef<() => void>(() => {});
  const cancelProgress = useRef(new Animated.Value(0)).current;
  const lockScale = useRef(new Animated.Value(1)).current;
  const boxScale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        isLockedRef.current = false;
        startRecRef.current();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy < -60 && !isLockedRef.current) {
          isLockedRef.current = true;
          setIsLockedRecording(true);
        }
        if (gs.dx < -120) {
          isLockedRef.current = true;
          cancelProgress.setValue(0);
          cancelRecRef.current();
        } else if (gs.dx < 0) {
          cancelProgress.setValue(Math.min(Math.abs(gs.dx) / 120, 1));
        }
      },
      onPanResponderRelease: () => {
        cancelProgress.setValue(0);
        if (isLockedRef.current) {
          isLockedRef.current = false;
          cancelRecRef.current();
        } else {
          sendRecRef.current();
        }
      },
      onPanResponderTerminate: () => {
        cancelProgress.setValue(0);
        if (!isLockedRef.current) {
          cancelRecRef.current();
        }
        isLockedRef.current = false;
      },
    })
  ).current;

  useEffect(() => {
    if (showParentDashboard) {
      setDashboardVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get("window").width,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setDashboardVisible(false));
    }
  }, [showParentDashboard, slideAnim]);

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

  const prevLockedRef = useRef(false);
  useEffect(() => {
    if (isLockedRecording !== prevLockedRef.current) {
      prevLockedRef.current = isLockedRecording;
      if (isLockedRecording) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      lockScale.setValue(1.4);
      Animated.spring(lockScale, {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isLockedRecording, lockScale]);

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
      const asset = result.assets[0];
      const imageMessage: Message = {
        id: nextId(),
        text: "",
        sender: "user",
        timestamp: new Date(),
        imageUri: asset.uri,
      };
      setMessages((prev) => [...prev, imageMessage]);
      setCurrentState("ANALYZING");
      setIsAnalyzing(true);

      try {
        const imageBase64 = asset.base64 ?? "";

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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleRecordingStart = async () => {
    if (isSending || isAnalyzing || isStoppingRef.current) return;

    const myId = ++recordingIdRef.current;

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission || myId !== recordingIdRef.current) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      if (myId !== recordingIdRef.current) {
        try {
          await recording.stopAndUnloadAsync();
        } catch {
          // superceded by a newer recording
        }
        return;
      }

      setRecording(recording);
      setIsRecording(true);
      setIsLockedRecording(false);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      boxScale.setValue(0.9);
      Animated.spring(boxScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Recording start error:", error);
      Alert.alert("Failed to record", "Please try again");
    }
  };

  const handleRecordingSend = async () => {
    isStoppingRef.current = true;
    recordingIdRef.current++;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (!recording) {
      isStoppingRef.current = false;
      return;
    }

    setIsRecording(false);
    setIsLockedRecording(false);
    setRecordingDuration(0);
    let uri: string | null = null;
    try {
      uri = recording.getURI();
      await recording.stopAndUnloadAsync();
    } catch {
      // recorder already cleaned up
    }
    setRecording(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!uri) {
      addMessage("🎙️ Failed to save recording. Please try again.", "ai");
      setCurrentState("IDLE");
      isStoppingRef.current = false;
      return;
    }

    const audioMessage: Message = {
      id: nextId(),
      text: "",
      sender: "user",
      timestamp: new Date(),
      audioUri: uri,
    };
    setMessages((prev) => [...prev, audioMessage]);
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
    isStoppingRef.current = false;
  };

  const handleCancelRecording = async () => {
    isStoppingRef.current = true;
    recordingIdRef.current++;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (!recording) {
      isStoppingRef.current = false;
      return;
    }

    setIsRecording(false);
    setIsLockedRecording(false);
    setRecordingDuration(0);
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // recorder already cleaned up
    }
    setRecording(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    isStoppingRef.current = false;
  };

  const handleSendAudio = async () => {
    if (!recording || isSending) return;
    setIsSending(true);
    isStoppingRef.current = true;
    recordingIdRef.current++;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setIsLockedRecording(false);
    setRecordingDuration(0);
    let uri: string | null = null;
    try {
      uri = recording.getURI();
      await recording.stopAndUnloadAsync();
    } catch {
      // recorder already cleaned up
    }
    setRecording(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!uri) {
      addMessage("🎙️ Failed to save recording. Please try again.", "ai");
      setCurrentState("IDLE");
      setIsSending(false);
      isStoppingRef.current = false;
      return;
    }

    const audioMessage: Message = {
      id: nextId(),
      text: "",
      sender: "user",
      timestamp: new Date(),
      audioUri: uri,
    };
    setMessages((prev) => [...prev, audioMessage]);
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
    isStoppingRef.current = false;
    setIsSending(false);
  };

  // Sync refs with latest handler functions
  startRecRef.current = handleRecordingStart;
  sendRecRef.current = handleRecordingSend;
  cancelRecRef.current = handleCancelRecording;

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
  );

  return (
    <View style={styles.container}>
      {parentalVerified && (
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
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
      )}

      {!parentalVerified ? (
        <ParentalGate onVerified={() => setParentalVerified(true)} />
      ) : (
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            {renderChat()}
          </KeyboardAvoidingView>
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
          <View>
            {isRecording && (
              <Animated.View style={[styles.lockIconAbove, { transform: [{ scale: lockScale }] }]}>
                <Text style={styles.lockIcon}>{isLockedRecording ? "🔒" : "🔓"}</Text>
                <Text style={styles.lockArrow}>↑</Text>
              </Animated.View>
            )}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + spacing.sm }]}>
              <TouchableOpacity
                style={styles.inputButton}
                onPress={handleCameraCapture}
                disabled={isRecording}
              >
                <Ionicons name="camera" size={26} color={isRecording ? "#ccc" : "#FF6B6B"} />
              </TouchableOpacity>

              {isRecording ? (
                <Animated.View
                  style={[
                    styles.recordingBox,
                    {
                      transform: [{ scale: boxScale }],
                      borderColor: cancelProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [colors.error, "#FF0000"],
                      }),
                    },
                  ]}
                >
                  <View style={styles.recordingBoxLeft}>
                    <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
                      <View style={styles.recordingDot} />
                    </Animated.View>
                    <Text style={styles.recordingText} numberOfLines={1}>
                      {formatDuration(recordingDuration)}
                    </Text>
                  </View>
                  {!isLockedRecording && (
                    <View style={styles.recordingBoxRight}>
                      <Ionicons name="arrow-back" size={14} color={colors.textMuted} />
                      <Text style={styles.slideToCancelText}> slide to cancel</Text>
                    </View>
                  )}
                  <Animated.View
                    style={[styles.cancelOverlay, { opacity: cancelProgress }]}
                    pointerEvents="none"
                  >
                    <Ionicons name="close-circle" size={16} color="#FF0000" />
                    <Text style={styles.cancelOverlayText}>Release to cancel</Text>
                  </Animated.View>
                </Animated.View>
              ) : (
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
              )}

              <View style={styles.voiceButtonArea}>
                {isRecording && isLockedRecording ? (
                  <View style={styles.lockedButtonsRow}>
                    <TouchableOpacity style={styles.smallIconBtn} onPress={handleCancelRecording}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.smallSendBtn} onPress={handleSendAudio} disabled={isSending}>
                      <Ionicons name="send" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                ) : isRecording ? (
                  <View style={[styles.voiceButton, styles.voiceButtonActive]} {...panResponder.panHandlers}>
                    <Ionicons name="mic" size={26} color="#FF4444" />
                  </View>
                ) : inputText.trim() ? (
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
                ) : (
                  <View style={styles.voiceButton} {...panResponder.panHandlers}>
                    <Ionicons name="mic" size={26} color="#4ECDC4" />
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {dashboardVisible && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <SafeAreaView style={styles.dashboardModalContainer}>
            <ParentDashboard
              onClose={() => setShowParentDashboard(false)}
              onDeleteAllData={handleDeleteAllData}
            />
    </SafeAreaView>
        </Animated.View>
      )}
    </View>
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
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  inputButton: {
    padding: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.inputBg,
    width: 40,
    height: 40,
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
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  sendButtonDisabled: { backgroundColor: "#A8E6A8", elevation: 0 },

  analyzingIndicator: {
    backgroundColor: "#F0F0F0",
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },

  recordingBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentRed,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    height: 45,
    borderWidth: 1,
    borderColor: colors.error,
  },
  recordingBoxLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  recordingText: {
    color: colors.error,
    fontWeight: "bold",
    fontSize: fontSize.base,
  },
  recordingBoxRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  slideToCancelText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  cancelOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.round,
    backgroundColor: "#FFE5E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  cancelOverlayText: {
    color: "#FF0000",
    fontWeight: "bold",
    fontSize: fontSize.sm,
  },
  voiceButtonArea: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceButtonActive: {
    backgroundColor: colors.accentRed,
  },
  lockIcon: {
    fontSize: 18,
  },
  lockArrow: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 12,
  },
  lockIconAbove: {
    position: "absolute",
    bottom: "100%",
    right: 18,
    alignItems: "center",
    paddingBottom: 4,
    zIndex: 10,
  },
  lockedButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  smallIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  smallSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
  },

  dashboardModalContainer: { flex: 1, backgroundColor: colors.background },
});
