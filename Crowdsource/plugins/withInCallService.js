const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin: withInCallService
 *
 * Injects InCallService components into AndroidManifest.xml:
 * 1. CallDropService — receives DisconnectCause events (IN_CALL_SERVICE_UI=true)
 * 2. DialerActivity — handles ACTION_DIAL (required for ROLE_DIALER qualification)
 * 3. InCallActivity — provides the in-call UI (hangup, speaker, mute, answer/decline)
 * 4. MANAGE_ONGOING_CALLS + USE_FULL_SCREEN_INTENT permissions
 */
function withInCallService(config) {
    return withAndroidManifest(config, async (config) => {
        const manifest = config.modResults;
        const application = manifest.manifest.application?.[0];

        if (!application) {
            console.warn('[withInCallService] No <application> found in manifest');
            return config;
        }

        // ── 0. Add required permissions ──
        if (!manifest.manifest['uses-permission']) {
            manifest.manifest['uses-permission'] = [];
        }
        const addPermission = (name) => {
            const exists = manifest.manifest['uses-permission'].some(
                (p) => p.$?.['android:name'] === name
            );
            if (!exists) {
                manifest.manifest['uses-permission'].push({
                    $: { 'android:name': name },
                });
                console.log(`[withInCallService] Added permission: ${name}`);
            }
        };
        addPermission('android.permission.MANAGE_ONGOING_CALLS');
        addPermission('android.permission.USE_FULL_SCREEN_INTENT');
        addPermission('android.permission.CALL_PHONE');

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
                            'android:value': 'true',
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

        // ── 3. InCallActivity (in-call UI) ──
        const inCallExists = application.activity.some(
            (act) => act.$?.['android:name'] === 'expo.modules.callmetrics.InCallActivity'
        );

        if (!inCallExists) {
            application.activity.push({
                $: {
                    'android:name': 'expo.modules.callmetrics.InCallActivity',
                    'android:exported': 'false',
                    'android:launchMode': 'singleTask',
                    'android:excludeFromRecents': 'true',
                    'android:showOnLockScreen': 'true',
                    'android:turnScreenOn': 'true',
                    'android:taskAffinity': 'expo.modules.callmetrics.incall',
                    'android:theme': '@android:style/Theme.NoTitleBar.Fullscreen',
                },
            });
            console.log('[withInCallService] Added InCallActivity to AndroidManifest');
        }

        return config;
    });
}

module.exports = withInCallService;
