import { NativeModule, requireNativeModule } from 'expo';

declare class DeviceDiagnosticModule extends NativeModule {
  checkLocationPermissions(): Promise<{
    fineLocation: boolean;
    backgroundLocation: boolean;
  }>;
  getFullDiagnostics(): Promise<{
    model?: string;
    brand?: string;
    version?: string;
    dataState?: string;
    dataActivity?: string;
    callState?: string;
    simState?: string;
    isRoaming?: string;
    operator?: string;
    lat?: string;
    lon?: string;
    alt?: string;
    accuracy?: string;
    netType?: string;
    enb?: string;
    eci?: string;
    cellId?: string;
    tac?: string;
    pci?: string;
    rsrp?: string;
    rsrq?: string;
    rssnr?: string;
    cqi?: string;
  }>;
}

const module = requireNativeModule<DeviceDiagnosticModule>('DeviceDiagnosticModule');

export default module;
export type { DeviceDiagnosticModule };

