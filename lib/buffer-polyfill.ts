// Buffer polyfill for React Native
import { Buffer as BufferPolyfill } from '@craftzdog/react-native-buffer';

// Make Buffer available globally
global.Buffer = global.Buffer || BufferPolyfill;

export { BufferPolyfill as Buffer };
