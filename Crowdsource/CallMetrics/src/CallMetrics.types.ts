import type { StyleProp, ViewStyle } from 'react-native';

export type OnLoadEventPayload = {
  url: string;
};

export type CallStateChangePayload = {
  state: 'idle' | 'ringing' | 'offhook' | 'unknown';
  timestamp: number;
  phoneNumber: string;
};

export type CallMetricsModuleEvents = {
  'callMetrics:update': (params: CallStateChangePayload) => void;
};

export type CallMetricsViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};

export type CallDisconnectEventPayload = {
  causeCode: number;
  causeLabel: string;
  timestamp: number;
  duration: number;
  callType: number;
  phoneNumber: string;
  source: string;
};

export type CallDisconnectModuleEvents = {
  'CallDisconnectEvent': (params: CallDisconnectEventPayload) => void;
};

// ── InCallService-based disconnect cause (real DisconnectCause from Telecom API) ──
export type CallDropCausePayload = {
  causeCode: number;      // DisconnectCause code (1=LOCAL, 2=REMOTE, 3=ERROR, etc.)
  causeLabel: string;     // Human-readable label (LOCAL, REMOTE, ERROR, MISSED, etc.)
  causeDescription: string;
  callDurationMs: number;
  source: string;         // Always 'incallservice'
};

export type CallDropBridgeModuleEvents = {
  'CallDropCauseEvent': (params: CallDropCausePayload) => void;
};
