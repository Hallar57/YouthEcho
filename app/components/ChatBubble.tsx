import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import type { Message } from "../types";
import { colors } from "../styles/theme";

const formatTime = (millis: number) => {
  const total = Math.floor(millis / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const ChatBubble = ({ message }: { message: Message }) => {
  const popIn = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    Animated.spring(popIn, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const audioUri = message.audioUri;
    if (audioUri) {
      const loadSound = async () => {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false },
          (status) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              setPosition(status.positionMillis);
              if (status.durationMillis) setDuration(status.durationMillis);
              if (status.didJustFinish) {
                setIsPlaying(false);
                sound.setPositionAsync(0);
              }
            }
          }
        );
        soundRef.current = sound;
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setDuration(status.durationMillis);
        }
      };
      loadSound();
    }
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, [message.audioUri]);

  const togglePlayback = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      await soundRef.current.playAsync();
    }
  };

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
        {message.imageUri ? (
          <View>
            <Image source={{ uri: message.imageUri }} style={styles.chatImage} />
            {message.text ? (
              <Text style={[styles.bubbleText, { marginTop: 8 }, isAI ? styles.aiText : styles.userText]}>
                {message.text}
              </Text>
            ) : null}
          </View>
        ) : message.audioUri ? (
          <View style={styles.audioRow}>
            <TouchableOpacity style={styles.playBtn} onPress={togglePlayback}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={18}
                color={isAI ? colors.primary : colors.white}
              />
            </TouchableOpacity>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: duration > 0 ? `${(position / duration) * 100}%` : "0%",
                    backgroundColor: isAI ? colors.primary : colors.white,
                  },
                ]}
              />
            </View>
            <Text style={[styles.audioTime, isAI ? styles.aiText : styles.userText]}>
              {formatTime(position)}/{formatTime(duration)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.bubbleText, isAI ? styles.aiText : styles.userText]}>
            {message.text}
          </Text>
        )}
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
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 180,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  audioTime: {
    fontSize: 11,
    minWidth: 48,
    textAlign: "right",
  },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },
});

export default ChatBubble;
