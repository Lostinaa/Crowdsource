/**
 * Audit Log Service
 * Records all critical actions for security and compliance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const AUDIT_LOG_KEY = '@audit_logs';
const MAX_AUDIT_LOGS = 1000;

export const ACTION_TYPES = {
  METRICS_RESET: 'METRICS_RESET',
  HISTORY_CLEARED: 'HISTORY_CLEARED',
  DATA_EXPORTED: 'DATA_EXPORTED',
  BACKEND_SYNC: 'BACKEND_SYNC',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  PERMISSION_REQUESTED: 'PERMISSION_REQUESTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  APP_STARTED: 'APP_STARTED',
  APP_BACKGROUNDED: 'APP_BACKGROUNDED',
  CALL_LISTENER_STARTED: 'CALL_LISTENER_STARTED',
  CALL_LISTENER_STOPPED: 'CALL_LISTENER_STOPPED',
};

class AuditLogService {
  /**
   * Log an action
   */
  async logAction(actionType, details = {}, userId = null) {
    try {
      const logEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        actionType,
        userId: userId || 'anonymous',
        details: {
          ...details,
          platform: require('react-native').Platform.OS,
        },
      };

      const logs = await this.getLogs();
      const updatedLogs = [logEntry, ...logs].slice(0, MAX_AUDIT_LOGS);

      await AsyncStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updatedLogs));
      
      console.log('[AuditLog] Action logged:', actionType, logEntry);
      return logEntry;
    } catch (error) {
      console.error('[AuditLog] Failed to log action:', error);
      return null;
    }
  }

  /**
   * Get all audit logs
   */
  async getLogs(limit = null) {
    try {
      const logsJson = await AsyncStorage.getItem(AUDIT_LOG_KEY);
      const logs = logsJson ? JSON.parse(logsJson) : [];
      return limit ? logs.slice(0, limit) : logs;
    } catch (error) {
      console.error('[AuditLog] Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Get logs by action type
   */
  async getLogsByAction(actionType) {
    const logs = await this.getLogs();
    return logs.filter(log => log.actionType === actionType);
  }

  /**
   * Get logs by date range
   */
  async getLogsByDateRange(startDate, endDate) {
    const logs = await this.getLogs();
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Clear audit logs
   */
  async clearLogs() {
    try {
      await AsyncStorage.removeItem(AUDIT_LOG_KEY);
      await this.logAction(ACTION_TYPES.HISTORY_CLEARED, { clearedBy: 'user' });
      return true;
    } catch (error) {
      console.error('[AuditLog] Failed to clear logs:', error);
      return false;
    }
  }

  /**
   * Export audit logs
   */
  async exportLogs() {
    const logs = await this.getLogs();
    return {
      exportDate: new Date().toISOString(),
      totalEntries: logs.length,
      logs: logs,
    };
  }
}

export const auditLog = new AuditLogService();
export default AuditLogService;

