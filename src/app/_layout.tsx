import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: '#F8F5ED' }}>
    <StatusBar style="dark" /><Slot />
  </SafeAreaView></SafeAreaProvider>;
}
