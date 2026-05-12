import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView, Platform, ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Updated import!

// 🚀 MOVED OUTSIDE: This stops the animation from restarting when you type!
const ChatBubble = ({ message }) => {
  const popIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(popIn, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const isAI = message.sender === 'ai';

  return (
    <Animated.View style={[
      styles.bubbleWrapper, 
      isAI ? styles.aiWrapper : styles.userWrapper,
      { transform: [{ scale: popIn }] }
    ]}>
      {isAI && <Text style={styles.aiAvatar}>🤖</Text>}
      <View style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}>
        <Text style={[styles.bubbleText, isAI ? styles.aiText : styles.userText]}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  
  const [messages, setMessages] = useState([
    { id: '1', text: "Hey there! 👋 I'm your YouthEcho guide. What's happening in your neighborhood today?", sender: 'ai' }
  ]);

  const scrollViewRef = useRef();
  const buttonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(buttonPulse, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const handleSend = () => {
    if (inputText.trim() === '') return;

    const newUserMsg = { id: Date.now().toString(), text: inputText, sender: 'user' };
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');

    setTimeout(() => {
      const aiReply = { 
        id: (Date.now() + 1).toString(), 
        text: "Got it! I'm analyzing that right now. Do you want me to draft a report for the city council, or prep a social media post?", 
        sender: 'ai' 
      };
      setMessages(prev => [...prev, aiReply]);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.flex1} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={{ paddingVertical: 20 }}
          onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
            <TouchableOpacity style={styles.iconButton} onPress={() => console.log('Camera pressed')}>
              <Ionicons name="camera" size={26} color="#FF6B6B" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
            <TouchableOpacity style={styles.iconButton} onPress={() => console.log('Mic pressed')}>
              <Ionicons name="mic" size={26} color="#4ECDC4" />
            </TouchableOpacity>
          </Animated.View>

          <TextInput
            style={styles.textInput}
            placeholder="Type your concern..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F8FF' },
  flex1: { flex: 1 },
  chatArea: { flex: 1, paddingHorizontal: 15 },
  bubbleWrapper: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end', maxWidth: '85%' },
  aiWrapper: { alignSelf: 'flex-start' },
  userWrapper: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  aiAvatar: { fontSize: 28, marginRight: 8 },
  bubble: { padding: 16, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  aiBubble: { backgroundColor: 'white', borderBottomLeftRadius: 5 },
  userBubble: { backgroundColor: '#FF8C00', borderBottomRightRadius: 5 },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  aiText: { color: '#333' },
  userText: { color: 'white' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 15, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#E0E0E0' },
  iconButton: { padding: 10 },
  textInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, fontSize: 16, maxHeight: 100, minHeight: 45, marginHorizontal: 5, color: '#333' },
  sendButton: { backgroundColor: '#32CD32', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 5, elevation: 3 }
});