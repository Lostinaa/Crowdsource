# WebView Debugging Guide

## Issue: WebView Modal Not Appearing

### Quick Checks:

1. **Check Console Logs** (in Metro bundler or device logs):
   - Look for `[Data] Opening WebView for browsing test`
   - Look for `[SpeedTestWebView] Setting up test: browsing`
   - Look for `[SpeedTestWebView] Rendering Modal`

2. **Verify State Changes**:
   - When you press "Test Browsing", check if these logs appear:
     ```
     [Data] Test Browsing button pressed
     [Data] Opening WebView for browsing test
     [Data] WebView state changed: { webViewVisible: true, webViewTestType: 'browsing' }
     [SpeedTestWebView] Setting up test: browsing
     [SpeedTestWebView] Rendering Modal, visible: true, testType: browsing
     ```

3. **Check if Modal is Blocked**:
   - The Modal might be behind other components
   - Try pressing the back button on Android - if it closes something, the Modal might be there but hidden

4. **Test with ADB Logs**:
   ```bash
   # Connect device/emulator first
   adb devices
   
   # Filter for React Native logs
   adb logcat | grep -E "ReactNativeJS|Data|SpeedTestWebView"
   
   # Or check for errors
   adb logcat | grep -i "error\|exception" | grep -i "webview\|modal"
   ```

### Common Issues:

1. **WebView Package Not Linked**:
   - `react-native-webview` is installed but might need native linking
   - For Expo: Should work automatically, but try:
     ```bash
     npx expo prebuild --clean
     ```

2. **Modal Not Rendering**:
   - Check if `webViewVisible` state is actually `true`
   - Check if `webViewTestType` is set to `'browsing'`
   - The Modal returns `null` if either is falsy

3. **Android Permissions**:
   - WebView needs INTERNET permission (should be in AndroidManifest.xml)
   - Check: `android/app/src/main/AndroidManifest.xml`

4. **Test URL Not Loading**:
   - The WebView waits for `testUrl` to be set before rendering
   - Check console for: `[SpeedTestWebView] Test URL set to: ...`

### Manual Test:

Add this temporary button to test the Modal directly:

```javascript
// In data.js, add a test button
<Button 
  title="Test Modal Directly" 
  onPress={() => {
    console.log('Direct test');
    setWebViewTestType('browsing');
    setWebViewVisible(true);
  }} 
/>
```

### Files to Check:

1. `/Crowdsource/src/components/SpeedTestWebView.js` - WebView component
2. `/Crowdsource/app/(tabs)/data.js` - Where it's used
3. `/Crowdsource/package.json` - Verify `react-native-webview` is installed

### Next Steps:

1. Run the app and check Metro bundler console for the debug logs
2. If logs show state is changing but Modal doesn't appear, it's likely a rendering/z-index issue
3. If logs don't show state changes, the button handler isn't firing
