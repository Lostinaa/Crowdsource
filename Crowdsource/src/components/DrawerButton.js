import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export default function DrawerButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <Ionicons name="menu" size={24} color={theme.colors.text.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
});
