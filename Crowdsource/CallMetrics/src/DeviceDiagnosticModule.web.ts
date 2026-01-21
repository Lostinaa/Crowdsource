import { NativeModule } from 'expo';

class DeviceDiagnosticModule extends NativeModule {
  async checkLocationPermissions(): Promise<{
    fineLocation: boolean;
    backgroundLocation: boolean;
  }> {
    return { fineLocation: false, backgroundLocation: false };
  }

  async getFullDiagnostics(): Promise<Record<string, any>> {
    return {
      model: 'Web Browser',
      brand: 'Web',
      version: 'N/A',
      dataState: 'Unknown',
      netType: 'WiFi',
      lat: 'N/A',
      lon: 'N/A',
    };
  }
}

export default new DeviceDiagnosticModule();
export type { DeviceDiagnosticModule };

