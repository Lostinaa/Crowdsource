/**
 * Push Notification Service
 * Handles Expo push notifications registration and handling
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { backendApi } from './backendApi';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

class PushNotificationService {
    constructor() {
        this.expoPushToken = null;
        this.notificationListener = null;
        this.responseListener = null;
    }

    /**
     * Initialize push notifications
     * Call this on app startup
     */
    async initialize() {
        try {
            // Register for push notifications
            const token = await this.registerForPushNotifications();

            if (token) {
                this.expoPushToken = token;
                console.log('[Notifications] Push token:', token);

                // Send token to backend
                await this.registerTokenWithBackend(token);
            }

            // Set up notification listeners
            this.setupListeners();

            return token;
        } catch (error) {
            console.error('[Notifications] Failed to initialize:', error);
            return null;
        }
    }

    /**
     * Register for push notifications and get Expo push token
     */
    async registerForPushNotifications() {
        let token = null;

        // Must be a physical device for push notifications
        if (!Device.isDevice) {
            console.log('[Notifications] Push notifications require a physical device');
            return null;
        }

        // Check existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // Request permission if not granted
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('[Notifications] Permission denied');
            return null;
        }

        // Get Expo push token
        try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: 'ab05d62d-ae57-46ec-8e8a-fd3061115828', // Your EAS project ID
            });
            token = tokenData.data;
        } catch (error) {
            console.error('[Notifications] Failed to get push token:', error);
            return null;
        }

        // Configure Android channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('qoe-alerts', {
                name: 'QoE Alerts',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#8ec63f',
                sound: 'default',
            });
        }

        return token;
    }

    /**
     * Send push token to backend for storage
     */
    async registerTokenWithBackend(token) {
        try {
            const response = await fetch(`${backendApi.baseUrl}/push-tokens`, {
                method: 'POST',
                headers: backendApi.getHeaders(),
                body: JSON.stringify({
                    token: token,
                    platform: Platform.OS,
                    device_name: Device.deviceName || 'Unknown Device',
                }),
            });

            if (response.ok) {
                console.log('[Notifications] Token registered with backend');
                return true;
            } else {
                console.error('[Notifications] Failed to register token:', response.status);
                return false;
            }
        } catch (error) {
            console.error('[Notifications] Failed to register token:', error);
            return false;
        }
    }

    /**
     * Set up notification listeners
     */
    setupListeners() {
        // Handle notifications received while app is in foreground
        this.notificationListener = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log('[Notifications] Received:', notification);
                this.handleNotification(notification);
            }
        );

        // Handle notification taps
        this.responseListener = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                console.log('[Notifications] Tapped:', response);
                this.handleNotificationTap(response);
            }
        );
    }

    /**
     * Handle incoming notification
     */
    handleNotification(notification) {
        const { title, body, data } = notification.request.content;
        console.log('[Notifications] Notification received:', { title, body, data });

        // You can add custom handling here, e.g., update app state
    }

    /**
     * Handle notification tap
     */
    handleNotificationTap(response) {
        const { data } = response.notification.request.content;
        console.log('[Notifications] Notification tapped with data:', data);

        // Navigate based on notification type
        if (data?.type === 'threshold_breach') {
            // Could navigate to dashboard or specific metric screen
            console.log('[Notifications] Threshold breach notification tapped');
        }
    }

    /**
     * Clean up listeners
     */
    cleanup() {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
        }
    }

    /**
     * Send a local notification (for testing)
     */
    async sendLocalNotification(title, body, data = {}) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: 'default',
            },
            trigger: null, // Send immediately
        });
    }

    /**
     * Get current push token
     */
    getToken() {
        return this.expoPushToken;
    }

    /**
     * Unregister push token from backend
     */
    async unregisterToken() {
        if (!this.expoPushToken) return;

        try {
            await fetch(`${backendApi.baseUrl}/push-tokens`, {
                method: 'DELETE',
                headers: backendApi.getHeaders(),
                body: JSON.stringify({ token: this.expoPushToken }),
            });
            console.log('[Notifications] Token unregistered');
        } catch (error) {
            console.error('[Notifications] Failed to unregister token:', error);
        }
    }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export class for testing
export default PushNotificationService;
