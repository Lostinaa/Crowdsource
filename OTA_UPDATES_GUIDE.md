# OTA Updates Guide - Crowdsource App

## ✅ Current Configuration

Your app is **properly configured** for OTA (Over-The-Air) updates:

### 1. Dependencies
- ✅ `expo-updates` installed (`~29.0.14`)
- ✅ EAS project ID configured
- ✅ Updates URL configured

### 2. Configuration Files

**`app.json`**:
```json
{
  "updates": {
    "url": "https://u.expo.dev/ab05d62d-ae57-46ec-8e8a-fd3061115828"
  },
  "runtimeVersion": {
    "policy": "appVersion"
  }
}
```

**`eas.json`**:
- Production builds configured with `autoIncrement: true`

## 🔄 How OTA Updates Work

### Runtime Version Policy
- **Policy**: `appVersion` (uses `version` from `app.json`)
- **Current version**: `1.0.0`
- **How it works**: 
  - Updates are only delivered to apps with matching runtime version
  - When you change native code or update `app.json` version, you need a new build
  - JavaScript/TypeScript changes can be pushed via OTA without rebuilding

### Update Flow

1. **App Startup**: App automatically checks for updates (in production builds)
2. **Update Available**: Downloads update in background
3. **Reload**: App reloads with new JavaScript bundle
4. **User Experience**: Seamless, no app store update needed

## 📱 Update Checking Logic

The app now includes automatic update checking in `app/_layout.js`:

- ✅ Checks for updates on app startup
- ✅ Only runs in production builds (skips in development)
- ✅ Automatically downloads and applies updates
- ✅ Logs update status for debugging

## 🚀 Publishing OTA Updates

### Method 1: Using EAS CLI (Recommended)

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to your Expo account
eas login

# Publish an update
cd ~/code/rn/Crowdsource
eas update --branch production --message "Update description"
```

### Method 2: Using Expo CLI

```bash
cd ~/code/rn/Crowdsource
npx expo publish
```

**Note**: `expo publish` is deprecated. Use `eas update` instead.

## 📋 Update Workflow

### For JavaScript/TypeScript Changes (OTA Update)

1. **Make your changes** (e.g., UI updates, bug fixes, new features)
2. **Test locally** with `expo start`
3. **Publish update**:
   ```bash
   eas update --branch production --message "Fixed button styling, updated theme"
   ```
4. **Users get update** automatically on next app open (within ~1 minute)

### For Native Changes (New Build Required)

If you change:
- Native modules
- `app.json` version
- Native dependencies
- Android/iOS permissions
- App configuration

**You must create a new build**:
```bash
# Build new version
eas build --platform android --profile production

# Update version in app.json first!
# Then publish OTA updates for that new version
```

## 🔍 Testing OTA Updates

### 1. Test in Development
- OTA updates are **disabled** in development mode
- Use production builds to test updates

### 2. Test Update Flow

```bash
# 1. Build production app
eas build --platform android --profile production

# 2. Install on device

# 3. Make a small change (e.g., change text color)

# 4. Publish update
eas update --branch production --message "Test update"

# 5. Close and reopen app - should see update applied
```

### 3. Check Update Status

The app logs update status to console:
- `[Updates] App is up to date`
- `[Updates] Update available, downloading...`
- `[Updates] Update downloaded, reloading app...`

## ⚠️ Important Notes

### Development vs Production

- **Development builds** (`expo-dev-client`): 
  - OTA updates are **disabled** by default
  - Updates are skipped in `__DEV__` mode
  - Use for active development

- **Production builds**:
  - OTA updates **enabled** automatically
  - Checks for updates on startup
  - Users get updates seamlessly

### Version Management

- **Runtime version** (`app.json` version): Controls which updates users receive
- **Build number**: Managed by EAS (`autoIncrement: true`)
- **Update version**: Managed by EAS Update service

### Update Channels/Branches

- **Default branch**: `production`
- **Custom branches**: Can create staging, beta, etc.
  ```bash
  eas update --branch staging --message "Staging update"
  ```

## 🐛 Troubleshooting

### Updates Not Appearing

1. **Check runtime version**: Update must match app's runtime version
2. **Check build type**: Only production builds check for updates
3. **Check network**: App needs internet to check/download updates
4. **Check logs**: Look for `[Updates]` logs in console

### Force Update Check

Add manual update check in settings:
```javascript
import * as Updates from 'expo-updates';

const checkForUpdates = async () => {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
};
```

## 📊 Update Statistics

View update statistics in EAS Dashboard:
- https://expo.dev/accounts/dopy/projects/cs-qoe/updates

## ✅ Summary

**OTA Updates Status**: ✅ **FULLY CONFIGURED**

- ✅ Dependencies installed
- ✅ Configuration complete
- ✅ Update checking logic added
- ✅ Ready to publish updates

**Next Steps**:
1. Make your changes
2. Run `eas update --branch production --message "Your update description"`
3. Users will receive updates automatically!
