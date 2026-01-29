/**
 * Mock for expo-device module
 * Used in Jest tests to avoid loading the actual native module
 */

module.exports = {
    isDevice: false,
    brand: 'MockBrand',
    manufacturer: 'MockManufacturer',
    modelName: 'MockModel',
    osName: 'MockOS',
    osVersion: '1.0.0',
    deviceType: 1,
};
