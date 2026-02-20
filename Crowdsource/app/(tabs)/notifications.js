import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { theme } from '../../src/constants/theme';
import ScreenHeader from '../../src/components/ScreenHeader';
import { pushNotificationService } from '../../src/services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQoE } from '../../src/context/QoEContext';

const PUSH_KEY = '@push_notifications_enabled';

export default function NotificationsScreen() {
    const { scores } = useQoE();
    const [pushEnabled, setPushEnabled] = useState(false);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                const push = await AsyncStorage.getItem(PUSH_KEY);
                setPushEnabled(push === 'true');

                // Load stored notifications
                const stored = await AsyncStorage.getItem('@notifications');
                if (stored) setNotifications(JSON.parse(stored));
            } catch (e) {
                console.warn('[Notifications] load error:', e);
            }
        };
        load();
    }, []);

    // Add a system alert if overall score is poor
    useEffect(() => {
        const overall = scores?.overall?.score;
        if (overall !== null && overall !== undefined && overall < 0.5) {
            const newNotification = {
                id: Date.now().toString(),
                title: 'QoE Alert',
                body: `Overall QoE score is low: ${(overall * 100).toFixed(0)}%. Please check your network.`,
                timestamp: Date.now(),
                type: 'warning',
            };
            setNotifications(prev => {
                const updated = [newNotification, ...prev].slice(0, 50);
                AsyncStorage.setItem('@notifications', JSON.stringify(updated)).catch(() => { });
                return updated;
            });
        }
    }, [scores?.overall?.score]);

    const clearAll = async () => {
        setNotifications([]);
        await AsyncStorage.removeItem('@notifications');
    };

    const togglePush = async (val) => {
        try {
            if (val) {
                const token = await pushNotificationService.initialize();
                if (token) {
                    setPushEnabled(true);
                    await AsyncStorage.setItem(PUSH_KEY, 'true');
                }
            } else {
                await pushNotificationService.unregisterToken();
                setPushEnabled(false);
                await AsyncStorage.setItem(PUSH_KEY, 'false');
            }
        } catch (e) {
            console.warn('[Notifications] toggle error:', e);
        }
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleString();
    };

    const renderItem = ({ item }) => (
        <View style={[styles.card, item.type === 'warning' && styles.cardWarning]}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
            </View>
            <Text style={styles.cardBody}>{item.body}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader title="Notifications" />

            {/* Push Toggle */}
            <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Push Notifications</Text>
                <TouchableOpacity
                    style={[styles.toggleBtn, pushEnabled && styles.toggleBtnActive]}
                    onPress={() => togglePush(!pushEnabled)}
                >
                    <Text style={styles.toggleBtnText}>{pushEnabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
            </View>

            {/* Notification List */}
            {notifications.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>🔔</Text>
                    <Text style={styles.emptyText}>No notifications yet</Text>
                    <Text style={styles.emptySubText}>
                        Alerts about poor QoE scores and sync events will appear here.
                    </Text>
                </View>
            ) : (
                <>
                    <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
                        <Text style={styles.clearBtnText}>Clear All</Text>
                    </TouchableOpacity>
                    <FlatList
                        data={notifications}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background.card,
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border.light,
        ...theme.shadows.sm,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    toggleBtn: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.border.medium,
    },
    toggleBtnActive: {
        backgroundColor: theme.colors.primary,
    },
    toggleBtnText: {
        color: theme.colors.white,
        fontWeight: '700',
        fontSize: 13,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    emptySubText: {
        fontSize: 13,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        lineHeight: 18,
    },
    clearBtn: {
        alignSelf: 'flex-end',
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
    },
    clearBtnText: {
        color: theme.colors.danger,
        fontWeight: '600',
        fontSize: 13,
    },
    list: {
        padding: theme.spacing.md,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border.light,
        ...theme.shadows.sm,
    },
    cardWarning: {
        borderColor: theme.colors.warning,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xs,
    },
    cardTitle: {
        fontWeight: '700',
        color: theme.colors.text.primary,
        fontSize: 14,
    },
    cardTime: {
        color: theme.colors.text.light,
        fontSize: 11,
    },
    cardBody: {
        color: theme.colors.text.secondary,
        fontSize: 13,
        lineHeight: 18,
    },
});
