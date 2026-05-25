import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { IssueContext } from "../types";
import { colors, borderRadius, spacing, fontSize } from "../styles/theme";

const ActionMenu = ({
  issueContext = {},
  onActionSelect,
  onModify,
  onCancel,
  onBack,
}: {
  issueContext?: IssueContext;
  onActionSelect: (action: "social" | "email" | "letter") => void;
  onModify: () => void;
  onCancel: () => void;
  onBack: () => void;
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color="#666" />
        <Text style={styles.backButtonText}>Back to chat</Text>
      </TouchableOpacity>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 AI Understanding</Text>
        <Text style={styles.summaryText}>{issueContext.agentSummary ?? "No summary available"}</Text>
        <TouchableOpacity onPress={onModify}>
          <Text style={styles.modifyLink}>✏️ Edit or refine</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.actionTitle}>What would you like to do?</Text>

      <TouchableOpacity style={styles.actionCard} onPress={() => onActionSelect("social")}>
        <Ionicons name="share-social" size={32} color="#1DA1F2" />
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionCardTitle}>Post on Social Media</Text>
          <Text style={styles.actionCardSubtitle}>Share your concern publicly</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={() => onActionSelect("email")}>
        <Ionicons name="mail" size={32} color="#EA4335" />
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionCardTitle}>Email a City Official</Text>
          <Text style={styles.actionCardSubtitle}>Send directly to KMC</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={() => onActionSelect("letter")}>
        <Ionicons name="document-text" size={32} color="#FF8C00" />
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionCardTitle}>Generate Printable Letter</Text>
          <Text style={styles.actionCardSubtitle}>Copy and submit physically</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Start Over</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.xl },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButtonText: { fontSize: fontSize.base, color: colors.textLight, marginLeft: spacing.xs },
  summaryCard: {
    backgroundColor: colors.accentBlue,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  summaryTitle: { fontSize: fontSize.lg, fontWeight: "bold", marginBottom: spacing.sm },
  summaryText: { fontSize: fontSize.base, color: colors.text, lineHeight: 20 },
  modifyLink: { color: colors.primary, marginTop: spacing.sm, fontSize: fontSize.base, fontWeight: "500" },
  actionTitle: { fontSize: fontSize.xxl, fontWeight: "bold", marginBottom: spacing.lg },
  actionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  actionTextContainer: { flex: 1 },
  actionCardTitle: { fontSize: fontSize.lg, fontWeight: "bold" },
  actionCardSubtitle: { fontSize: fontSize.md, color: colors.textLight, marginTop: 2 },
  cancelButton: { marginTop: spacing.xl, padding: 14, alignItems: "center" },
  cancelText: { color: colors.danger, fontSize: fontSize.lg, fontWeight: "500" },
});

export default ActionMenu;
