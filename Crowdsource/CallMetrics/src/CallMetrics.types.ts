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
