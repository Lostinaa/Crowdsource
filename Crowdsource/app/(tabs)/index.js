import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';
import ScreenHeader from '../../src/components/ScreenHeader';
import DashboardFullTestButton from '../../src/components/DashboardFullTestButton';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  const { metrics, runFullTest, isTesting, testProgress, testLabel } = useQoE();

  // Helper to safely get the latest valid metric
  const getLatestMetric = (metricObj) => {
    if (!metricObj?.throughputs || metricObj.throughputs.length === 0) return null;
    return metricObj.throughputs[metricObj.throughputs.length - 1];
  };

  const getLatestLatency = (metricObj) => {
    if (!metricObj?.latencies || metricObj.latencies.length === 0) return null;
    return metricObj.latencies[metricObj.latencies.length - 1]; // Return last sample
  };

  const downloadSpeed = getLatestMetric(metrics.data.http.dl);
  const uploadSpeed = getLatestMetric(metrics.data.http.ul);
  const latency = getLatestLatency(metrics.data.latency);

  const formatSpeed = (mbps) => {
    if (mbps === null || mbps === undefined) return '--';
    return `${mbps.toFixed(1)} Mbps`;
  };

  const formatLatency = (ms) => {
    if (ms === null || ms === undefined) return '--';
    return `${Math.round(ms)} ms`;
  };

  const getScoreColor = (value, type) => {
    if (value === null || value === undefined) return theme.colors.text.secondary;

    if (type === 'latency') {
      // Lower is better
      if (value < 50) return theme.colors.success;
      if (value < 100) return theme.colors.warning;
      return theme.colors.danger;
    }

    // Higher is better
    if (value > 10) return theme.colors.success;
    if (value > 5) return theme.colors.warning;
    return theme.colors.danger;
  };

  const kpiCards = [
    {
      label: 'Download Speed',
      value: downloadSpeed,
      formatted: formatSpeed(downloadSpeed),
      color: getScoreColor(downloadSpeed, 'speed')
    },
    {
      label: 'Upload Speed',
      value: uploadSpeed,
      formatted: formatSpeed(uploadSpeed),
      color: getScoreColor(uploadSpeed, 'speed')
    },
    {
      label: 'Latency',
      value: latency,
      formatted: formatLatency(latency),
      color: getScoreColor(latency, 'latency')
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title="tele Crowdsource" showLogo={true} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>


        <View style={styles.cardsColumn}>
          {kpiCards.map((card, index) => (
            <View key={index} style={styles.cardContainer}>
              <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.card}
              >
                <View style={styles.cardContent}>
                  <Text style={[styles.cardValue, { color: card.color }]}>
                    {card.formatted}
                  </Text>
                  <Text style={styles.cardLabel}>{card.label}</Text>
                </View>
                {/* Visual indicator bar */}
                <View style={[styles.indicatorBar, { backgroundColor: card.color }]} />
              </LinearGradient>
            </View>
          ))}
        </View>

        <View style={styles.actionSection}>
          <DashboardFullTestButton
            onPress={runFullTest}
            isTesting={isTesting}
            progress={testProgress}
            testLabel={testLabel}
          />
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
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: 100,
  },
  welcomeSection: {
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  cardsColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  cardContainer: {
    flex: 1,
    minWidth: '28%',
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    backgroundColor: '#fff',
  },
  card: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    overflow: 'hidden',
  },
  cardContent: {
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    color: theme.colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  indicatorBar: {
    height: 4,
    width: '100%',
    opacity: 0.8,
  },
  actionSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
});


