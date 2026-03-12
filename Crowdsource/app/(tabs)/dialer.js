import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Linking,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/constants/theme';
import { setCallInitiatedAt } from '../../src/utils/callState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DIALPAD_BTN_SIZE = (SCREEN_WIDTH - 120) / 3;

// ── Dialpad button definitions ──
const KEYPAD = [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { digit: '*', letters: '' },
    { digit: '0', letters: '+' },
    { digit: '#', letters: '' },
];

const callTypeInfo = {
    INCOMING: { icon: 'call-outline', color: theme.colors.success, rotation: '135deg' },
    OUTGOING: { icon: 'call-outline', color: theme.colors.primary, rotation: '0deg' },
    MISSED: { icon: 'call-outline', color: theme.colors.danger, rotation: '135deg' },
    REJECTED: { icon: 'call-outline', color: theme.colors.danger, rotation: '135deg' },
    BLOCKED: { icon: 'close-circle-outline', color: theme.colors.danger, rotation: '0deg' },
};

const AVATAR_COLORS = [
    '#4CAF50', '#2196F3', '#FF5722', '#9C27B0', '#FF9800',
    '#00BCD4', '#E91E63', '#3F51B5', '#8BC34A', '#FFC107',
];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
}

function formatTimestamp(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) {
        const h = date.getHours();
        const m = date.getMinutes();
        return `${h > 12 ? h - 12 : h}:${m < 10 ? '0' + m : m} ${h >= 12 ? 'PM' : 'AM'}`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

async function makeCall(number) {
    if (!number) return;
    const cleanNumber = number.replace(/[^0-9+*#]/g, '');
    if (!cleanNumber) return;

    // Record initiation timestamp for setup time calculation in voice.tsx
    setCallInitiatedAt(Date.now());

    if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        // Request CALL_PHONE permission if needed
        let hasCallPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE
        );
        if (!hasCallPermission) {
            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CALL_PHONE
            );
            hasCallPermission = result === PermissionsAndroid.RESULTS.GRANTED;
        }

        if (hasCallPermission) {
            try {
                const { requireNativeModule } = require('expo-modules-core');
                const mod = requireNativeModule('CallDisconnectModule');
                if (mod && mod.placeCall) {
                    const ok = await mod.placeCall(cleanNumber);
                    if (ok) return;
                }
            } catch (e) {
                console.log('[Dialer] placeCall failed:', e);
            }
        }
    }
    // Final fallback
    Linking.openURL(`tel:${cleanNumber}`);
}

// ── Call Log Item ──
function CallLogItem({ call }) {
    const typeInfo = callTypeInfo[call.type] || callTypeInfo.OUTGOING;
    const avatarColor = getAvatarColor(call.name || call.number);
    const initials = getInitials(call.name || call.number);
    const isMissed = call.type === 'MISSED' || call.type === 'REJECTED';

    return (
        <TouchableOpacity style={styles.callItem} onPress={() => makeCall(call.number)} activeOpacity={0.7}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.callInfo}>
                <Text style={[styles.callName, isMissed && styles.missedText]} numberOfLines={1}>
                    {call.name || call.number}
                </Text>
                <View style={styles.callMeta}>
                    <Ionicons name={typeInfo.icon} size={14} color={typeInfo.color}
                        style={{ transform: [{ rotate: typeInfo.rotation }] }} />
                    <Text style={styles.callMetaText}>
                        {call.name ? call.number : ''}{call.name && call.number ? ' · ' : ''}
                        {formatTimestamp(call.date)}
                        {call.duration ? ` · ${formatDuration(call.duration)}` : ''}
                    </Text>
                </View>
            </View>
            <TouchableOpacity style={styles.callAction} onPress={() => makeCall(call.number)}>
                <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// ══════════════════════════════════════
// Exported: RecentsView
// ══════════════════════════════════════
export function RecentsView() {
    const [callLog, setCallLog] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    const loadCallLog = useCallback(async () => {
        try {
            setLoading(true);
            if (Platform.OS === 'android') {
                const { PermissionsAndroid } = require('react-native');
                const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
                if (!granted) {
                    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
                    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                        setCallLog(getSampleCallLog());
                        setLoading(false);
                        return;
                    }
                }
                try {
                    const { requireNativeModule } = require('expo-modules-core');
                    const CallDisconnectModule = requireNativeModule('CallDisconnectModule');
                    if (CallDisconnectModule && CallDisconnectModule.getRecentCalls) {
                        const calls = await CallDisconnectModule.getRecentCalls(50);
                        setCallLog(calls || []);
                    } else {
                        setCallLog(getSampleCallLog());
                    }
                } catch (e) {
                    console.log('[Dialer] Failed to load call log:', e);
                    setCallLog(getSampleCallLog());
                }
            } else {
                setCallLog(getSampleCallLog());
            }
        } catch (err) {
            console.log('[Dialer] Error:', err);
            setCallLog(getSampleCallLog());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadCallLog(); }, [loadCallLog]);

    const filteredCalls = callLog.filter((call) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (call.name && call.name.toLowerCase().includes(q)) ||
            (call.number && call.number.includes(q));
    });

    return (
        <View style={styles.flex1}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={theme.colors.text.light} />
                <TextInput style={styles.searchInput} placeholder="Search numbers, names..."
                    placeholderTextColor={theme.colors.text.light} value={searchQuery}
                    onChangeText={setSearchQuery} />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={theme.colors.text.light} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>RECENT CALLS</Text>
                <TouchableOpacity onPress={loadCallLog} style={{ padding: 4 }}>
                    <Ionicons name="refresh-outline" size={18} color={theme.colors.text.light} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredCalls}
                keyExtractor={(item, index) => `${item.number}-${index}`}
                renderItem={({ item }) => <CallLogItem call={item} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="call-outline" size={48} color={theme.colors.text.light} />
                        <Text style={styles.emptyText}>{loading ? 'Loading call log...' : 'No recent calls'}</Text>
                    </View>
                }
                contentContainerStyle={filteredCalls.length === 0 ? styles.flex1 : undefined}
            />
        </View>
    );
}

