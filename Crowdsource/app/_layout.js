import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { QoEProvider } from '../src/context/QoEContext';

export default function RootLayout() {
  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        // Check for updates in production builds only
        // In development, Updates.isEnabled will be false
        if (!Updates.isEnabled) {
          console.log('[Updates] Updates are disabled (development mode)');
          return;
        }

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          console.log('[Updates] Update available, downloading...');
          await Updates.fetchUpdateAsync();
          console.log('[Updates] Update downloaded, reloading app...');
          await Updates.reloadAsync();
        } else {
          console.log('[Updates] App is up to date');
        }
      } catch (error) {
        console.error('[Updates] Error checking for updates:', error);
      }
    }

    // Check for updates on app start (only in production)
    onFetchUpdateAsync();
  }, []);

  return (
    <QoEProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QoEProvider>
  );
}


