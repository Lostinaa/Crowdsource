import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDrawer } from '../context/DrawerContext';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ScreenHeader({ title, showDrawer = true }) {
  const { openDrawer } = useDrawer();

  return (
    <LinearGradient
      colors={theme.gradient.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {showDrawer && (
            <TouchableOpacity onPress={openDrawer} style={styles.iconButton}>
              <Ionicons name="menu" size={28} color="white" />
            </TouchableOpacity>
          )}

          <Text style={styles.title}>{title}</Text>

          <View style={styles.rightPlaceholder}>
            {/* Optional Right Action Button */}
            <Ionicons name="notifications-outline" size={24} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    ...theme.shadows.md,
    zIndex: 10,
  },
  safeArea: {
    backgroundColor: 'transparent',
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
