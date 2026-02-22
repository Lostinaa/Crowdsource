import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

/**
 * DashboardFullTestButton - A large circular 'GO' button for initiating tests
 * Features pulsing animations and progress indicators.
 */
export default function DashboardFullTestButton({
    onPress,
    isTesting,
    progress = 0,
    testLabel = 'Scanning...'
}) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let pulse;
        let rotation;

        if (!isTesting) {
            // Idle pulse animation
            pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.08,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            rotateAnim.setValue(0);
        } else {
            // Testing rotation animation
            pulseAnim.setValue(1);
            rotation = Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            rotation.start();
        }

        return () => {
            if (pulse) pulse.stop();
            if (rotation) rotation.stop();
        };
    }, [isTesting]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Determine the status of each test based on current testLabel
    const steps = [
        { key: 'Checking Latency...', title: 'Latency Test' },
        { key: 'Testing Browsing...', title: 'Browsing Test' },
        { key: 'Testing Streaming...', title: 'Streaming Test' },
        { key: 'Measuring Download...', title: 'HTTP Download' },
        { key: 'Measuring Upload...', title: 'HTTP Upload' },
        { key: 'Testing FTP DL...', title: 'FTP Download' },
        { key: 'Testing FTP UL...', title: 'FTP Upload' },
        { key: 'Testing Social Media...', title: 'Social Media' },
    ];

    const currentStepIndex = steps.findIndex(s => s.key === testLabel);

    // If Complete! is shown, all are done. If testLabel is "Starting...", none are done.
    const isComplete = testLabel === 'Complete!';
    const hasStarted = testLabel !== 'Starting...' && testLabel !== '';

    return (
        <View style={styles.container}>
            {/* Outer Pulse Ring */}
            {!isTesting && (
                <Animated.View
                    style={[
                        styles.pulseRing,
                        {
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseAnim.interpolate({
                                inputRange: [1, 1.08],
                                outputRange: [0.6, 0],
                            }),
                        },
                    ]}
                />
            )}

            {/* Main Circular Button */}
            <Animated.View style={{ transform: [{ scale: isTesting ? 1 : pulseAnim }] }}>
                <TouchableOpacity
                    onPress={onPress}
                    disabled={isTesting}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={theme.gradient.primary}
                        style={styles.buttonMain}
                    >
                        {isTesting ? (
                            <View style={styles.contentContainer}>
                                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                                <Text style={styles.statusLabel}>{testLabel}</Text>

                                {/* Rotating Border */}
                                <Animated.View
                                    style={[
                                        styles.spinnerBorder,
                                        { transform: [{ rotate: spin }] }
                                    ]}
                                />
                            </View>
                        ) : (
                            <View style={styles.contentContainer}>
                                <Text style={styles.goText}>GO</Text>
                                <Text style={styles.subText}>Full Test</Text>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {/* Checklist UI when testing or completed */}
            {(isTesting || isComplete) && (
                <View style={styles.checklistContainer}>
                    {steps.map((step, index) => {
                        let status = 'pending';
                        if (isComplete || (currentStepIndex !== -1 && index < currentStepIndex)) {
                            status = 'done';
                        } else if (currentStepIndex === index) {
                            status = 'running';
                        } else if (hasStarted === false) {
                            status = 'pending';
                        }

                        return (
                            <View key={step.key} style={styles.checklistItem}>
                                <View style={styles.iconContainer}>
                                    {status === 'done' && <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.success} />}
                                    {status === 'running' && <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                        <MaterialCommunityIcons name="loading" size={20} color={theme.colors.primary} />
                                    </Animated.View>}
                                    {status === 'pending' && <MaterialCommunityIcons name="circle-outline" size={20} color={theme.colors.border.light} />}
                                </View>
                                <Text style={[
                                    styles.checklistText,
                                    status === 'done' && styles.checklistTextDone,
                                    status === 'running' && styles.checklistTextRunning
                                ]}>
                                    {step.title}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        height: 220,
    },
    pulseRing: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 8,
        borderColor: theme.colors.primary,
    },
    buttonMain: {
        width: 156,
        height: 156,
        borderRadius: 78,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.lg,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    goText: {
        color: 'white',
        fontSize: 42,
        fontWeight: '900',
        letterSpacing: 2,
    },
    subText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: -4,
    },
    progressText: {
        color: 'white',
        fontSize: 32,
        fontWeight: '800',
    },
    statusLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    spinnerBorder: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 5,
        borderColor: 'transparent',
        borderTopColor: 'white',
        borderRightColor: 'rgba(255,255,255,0.3)',
    },
    checklistContainer: {
        marginTop: theme.spacing.xl,
        width: '100%',
        paddingHorizontal: theme.spacing.xl,
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        ...theme.shadows.sm,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border.light,
    },
    iconContainer: {
        width: 30,
        alignItems: 'center',
    },
    checklistText: {
        fontSize: 15,
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing.sm,
    },
    checklistTextRunning: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    checklistTextDone: {
        color: theme.colors.text.primary,
        fontWeight: '500',
    },
});
