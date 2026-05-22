import { useState, useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius, spacing, fontSize } from "../styles/theme";

const privacyItems = [
  {
    id: "voice",
    icon: "🎙️",
    title: "Voice Data",
    body: "Audio recordings are converted to text and permanently deleted immediately after. We never store raw audio.",
  },
  {
    id: "photos",
    icon: "📸",
    title: "Photos",
    body: "Images are analyzed to identify civic issues and are not retained on our servers after processing.",
  },
  {
    id: "anonymity",
    icon: "🎭",
    title: "Anonymity",
    body: "All reports are submitted anonymously. We do not collect names, contact details, or device identifiers.",
  },
  {
    id: "ai",
    icon: "🤖",
    title: "AI Assistance",
    body: "Your child interacts with an AI assistant. No human operators read conversations in real time.",
  },
  {
    id: "rights",
    icon: "🔐",
    title: "Your Rights",
    body: "A parent or guardian may request deletion of all session data at any time via the Settings panel in the app.",
  },
];

const ParentalGate = ({ onVerified }: { onVerified: () => void }) => {
  const [step, setStep] = useState<"math" | "privacy">("math");
  const [answer, setAnswer] = useState("");
  const [num1] = useState(() => Math.floor(Math.random() * 50) + 10);
  const [num2] = useState(() => Math.floor(Math.random() * 50) + 10);
  const [accepted, setAccepted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleMathSubmit = () => {
    const parsed = parseInt(answer, 10);
    if (isNaN(parsed)) {
      Alert.alert("Oops!", "Please enter a number.");
      return;
    }
    if (parsed === num1 + num2) {
      setAnswer("");
      setStep("privacy");
    } else {
      Alert.alert("Try Again", "That's not quite right. Give it another go!");
      setAnswer("");
    }
  };

  if (step === "math") {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.emoji}>🏘️</Text>
          <Text style={styles.title}>Welcome to YouthEcho!</Text>
          <Text style={styles.subtitle}>A quick check before we get started</Text>

          <View style={styles.mathBox}>
            <Text style={styles.mathLabel}>Parent or guardian — please solve:</Text>
            <Text style={styles.mathQuestion}>{num1} + {num2} = ?</Text>
            <TextInput
              style={styles.mathInput}
              keyboardType="number-pad"
              value={answer}
              onChangeText={setAnswer}
              placeholder="Your answer"
              placeholderTextColor="#BBB"
              returnKeyType="done"
              onSubmitEditing={handleMathSubmit}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleMathSubmit}>
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>

          <Text style={styles.privacyNote}>
            This step confirms a parent or guardian is present, as required by child safety regulations.
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Privacy & Safety Disclosure</Text>
        <Text style={styles.subtitle}>Please review how YouthEcho handles your child&apos;s data</Text>

        <View style={styles.privacyList}>
          {privacyItems.map((item) => (
            <View key={item.id} style={styles.privacyItem}>
              <Text style={styles.privacyItemIcon}>{item.icon}</Text>
              <View style={styles.privacyItemText}>
                <Text style={styles.privacyItemTitle}>{item.title}</Text>
                <Text style={styles.privacyItemBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAccepted(!accepted)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Ionicons name="checkmark" size={14} color="white" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to these privacy practices on behalf of my child.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.consentButton, !accepted && styles.disabledButton]}
          onPress={accepted ? onVerified : undefined}
          disabled={!accepted}
        >
          <Text style={styles.buttonText}>Enter YouthEcho ✨</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: spacing.xxl,
    width: "100%",
    maxWidth: 420,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  emoji: { fontSize: fontSize.emoji, textAlign: "center", marginBottom: spacing.md },
  title: {
    fontSize: fontSize.title,
    fontWeight: "bold",
    textAlign: "center",
    color: colors.darkText,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: "#888",
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  mathBox: {
    backgroundColor: colors.accentOrange,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  mathLabel: {
    fontSize: fontSize.md,
    color: "#888",
    marginBottom: 10,
    textAlign: "center",
  },
  mathQuestion: {
    fontSize: fontSize.hero,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  mathInput: {
    borderWidth: 1.5,
    borderColor: "#FFB74D",
    borderRadius: borderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    fontSize: fontSize.xl,
    textAlign: "center",
    width: "60%",
    color: colors.text,
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.white, fontWeight: "bold", fontSize: fontSize.lg },
  consentButton: { backgroundColor: colors.secondary, marginTop: spacing.lg },
  disabledButton: { opacity: 0.4 },
  privacyNote: {
    fontSize: fontSize.sm,
    color: "#AAA",
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 17,
  },
  privacyList: { marginVertical: spacing.lg },
  privacyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: spacing.md,
  },
  privacyItemIcon: { fontSize: 22, marginTop: 1 },
  privacyItemText: { flex: 1 },
  privacyItemTitle: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.darkText,
    marginBottom: 2,
  },
  privacyItemBody: { fontSize: fontSize.md, color: colors.textLight, lineHeight: 19 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  checkboxLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: "#444",
    lineHeight: 19,
  },
});

export default ParentalGate;
