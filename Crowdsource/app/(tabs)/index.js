import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useEffect } from 'react';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';
import ScreenHeader from '../../src/components/ScreenHeader';
import DashboardFullTestButton from '../../src/components/DashboardFullTestButton';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  const { scores, runFullTest, isTesting, testProgress, testLabel } = useQoE();

  // Debug logging
  useEffect(() => {
    console.log('[Dashboard] Scores updated:', {
      overall: scores.overall.score,
      voice: scores.voice.score,
      data: scores.data.score,
    });
  }, [scores]);


  const formatScore = (value) => {
    if (value === null || value === undefined) return '--';
    return `${Math.round(value * 100)}%`;
  };

  const getScoreColor = (value) => {
    if (value === null || value === undefined) return theme.colors.gray;
    if (value >= 0.8) return theme.colors.success;
    if (value >= 0.5) return theme.colors.warning;
    return theme.colors.danger;
  };

  const scoreCards = [
    { label: 'Overall Quality', value: scores.overall.score, key: 'overall' },
    { label: 'Voice Services', value: scores.voice.score, key: 'voice' },
    { label: 'Data Services', value: scores.data.score, key: 'data' },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Crowdsourcing QoE" showLogo={true} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.welcomeSection}>
          <Text style={styles.subtitle}>
            End-to-end QoE scoring using ETSI TR 103 559.
          </Text>
        </View>

        <View style={styles.cardsRow}>
          {scoreCards.map((card) => (
            <LinearGradient
              key={card.key}
              colors={['#ffffff', '#f8fafc']}
              style={styles.card}
            >
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={[styles.cardValue, { color: getScoreColor(card.value) }]}>
                {formatScore(card.value)}
              </Text>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.border.light }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(card.value ?? 0) * 100}%`,
                      backgroundColor: getScoreColor(card.value)
                    }
                  ]}
                />
              </View>
            </LinearGradient>
          ))}
        </View>

        <View style={styles.breakdown}>
          <Text style={styles.sectionTitle}>Coverage</Text>
          <Text style={styles.sectionText}>
            Voice data coverage: {formatScore(scores.voice.appliedWeight)}
          </Text>
          <Text style={styles.sectionText}>
            Data sub-metrics coverage: {formatScore(scores.data.appliedWeight)}
          </Text>
        </View>

        <DashboardFullTestButton
          onPress={runFullTest}
          isTesting={isTesting}
          progress={testProgress}
          testLabel={testLabel}
        />
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
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  welcomeSection: {
    marginBottom: theme.spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  card: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  cardLabel: {
    color: theme.colors.text.secondary,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
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
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  sectionText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
});


