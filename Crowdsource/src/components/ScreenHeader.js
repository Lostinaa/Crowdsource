import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDrawer } from '../context/DrawerContext';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScreenHeader({ title, showDrawer = true, showLogo = false }) {
  const { openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={theme.gradient.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <View style={styles.leftContainer}>
          {showDrawer && (
            <TouchableOpacity onPress={openDrawer} style={styles.iconButton}>
              <Ionicons name="menu" size={28} color="white" />
            </TouchableOpacity>
          )}
          {showLogo && (
            <Image
              source={require('../../assets/images/ethiotelecomlogo.png')}
              style={styles.logo}
            />
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        <View style={styles.rightPlaceholder}>
          {/* Optional Right Action Button */}
          <Ionicons name="notifications-outline" size={24} color="rgba(255,255,255,0.8)" />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    ...theme.shadows.md,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    height: 60,
  },
  iconButton: {
    padding: 4,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 85,
    height: 32,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rightPlaceholder: {
    width: 32, // Balance the left icon
    alignItems: 'flex-end',
  },
});
