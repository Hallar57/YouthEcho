import { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AILogEntry } from "../types";
import { colors, borderRadius, spacing, fontSize } from "../styles/theme";
import { getAIInteractionLog } from "../../services/aiService";

const ParentDashboard = ({
  onClose,
  onDeleteAllData,
}: {
  onClose: () => void;
  onDeleteAllData: () => void;
}) => {
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLogs = async () => {
      setLoading(true);
      const allLogs = await getAIInteractionLog();
      if (mounted) {
        setLogs(allLogs);
        setLoading(false);
      }
    };
    fetchLogs();
    return () => { mounted = false; };
  }, []);

  const handleDelete = async () => {
    await onDeleteAllData();
    setShowDeleteConfirm(false);
    setLogs([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👨‍👩‍👧 Activity Overview</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          📊 <Text style={styles.bold}>Transparency Log:</Text> All AI
          interactions are listed below for your review.
        </Text>
        <Text style={styles.infoText}>
          🤖 <Text style={styles.bold}>AI Disclosure:</Text> Your child is
          conversing with an automated AI assistant, not a human operator.
        </Text>
      </View>

      <ScrollView style={styles.logList}>
        {loading ? (
          <Text style={styles.noLogs}>Loading activity log…</Text>
        ) : logs.length === 0 ? (
          <Text style={styles.noLogs}>No activity yet. Start a conversation!</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logType}>
                  {log.type === "text" ? "💬" : log.type === "image" ? "📸" : "🎙️"}{" "}
                  {log.type.toUpperCase()}
                </Text>
                <Text style={styles.logTime}>{log.timestamp.toLocaleString()}</Text>
              </View>
              <Text style={styles.logLabel}>Child&apos;s input:</Text>
              <Text style={styles.logInput}>{log.userInput}</Text>
              <Text style={styles.logLabel}>AI response:</Text>
              <Text style={styles.logResponse}>{log.aiResponse.substring(0, 150)}...</Text>
              <View style={styles.logTools}>
                <Text style={styles.logToolsLabel}>Tools used: </Text>
                {log.toolsUsed.map((tool, idx) => (
                  <Text key={`${log.id}-${idx}`} style={styles.toolTag}>{tool}</Text>
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

      <View style={styles.dataSovereignty}>
        <Text style={styles.dataSovereigntyTitle}>🔒 Data Management</Text>
        <Text style={styles.dataSovereigntyText}>
          Permanently delete all session data, AI conversation history, and stored activity logs.
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
            <Text style={styles.deleteConfirmText}>
              This action cannot be undone. Are you sure?
            </Text>
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={handleDelete}
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingTop: 40,
  },
  title: { fontSize: fontSize.heading, fontWeight: "bold", color: colors.text },
  info: {
    backgroundColor: colors.accentBlue,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  infoText: { fontSize: fontSize.base, color: colors.text, marginBottom: spacing.sm },
  bold: { fontWeight: "bold" },
  logList: { flex: 1 },
  noLogs: { textAlign: "center", color: colors.textMuted, fontSize: fontSize.lg, marginTop: 40 },
  logCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    elevation: 2,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  logType: { fontSize: fontSize.sm, fontWeight: "bold", color: colors.primary },
  logTime: { fontSize: 11, color: colors.textMuted },
  logLabel: { fontSize: fontSize.sm, color: colors.textLight, marginTop: spacing.sm },
  logInput: {
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.inputBg,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  logResponse: { fontSize: fontSize.md, color: "#555", marginTop: spacing.xs },
  logTools: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm, gap: spacing.xs },
  logToolsLabel: { fontSize: 11, color: colors.textLight },
  toolTag: {
    backgroundColor: colors.accentBlue,
    color: colors.secondary,
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  logCategory: { fontSize: 11, color: colors.textMuted, marginTop: spacing.sm, fontStyle: "italic" },
  dataSovereignty: {
    backgroundColor: "#FFF5F5",
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  dataSovereigntyTitle: {
    fontSize: fontSize.lg,
    fontWeight: "bold",
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  dataSovereigntyText: { fontSize: fontSize.md, color: colors.textLight, marginBottom: spacing.md },
  deleteButton: {
    backgroundColor: colors.danger,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: "center",
  },
  deleteButtonText: { color: colors.white, fontWeight: "bold", fontSize: fontSize.base },
  deleteConfirmBox: { backgroundColor: colors.accentRedBg, padding: spacing.lg, borderRadius: borderRadius.sm },
  deleteConfirmText: {
    fontSize: fontSize.base,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  deleteConfirmButtons: { flexDirection: "row", gap: spacing.md },
  cancelDeleteButton: {
    flex: 1,
    backgroundColor: "#E0E0E0",
    padding: 10,
    borderRadius: borderRadius.sm,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: colors.error,
    padding: 10,
    borderRadius: borderRadius.sm,
  },
  cancelDeleteText: { color: colors.text, textAlign: "center", fontWeight: "600" },
  confirmDeleteText: { color: colors.white, textAlign: "center", fontWeight: "600" },
});

export default ParentDashboard;
