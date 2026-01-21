import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useEffect } from 'react';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';

export default function DashboardScreen() {
  const { scores, metrics } = useQoE();

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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Crowdsourcing QoE</Text>
      <Text style={styles.subtitle}>
        End-to-end scoring using ETSI TR 103 559 weightings. Populate metrics
        via the Voice/Data tabs to see updates in real time.
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
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


