/**
 * Shared call state between dialer.js and voice.tsx.
 * When the user initiates an outgoing call via makeCall(),
 * we record the timestamp so voice.tsx can compute accurate setup time.
 */

let _callInitiatedAt = null;

export const setCallInitiatedAt = (timestamp = Date.now()) => {
  _callInitiatedAt = timestamp;
};

export const getCallInitiatedAt = () => _callInitiatedAt;

export const clearCallInitiatedAt = () => {
  _callInitiatedAt = null;
};
