// FTP test configuration
// IMPORTANT: Replace these with your real FTP server details before using in production.
// For quick testing you can point this at any FTP server you control.

export const FTP_CONFIG = {
  host: 'ftp.dlptest.com',        // Example public test FTP server (may change or be rate-limited)
  port: 21,
  username: 'dlpuser',            // Example credentials – replace with yours
  password: 'rNrKYTX9g7z3RgJRmxWuGHbeu',

  // Remote paths used for tests
  downloadPath: '/readme.txt',      // Usually exists on public FTPs
  uploadPath: '/upload/cs-qoe-test-upload.txt', // Remote path for upload test

  // Real FTP is enabled – tests will use the native FTP client.
  // If the native module is missing in a build, the app will show
  // a clear "FTP not available" error instead of faking results.
  enableRealFtp: true,
};


