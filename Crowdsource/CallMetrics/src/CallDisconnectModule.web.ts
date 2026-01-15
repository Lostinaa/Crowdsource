import { registerWebModule, NativeModule } from 'expo';

import { CallDisconnectModuleEvents } from './CallMetrics.types';

class CallDisconnectModule extends NativeModule<CallDisconnectModuleEvents> {
  isPermissionGranted(): boolean {
    return false;
  }
  
  async startListening(): Promise<boolean> {
    return false;
  }
  
  async stopListening(): Promise<boolean> {
    return false;
  }
}

export default registerWebModule(CallDisconnectModule, 'CallDisconnectModule');






