import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, borderRadius, spacing, fontSize } from "../styles/theme";

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

  const handleSave = () => {
    const finalText = instruction.trim()
      ? `${editedText}\n\n(Note: ${instruction.trim()})`
      : editedText;
    onSave(finalText);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✏️ Modify Your Report</Text>
      <Text style={styles.label}>Edit the issue summary:</Text>
      <TextInput
        style={styles.textInput}
        multiline
        value={editedText}
        onChangeText={setEditedText}
        placeholder="Describe the issue..."
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>Add a note (optional):</Text>
      <TextInput
        style={styles.instructionInput}
        value={instruction}
        onChangeText={setInstruction}
        placeholder="e.g., 'This has been ongoing for 3 weeks' or 'Affects school commute'"
        placeholderTextColor={colors.textMuted}
      />
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.white },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "bold",
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  label: { fontSize: fontSize.base, fontWeight: "600", marginBottom: spacing.sm, marginTop: spacing.lg },
  textInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: fontSize.base,
  },
  instructionInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 60,
    textAlignVertical: "top",
    fontSize: fontSize.base,
  },
  buttons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xxl },
  backButton: {
    flex: 1,
    backgroundColor: "#E0E0E0",
    padding: 14,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.success,
    padding: 14,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  backButtonText: { color: "#555", fontWeight: "bold", fontSize: fontSize.lg },
  saveButtonText: { color: colors.white, fontWeight: "bold", fontSize: fontSize.lg },
});

export default ModifyOutputScreen;
