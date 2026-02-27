import { NativeModule, requireNativeModule } from 'expo';

import {
    CallDropBridgeModuleEvents,
    CallDropCausePayload,
} from './CallMetrics.types';

declare class CallDropBridgeModuleClass extends NativeModule<CallDropBridgeModuleEvents> {
    isCallRoleHeld(): boolean;
    requestCallRole(): Promise<boolean>;
}

// This call loads the native module object from the JSI.
const module = requireNativeModule<CallDropBridgeModuleClass>('CallDropBridgeModule');

export default module;
export type { CallDropCausePayload };
