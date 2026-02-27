const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin: withInCallService
 *
 * Injects the CallDropService (InCallService) declaration into AndroidManifest.xml
 * during `expo prebuild` / `eas build`. This ensures the service registration
 * survives manifest regeneration.
 *
 * The service:
 * - Uses BIND_INCALL_SERVICE permission (system-only binding)
 * - Declares IN_CALL_SERVICE_UI = false (doesn't replace dialer UI)
 * - Listens for android.telecom.InCallService intent
 */
function withInCallService(config) {
    return withAndroidManifest(config, async (config) => {
        const manifest = config.modResults;
        const application = manifest.manifest.application?.[0];

        if (!application) {
            console.warn('[withInCallService] No <application> found in manifest');
            return config;
        }

        // Ensure services array exists
        if (!application.service) {
            application.service = [];
        }

        // Check if service is already declared (avoid duplicates)
        const alreadyExists = application.service.some(
            (svc) => svc.$?.['android:name'] === 'expo.modules.callmetrics.CallDropService'
        );

        if (!alreadyExists) {
            application.service.push({
                $: {
                    'android:name': 'expo.modules.callmetrics.CallDropService',
                    'android:permission': 'android.permission.BIND_INCALL_SERVICE',
                    'android:exported': 'true',
                },
                'meta-data': [
                    {
                        $: {
                            'android:name': 'android.telecom.IN_CALL_SERVICE_UI',
                            'android:value': 'false',
                        },
                    },
                ],
                'intent-filter': [
                    {
                        action: [
                            {
                                $: {
                                    'android:name': 'android.telecom.InCallService',
                                },
                            },
                        ],
                    },
                ],
            });
            console.log('[withInCallService] Added CallDropService to AndroidManifest');
        }

        return config;
    });
}

module.exports = withInCallService;
