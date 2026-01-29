// FTP test configuration
// IMPORTANT: Replace these with your real FTP server details before using in production.
// For quick testing you can point this at any FTP server you control.

export const FTP_CONFIG = {
  host: 'ftp.dlp-test.com',        // Public test FTP server with known files
  port: 21,
  username: 'anonymous',           // Anonymous login allowed
  password: 'test@example.com',    // Email format for anonymous FTP

  // Remote paths used for tests
  // dlp-test.com has FTP_README.txt and allows uploads to root
  downloadPath: '/FTP_README.txt',      // Known file that exists (1.5 KB)
  uploadPath: '/cs-qoe-test-upload.txt', // Upload to root (deleted at 2 AM UK time)

  // Re-enabled with working server configuration
  enableRealFtp: true,
};


