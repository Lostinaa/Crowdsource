import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { QoEProvider } from '../src/context/QoEContext';
import { DrawerProvider } from '../src/context/DrawerContext';
import Drawer from '../src/components/Drawer';
import { pushNotificationService } from '../src/services/notificationService';

const PUSH_ENABLED_KEY = '@push_notifications_enabled';

export default function RootLayout() {
  useEffect(() => {
    // Initialize push notifications
    async function initNotifications() {
      try {
        const enabled = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
        // Default to true if not set
        if (enabled === 'false') {
          console.log('[App] Push notifications disabled by user');
          return;
        }

        const token = await pushNotificationService.initialize();
        if (token) {
          console.log('[App] Push notifications initialized');
        }
      } catch (error) {
        console.error('[App] Failed to initialize push notifications:', error);
      }
    }

    initNotifications();

    // Cleanup on unmount
    return () => {
      pushNotificationService.cleanup();
    };
  }, []);

  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        // Log update info for debugging
        console.log('[Updates] Update info:', {
          isEnabled: Updates.isEnabled,
          isEmbeddedLaunch: Updates.isEmbeddedLaunch,
          isEmergencyLaunch: Updates.isEmergencyLaunch,
          runtimeVersion: Updates.runtimeVersion,
          channel: Updates.channel,
          updateId: Updates.updateId,
        });

        // Check for updates in production builds only
        if (!Updates.isEnabled) {
          console.log('[Updates] Updates are disabled (development mode)');
          return;
        }

        console.log('[Updates] Checking for updates...');
        const update = await Updates.checkForUpdateAsync();

        console.log('[Updates] Check result:', {
          isAvailable: update.isAvailable,
          manifest: update.manifest ? 'present' : 'missing',
        });

        if (update.isAvailable) {
          console.log('[Updates] Update available, downloading...');
          const fetchResult = await Updates.fetchUpdateAsync();
          console.log('[Updates] Fetch result:', {
            isNew: fetchResult.isNew,
            manifest: fetchResult.manifest ? 'present' : 'missing',
          });

          if (fetchResult.isNew) {
            console.log('[Updates] Update downloaded, reloading app...');
            await Updates.reloadAsync();
          } else {
            console.log('[Updates] Update was already downloaded');
          }
        } else {
          console.log('[Updates] App is up to date - no update available');
        }
      } catch (error) {
        console.error('[Updates] Error checking for updates:', error);
        console.error('[Updates] Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
        });
      }
    }

    // Check for updates on app start (only in production)
    // Delay slightly to let native module finish its check first
    setTimeout(() => {
      onFetchUpdateAsync();
    }, 2000);
  }, []);

  return (
    <QoEProvider>
      <DrawerProvider>
        <Drawer />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </DrawerProvider>
    </QoEProvider>
  );
}
