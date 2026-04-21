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

    // Generate tick marks for the watch dial effect
    const renderTickMarks = () => {
        const ticks = [];
        const totalTicks = 40;
        for (let i = 0; i < totalTicks; i++) {
            const rotation = (i * (360 / totalTicks)) + 'deg';
            // Make every 5th tick slightly larger
            const isMajorLabel = i % 5 === 0;
            ticks.push(
                <View
                    key={i}
                    style={[
                        styles.tickMarkWrapper,
                        { transform: [{ rotate: rotation }] }
                    ]}
                >
                    <View style={[
                        styles.tickMark,
                        isMajorLabel ? styles.tickMarkMajor : styles.tickMarkMinor,
                        (isTesting && i < (progress * totalTicks)) ? styles.tickMarkActive : null
                    ]} />
                </View>
            );
        }
        return ticks;
    };

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

            {/* Watch Dial Background */}
            <View style={styles.dialContainer}>
                {renderTickMarks()}
            </View>

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
                                {/* Rotating Border Segment */}
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

            {/* Transitioning Centered Text below the button instead of checklist */}
            {(isTesting || isComplete) && (
                <View style={styles.statusTextContainer}>
                    <Text style={styles.statusLabelBig}>{testLabel}</Text>
                    {isTesting && (
                        <Animated.View style={{ transform: [{ rotate: spin }], marginTop: 8 }}>
                             <MaterialCommunityIcons name="loading" size={24} color={theme.colors.primary} />
                        </Animated.View>
                    )}
                    {isComplete && (
                        <View style={{ marginTop: 8 }}>
                             <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.success} />
                        </View>
                    )}
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
    statusLabelBig: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    spinnerBorder: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 4,
        borderColor: 'transparent',
        borderTopColor: 'rgba(255,255,255,0.8)',
        borderRightColor: 'rgba(255,255,255,0.4)',
    },
    dialContainer: {
        position: 'absolute',
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tickMarkWrapper: {
        position: 'absolute',
        width: 200,
        height: 200,
        alignItems: 'center',
    },
    tickMark: {
        backgroundColor: theme.colors.border.light,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
    },
    tickMarkMinor: {
        width: 2,
        height: 6,
    },
    tickMarkMajor: {
        width: 3,
        height: 10,
        backgroundColor: theme.colors.border.medium,
    },
    tickMarkActive: {
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 3,
    },
    statusTextContainer: {
        position: 'absolute',
        bottom: -60,
        alignItems: 'center',
        width: '100%',
    },
});
