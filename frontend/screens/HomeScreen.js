import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logoText}>📣</Text>
        <Text style={styles.title}>Welcome to YouthEcho!</Text>
        <Text style={styles.subtitle}>Let your voice be heard in your city.</Text>
      </View>

      <TouchableOpacity 
        style={styles.submitButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('InputSelection')}
      >
        <Text style={styles.buttonText}>Submit a Report 🚀</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  submitButton: {
    backgroundColor: '#32CD32',
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  }
});