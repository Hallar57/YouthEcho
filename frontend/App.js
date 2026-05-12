import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import InputSelectionScreen from './screens/InputSelectionScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#FF8C00' }, // Kid-friendly warm orange
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'YouthEcho' }} 
        />
        <Stack.Screen 
          name="InputSelection" 
          component={InputSelectionScreen} 
          options={{ title: 'How can we help?' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}