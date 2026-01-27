import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';
import { useDrawer } from '../context/DrawerContext';

export default function Drawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(-300)).current;

  React.useEffect(() => {
    if (isOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen]);

  const menuItems = [
    {
      title: 'History',
      icon: 'time-outline',
      route: '/(tabs)/history',
    },
    {
      title: 'Settings',
      icon: 'settings-outline',
      route: '/(tabs)/settings',
    },
  ];

  const handleMenuItemPress = (route) => {
    router.push(route);
    closeDrawer();
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="none"
      onRequestClose={closeDrawer}
    >
      <TouchableWithoutFeedback onPress={closeDrawer}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.drawer,
                {
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Menu</Text>
                  <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.menuContainer}>
                  {menuItems.map((item) => (
                    <TouchableOpacity
                      key={item.title}
                      style={styles.menuItem}
                      onPress={() => handleMenuItemPress(item.route)}
                    >
                      <Ionicons
                        name={item.icon}
                        size={24}
                        color={theme.colors.primary}
                        style={styles.menuIcon}
                      />
                      <Text style={styles.menuItemText}>{item.title}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.colors.text.secondary}
                        style={styles.chevron}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </SafeAreaView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  drawer: {
    width: 280,
    height: '100%',
    backgroundColor: theme.colors.background.primary,
    ...theme.shadows.lg,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  menuContainer: {
    paddingVertical: theme.spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  menuIcon: {
    marginRight: theme.spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: theme.spacing.sm,
  },
});
