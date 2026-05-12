import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function InputSelectionScreen({ navigation }) {
  
  const OptionButton = ({ title, icon, onPress, color }) => (
    <TouchableOpacity 
      style={[styles.optionCard, { backgroundColor: color }]} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text style={styles.iconText}>{icon}</Text>
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Choose how you want to report!</Text>

      <View style={styles.buttonContainer}>
        <OptionButton 
          title="Take Picture" 
          icon="📸" 
          color="#FF6B6B" 
          onPress={() => console.log('Picture Clicked')} 
        />
        <OptionButton 
          title="Voice Message" 
          icon="🎙️" 
          color="#4ECDC4" 
          onPress={() => console.log('Voice Clicked')} 
        />
        <OptionButton 
          title="Write Text" 
          icon="✍️" 
          color="#FFE66D" 
          onPress={() => console.log('Text Clicked')} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 3,
  },
  iconText: {
    fontSize: 40,
    marginRight: 20,
  },
  cardText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#444',
  }
});