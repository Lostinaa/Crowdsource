#!/bin/bash
# Script to hide Android emulator sidebar by resizing the window
# This works by detecting the emulator window and adjusting its geometry

export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

echo "Waiting for emulator window to appear..."
sleep 5

# Try using wmctrl if available
if command -v wmctrl &> /dev/null; then
    EMULATOR_WID=$(wmctrl -l | grep -i "emulator\|android" | awk '{print $1}' | head -1)
    if [ ! -z "$EMULATOR_WID" ]; then
        echo "Found emulator window, attempting to resize..."
        # Get current geometry
        GEOM=$(wmctrl -lG | grep "$EMULATOR_WID" | awk '{print $3, $4, $5, $6}')
        echo "Current geometry: $GEOM"
        # Note: This is a workaround - the sidebar is part of the window
        echo "Note: The sidebar is part of the emulator window itself."
        echo "You'll need to manually close it by clicking the '>>' button."
    fi
fi

# Alternative: Use xdotool if available (for X11 compatibility)
if command -v xdotool &> /dev/null; then
    EMULATOR_WID=$(xdotool search --class "Emulator" 2>/dev/null | head -1)
    if [ ! -z "$EMULATOR_WID" ]; then
        echo "Found emulator window via xdotool"
        # Unfortunately, we can't easily hide just the sidebar part
        echo "The extended controls panel is integrated into the emulator window."
        echo "Please close it manually by clicking the '>>' button on the right side."
    fi
fi

echo ""
echo "Unfortunately, newer Android emulator versions (36.3.10.0) don't support"
echo "hiding the extended controls panel programmatically."
echo ""
echo "Options:"
echo "1. Close it manually - click the '>>' button (it should stay closed)"
echo "2. Use window manager rules to resize/move the window"
echo "3. Consider using an older emulator version that supports -no-skin flag"