// ══════════════════════════════════════
// Exported: DialpadView
// ══════════════════════════════════════
export function DialpadView() {
    const [dialedNumber, setDialedNumber] = useState('');

    return (
        <View style={styles.flex1}>
            <View style={styles.numberDisplay}>
                <Text style={[styles.dialedNumber,
                dialedNumber.length > 12 && { fontSize: 28 },
                dialedNumber.length > 16 && { fontSize: 22 }]}
                    numberOfLines={1} adjustsFontSizeToFit>
                    {dialedNumber || ' '}
                </Text>
            </View>

            <View style={styles.keypadGrid}>
                {KEYPAD.map((btn) => (
                    <TouchableOpacity key={btn.digit} style={styles.keypadBtn} activeOpacity={0.6}
                        onPress={() => setDialedNumber(prev => prev + btn.digit)}
                        onLongPress={btn.digit === '0' ? () => setDialedNumber(prev => prev + '+') : undefined}>
                        <Text style={styles.keypadDigit}>{btn.digit}</Text>
                        {btn.letters ? <Text style={styles.keypadLetters}>{btn.letters}</Text> : null}
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.dialActions}>
                <View style={styles.dialActionPlaceholder} />
                <TouchableOpacity style={styles.callBtn} onPress={() => makeCall(dialedNumber)} activeOpacity={0.8}>
                    <Ionicons name="call" size={28} color="#fff" />
                </TouchableOpacity>
                {dialedNumber ? (
                    <TouchableOpacity style={styles.backspaceBtn}
                        onPress={() => setDialedNumber(prev => prev.slice(0, -1))}
                        onLongPress={() => setDialedNumber('')}>
                        <Ionicons name="backspace-outline" size={24} color={theme.colors.text.secondary} />
                    </TouchableOpacity>
                ) : <View style={styles.dialActionPlaceholder} />}
            </View>
        </View>
    );
}

// ── Sample data ──
function getSampleCallLog() {
    const now = Date.now();
    return [
        { name: 'Mom', number: '+251911234567', type: 'OUTGOING', date: new Date(now - 3600000).toISOString(), duration: 245 },
        { name: 'Office', number: '+251922345678', type: 'INCOMING', date: new Date(now - 7200000).toISOString(), duration: 120 },
        { name: null, number: '+251933456789', type: 'MISSED', date: new Date(now - 14400000).toISOString(), duration: 0 },
        { name: 'Abebe', number: '+251944567890', type: 'OUTGOING', date: new Date(now - 28800000).toISOString(), duration: 60 },
        { name: 'Kebede', number: '+251955678901', type: 'INCOMING', date: new Date(now - 86400000).toISOString(), duration: 180 },
        { name: null, number: '+251966789012', type: 'MISSED', date: new Date(now - 172800000).toISOString(), duration: 0 },
    ];
}

// ── Placeholder default export (required by Expo router) ──
export default function DialerScreen() {
    return (
        <View style={styles.container}>
            <RecentsView />
        </View>
    );
}

// ══════════════════════════════════════
// Styles
// ══════════════════════════════════════
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    flex1: { flex: 1 },

    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 12, marginHorizontal: 20, marginBottom: 16,
        paddingHorizontal: 14, paddingVertical: 10,
    },
    searchInput: {
        flex: 1, fontSize: 15, color: theme.colors.text.primary, marginLeft: 10, padding: 0,
    },
    sectionTitle: {
        fontSize: 12, fontWeight: '600', color: theme.colors.text.light, letterSpacing: 1,
    },
    callItem: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    },
    avatar: {
        width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    callInfo: { flex: 1, marginLeft: 14 },
    callName: { fontSize: 16, fontWeight: '500', color: theme.colors.text.primary },
    missedText: { color: theme.colors.danger },
    callMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
    callMetaText: { fontSize: 13, color: theme.colors.text.secondary },
    callAction: { padding: 8 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
    emptyText: { marginTop: 12, fontSize: 15, color: theme.colors.text.light },

    numberDisplay: { alignItems: 'center', paddingTop: 10, paddingBottom: 4, minHeight: 60, justifyContent: 'center' },
    dialedNumber: { fontSize: 30, fontWeight: '300', color: theme.colors.text.primary, letterSpacing: 2 },

    keypadGrid: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 36, gap: 10,
    },
    keypadBtn: {
        width: DIALPAD_BTN_SIZE, height: DIALPAD_BTN_SIZE, borderRadius: DIALPAD_BTN_SIZE / 2,
        backgroundColor: theme.colors.background.secondary, justifyContent: 'center', alignItems: 'center',
    },
    keypadDigit: { fontSize: 24, fontWeight: '400', color: theme.colors.text.primary },
    keypadLetters: { fontSize: 9, fontWeight: '600', color: theme.colors.text.secondary, letterSpacing: 2, marginTop: -2 },

    dialActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 40 },
    callBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center' },
    backspaceBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    dialActionPlaceholder: { width: 44, height: 44 },
});
