# Checking Build Branch for OTA Updates

## Current Configuration

### EAS Build Profiles
Your `eas.json` has three build profiles:
- **development**: Development client builds
- **preview**: Preview/internal builds  
- **production**: Production builds (with `autoIncrement: true`)

### Default Update Branch Behavior

**Important**: EAS Updates uses "branches" (update channels), not git branches!

When you build with:
```bash
eas build --profile production --platform android
```

The build is automatically associated with the **`production`** update branch.

## How to Check Your Build's Branch

### Method 1: Check EAS Dashboard
1. Go to: https://expo.dev/accounts/dopy/projects/cs-qoe/builds
2. Find your latest production build
3. Check the "Update Channel" or "Branch" field

### Method 2: Use EAS CLI
```bash
cd ~/code/rn/Crowdsource
eas build:list --platform android --limit 1
```

This will show:
- Build ID
- Profile used (production/preview/development)
- Update channel/branch (usually "production" for production builds)

### Method 3: Check Update Branch
```bash
eas update:list --branch production
```

This shows all updates published to the production branch.

## Ensuring OTA Updates Work

### Critical: Branch Matching

**The update branch MUST match the build's update channel!**

1. **If you built with `--profile production`**:
   - Build uses: `production` branch
   - Publish updates to: `production` branch
   ```bash
   eas update --branch production --message "Your update"
   ```

2. **If you built with `--profile preview`**:
   - Build uses: `preview` branch (or custom branch)
   - Publish updates to: `preview` branch
   ```bash
   eas update --branch preview --message "Your update"
   ```

3. **If you built with `--profile development`**:
   - Build uses: `development` branch
   - OTA updates are typically disabled for dev clients

## Recommended: Explicit Branch Configuration

To avoid confusion, you can explicitly set the update branch in `eas.json`:

```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "channel": "production",  // Explicit update channel
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

## Quick Check Commands

```bash
# 1. Check recent builds
eas build:list --platform android --limit 5

# 2. Check updates on production branch
eas update:list --branch production --limit 5

# 3. Check if updates exist for your runtime version
eas update:list --branch production --runtime-version 1.0.0
```

## What to Do If Branch Mismatch

If you published updates to the wrong branch:

1. **Find the correct branch** your build uses
2. **Publish update to that branch**:
   ```bash
   eas update --branch <correct-branch> --message "Fix for production"
   ```

3. **Or create a new build** with the correct branch:
   ```bash
   eas build --profile production --platform android --channel production
   ```

## Current Status Check

Based on your configuration:
- ✅ Build profile: `production` (from eas.json)
- ✅ Default update branch: `production` (for production builds)
- ✅ Update checking: Enabled in app code
- ⚠️ **Action needed**: Verify which branch your actual build used

## Next Steps

1. **Check your build's branch** using one of the methods above
2. **Verify updates were published to the same branch**
3. **If mismatch**: Publish update to correct branch or rebuild
