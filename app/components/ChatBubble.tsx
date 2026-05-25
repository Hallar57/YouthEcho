import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Message } from "../types";
import { colors } from "../styles/theme";

const ChatBubble = ({ message }: { message: Message }) => {
  const popIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(popIn, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

const styles = StyleSheet.create({
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
  aiBubble: { backgroundColor: colors.white, borderBottomLeftRadius: 5 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  aiText: { color: colors.text },
  userText: { color: colors.white },
  timestamp: { fontSize: 10, color: colors.textMuted, marginTop: 4, alignSelf: "flex-end" },
});

export default ChatBubble;
