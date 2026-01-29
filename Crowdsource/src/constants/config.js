/**
 * Application Configuration
 * Uses environment variables with sensible defaults
 * 
 * To override, create a .env file in the project root with:
 * EXPO_PUBLIC_FTP_HOST=your.ftp.server
 * EXPO_PUBLIC_BACKEND_URL=http://your-api-server:8000/api
 * 
 * See .env.example for all available options.
 */

// Helper to get env var with default
const getEnvVar = (key, defaultValue) => {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
};

const getEnvBool = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

const getEnvNumber = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// FTP test configuration
// Uses environment variables for flexibility across environments
export const FTP_CONFIG = {
  host: getEnvVar('EXPO_PUBLIC_FTP_HOST', 'ftp.dlp-test.com'),
  port: getEnvNumber('EXPO_PUBLIC_FTP_PORT', 21),
  username: getEnvVar('EXPO_PUBLIC_FTP_USERNAME', 'anonymous'),
  password: getEnvVar('EXPO_PUBLIC_FTP_PASSWORD', 'test@example.com'),

  // Remote paths used for tests
  downloadPath: getEnvVar('EXPO_PUBLIC_FTP_DOWNLOAD_PATH', '/FTP_README.txt'),
  uploadPath: getEnvVar('EXPO_PUBLIC_FTP_UPLOAD_PATH', '/cs-qoe-test-upload.txt'),

  // Enable/disable real FTP tests
  enableRealFtp: getEnvBool('EXPO_PUBLIC_FTP_ENABLED', true),
};

// Debug configuration
export const DEBUG_CONFIG = {
  enabled: getEnvBool('EXPO_PUBLIC_DEBUG', false),
  verboseLogging: getEnvBool('EXPO_PUBLIC_VERBOSE_LOGGING', false),
};

// App metadata
export const APP_CONFIG = {
  version: getEnvVar('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
  name: 'Crowdsourcing QoE',
};


