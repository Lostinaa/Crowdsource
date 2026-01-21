import { NativeModule, requireNativeModule } from 'expo';

import {
  CallDisconnectModuleEvents,
  CallDisconnectEventPayload,
} from './CallMetrics.types';

declare class CallDisconnectModule extends NativeModule<CallDisconnectModuleEvents> {
  isPermissionGranted(): boolean;
  startListening(): Promise<boolean>;
  stopListening(): Promise<boolean>;
}

// This call loads the native module object from the JSI.
const module = requireNativeModule<CallDisconnectModule>('CallDisconnectModule');

export default module;
export type { CallDisconnectEventPayload };






