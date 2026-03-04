const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin: withInCallService
 *
 * Injects the CallDropService (InCallService) and DialerActivity into
 * AndroidManifest.xml during `expo prebuild` / `eas build`.
 *
 * Components added:
 * 1. CallDropService — InCallService that receives DisconnectCause events
 *    - BIND_INCALL_SERVICE permission (system-only binding)
 *    - IN_CALL_SERVICE_UI = true (required for binding as default dialer)
 * 2. DialerActivity — Required for ROLE_DIALER qualification
 *    - Handles android.intent.action.DIAL
 *    - Forwards to system dialer and finishes immediately
 */
function withInCallService(config) {
    return withAndroidManifest(config, async (config) => {
        const manifest = config.modResults;
        const application = manifest.manifest.application?.[0];

        if (!application) {
            console.warn('[withInCallService] No <application> found in manifest');
            return config;
        }

        // Ensure arrays exist
        if (!application.service) {
            application.service = [];
        }
        if (!application.activity) {
            application.activity = [];
        }

        // ── 1. CallDropService (InCallService) ──
        const serviceExists = application.service.some(
            (svc) => svc.$?.['android:name'] === 'expo.modules.callmetrics.CallDropService'
        );

        if (!serviceExists) {
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

        // ── 2. DialerActivity (ROLE_DIALER requirement) ──
        const dialerExists = application.activity.some(
            (act) => act.$?.['android:name'] === 'expo.modules.callmetrics.DialerActivity'
        );

        if (!dialerExists) {
            application.activity.push({
                $: {
                    'android:name': 'expo.modules.callmetrics.DialerActivity',
                    'android:exported': 'true',
                    'android:theme': '@android:style/Theme.NoDisplay',
                    'android:excludeFromRecents': 'true',
                    'android:noHistory': 'true',
                },
                'intent-filter': [
                    {
                        action: [
                            {
                                $: { 'android:name': 'android.intent.action.DIAL' },
                            },
                        ],
                        category: [
                            {
                                $: { 'android:name': 'android.intent.category.DEFAULT' },
                            },
                        ],
                    },
                    {
                        action: [
                            {
                                $: { 'android:name': 'android.intent.action.DIAL' },
                            },
                        ],
                        category: [
                            {
                                $: { 'android:name': 'android.intent.category.DEFAULT' },
                            },
                        ],
                        data: [
                            {
                                $: { 'android:scheme': 'tel' },
                            },
                        ],
                    },
                ],
            });
            console.log('[withInCallService] Added DialerActivity to AndroidManifest');
        }

        return config;
    });
}

module.exports = withInCallService;
