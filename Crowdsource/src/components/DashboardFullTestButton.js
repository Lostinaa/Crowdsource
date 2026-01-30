import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
} from 'react-native';
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
});
