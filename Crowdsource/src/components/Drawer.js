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
import { LinearGradient } from 'expo-linear-gradient';

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
      title: 'Dashboard',
      icon: 'speedometer-outline',
      route: '/(tabs)',
    },
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
              <View style={styles.drawerContent}>
                <LinearGradient
                  colors={theme.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerGradient}
                >
                  <SafeAreaView>
                    <View style={styles.headerContent}>
                      <View style={styles.logoContainer}>
                        <Ionicons name="bar-chart" size={32} color="white" />
                      </View>
                      <View>
                        <Text style={styles.appName}>CrowdSource</Text>
                        <Text style={styles.appVersion}>QoE Monitor v1.0</Text>
                      </View>
                      <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
                        <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.8)" />
                      </TouchableOpacity>
                    </View>
                  </SafeAreaView>
                </LinearGradient>

                <View style={styles.menuContainer}>
                  {menuItems.map((item) => (
                    <TouchableOpacity
                      key={item.title}
                      style={styles.menuItem}
                      onPress={() => handleMenuItemPress(item.route)}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: theme.colors.lightGray }]}>
                        <Ionicons
                          name={item.icon}
                          size={22}
                          color={theme.colors.primary}
                        />
                      </View>
                      <Text style={styles.menuItemText}>{item.title}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={theme.colors.text.light}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker overlay
    flexDirection: 'row',
  },
  drawer: {
    width: 280, // Slightly wider
    height: '100%',
    backgroundColor: theme.colors.background.primary,
    ...theme.shadows.lg,
    overflow: 'hidden', // Clean corners
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  drawerContent: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  headerContent: {
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  appVersion: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 5,
  },
  menuContainer: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
