#!/bin/bash
# Start Android emulator without extended controls panel
# The panel will need to be closed manually once, then it should stay closed

export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

echo "Starting emulator Pixel_API_34..."
$ANDROID_HOME/emulator/emulator -avd Pixel_API_34 -no-snapshot-load -no-audio &

echo "Waiting for emulator to boot..."
for i in {1..30}; do
    booted=$(adb shell getprop sys.boot_completed 2>/dev/null)
    if [ "$booted" = "1" ]; then
        echo "✓ Emulator is fully booted!"
        echo ""
        echo "Note: Please manually close the extended controls panel (sidebar) by clicking the '>>' button."
        echo "The emulator will remember this setting for future launches."
        adb devices
        break
    fi
    sleep 2
done







