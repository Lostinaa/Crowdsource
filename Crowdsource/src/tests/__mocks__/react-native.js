/**
 * Mock for react-native module
 * Used in Jest tests to avoid loading the actual native module
 */

module.exports = {
    Platform: {
        OS: 'android',
        select: (obj) => obj.android || obj.default,
    },
    StyleSheet: {
        create: (styles) => styles,
    },
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    Alert: {
        alert: jest.fn(),
    },
};
