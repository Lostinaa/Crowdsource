import { Stack } from 'expo-router';
import { QoEProvider } from '../src/context/QoEContext';

export default function RootLayout() {
  return (
    <QoEProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QoEProvider>
  );
}


