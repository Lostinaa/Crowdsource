import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useEffect } from 'react';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DrawerButton from '../../src/components/DrawerButton';
import { useDrawer } from '../../src/context/DrawerContext';

export default function DashboardScreen() {
  const { scores, metrics } = useQoE();
  const { openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();

  // Debug logging
  useEffect(() => {
    console.log('[Dashboard] Scores updated:', {
      overall: scores.overall.score,
      voice: scores.voice.score,
      data: scores.data.score,
      voiceAppliedWeight: scores.voice.appliedWeight,
      dataAppliedWeight: scores.data.appliedWeight,
    });
  }, [scores]);

  const formatScore = (value) => {
    if (value === null || value === undefined) return '--';
    return `${Math.round(value * 100)}%`;
  };

  const scoreCards = [
    { label: 'Overall QoE', value: formatScore(scores.overall.score) },
    { label: 'Voice Score', value: formatScore(scores.voice.score) },
    { label: 'Data Score', value: formatScore(scores.data.score) },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.menuButtonWrap, { top: insets.top + 6 }]}>
        <DrawerButton onPress={openDrawer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Crowdsourcing QoE</Text>
        <Text style={styles.subtitle}>
          End-to-end scoring, using ETSI TR 103 559 weightings.
        </Text>

        <View style={styles.cardsRow}>
          {scoreCards.map((card) => (
            <View key={card.label} style={styles.card}>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={[styles.cardValue, { color: theme.colors.primary }]}>{card.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.breakdown}>
          <Text style={styles.sectionTitle}>Coverage</Text>
          <Text style={styles.sectionText}>
            Voice data coverage:{' '}
            {formatScore(scores.voice.appliedWeight)}
          </Text>
          <Text style={styles.sectionText}>
            Data sub-metrics coverage:{' '}
            {formatScore(scores.data.appliedWeight)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  menuButtonWrap: {
    position: 'absolute',
    left: 6,
    zIndex: 10,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.sm,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl + 20,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.background.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  cardLabel: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  breakdown: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  sectionText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
});


