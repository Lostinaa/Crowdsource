/**
 * Authentication & Role-Based Access Control Service
 * Basic structure for user authentication and authorization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@current_user';
const USER_ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
  USER: 'user',
};

const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'view_all_metrics',
    'export_data',
    'reset_metrics',
    'clear_history',
    'configure_backend',
    'view_audit_logs',
    'manage_users',
  ],
  [USER_ROLES.OPERATOR]: [
    'view_all_metrics',
    'export_data',
    'view_audit_logs',
  ],
  [USER_ROLES.VIEWER]: [
    'view_metrics',
    'view_history',
  ],
  [USER_ROLES.USER]: [
    'view_own_metrics',
    'run_tests',
  ],
};

class AuthService {
  /**
   * Check if user has permission
   */
  hasPermission(userRole, permission) {
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes(permission);
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('[Auth] Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Set current user (for demo/testing - in production, use proper authentication)
   */
  async setCurrentUser(user) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('[Auth] Failed to set current user:', error);
      return false;
    }
  }

  /**
   * Login (placeholder - implement with actual authentication)
   */
  async login(username, password) {
    // In production, this would call an authentication API
    // For now, return a demo user
    const demoUser = {
      id: 'demo-user',
      username: username,
      role: USER_ROLES.USER,
      email: `${username}@example.com`,
    };

    await this.setCurrentUser(demoUser);
    return demoUser;
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      return true;
    } catch (error) {
      console.error('[Auth] Failed to logout:', error);
      return false;
    }
  }

  /**
   * Check if user can perform action
   */
  async canPerformAction(permission) {
    const user = await this.getCurrentUser();
    if (!user) {
      return false; // No user logged in
    }
    return this.hasPermission(user.role, permission);
  }

  /**
   * Get available roles
   */
  getRoles() {
    return Object.values(USER_ROLES);
  }

  /**
   * Get permissions for role
   */
  getPermissionsForRole(role) {
    return ROLE_PERMISSIONS[role] || [];
  }
}

export const authService = new AuthService();
export { USER_ROLES, ROLE_PERMISSIONS };
export default AuthService;

