import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import DrawerButton from './DrawerButton';
import { useDrawer } from '../context/DrawerContext';
import { theme } from '../constants/theme';

export default function ScreenHeader({ title, showDrawer = true }) {
  const { openDrawer } = useDrawer();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {showDrawer && <DrawerButton onPress={openDrawer} />}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.spacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
    backgroundColor: theme.colors.background.primary,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  spacer: {
    width: 48, // Match drawer button width
  },
});
