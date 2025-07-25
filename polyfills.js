/**
 * Enhanced Polyfills for React Native Hermes Engine
 * Required for TanStack Query v5 and other web APIs
 * Based on successful implementation patterns
 */

// Ensure global object exists and is accessible
if (typeof global === 'undefined') {
  var global = globalThis || this || window;
}

// Immediate polyfill application - run synchronously
(function() {
  'use strict';

// More robust EventTarget polyfill for TanStack Query
if (typeof global.EventTarget === 'undefined') {
  global.EventTarget = class EventTarget {
    constructor() {
      this.listeners = new Map();
    }

    addEventListener(type, listener, options = {}) {
      if (typeof type !== 'string' || typeof listener !== 'function') {
        return;
      }

      if (!this.listeners.has(type)) {
        this.listeners.set(type, []);
      }

      const listenerObj = {
        listener,
        options: typeof options === 'boolean' ? { capture: options } : options
      };

      this.listeners.get(type).push(listenerObj);
    }

    removeEventListener(type, listener, options = {}) {
      if (!this.listeners.has(type)) return;

      const listeners = this.listeners.get(type);
      const index = listeners.findIndex(item => item.listener === listener);

      if (index !== -1) {
        listeners.splice(index, 1);
      }

      if (listeners.length === 0) {
        this.listeners.delete(type);
      }
    }

    dispatchEvent(event) {
      if (!event || typeof event.type !== 'string') return false;

      const listeners = this.listeners.get(event.type);
      if (!listeners || listeners.length === 0) return true;

      // Set event target
      Object.defineProperty(event, 'target', {
        value: this,
        writable: false
      });

      Object.defineProperty(event, 'currentTarget', {
        value: this,
        writable: false
      });

      // Call listeners
      for (const { listener, options } of [...listeners]) {
        try {
          if (options && options.once) {
            this.removeEventListener(event.type, listener);
          }

          if (typeof listener === 'function') {
            listener.call(this, event);
          } else if (listener && typeof listener.handleEvent === 'function') {
            listener.handleEvent(event);
          }
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }

      return !event.defaultPrevented;
    }
  };

  // Also set on window if it exists
  if (typeof window !== 'undefined') {
    window.EventTarget = global.EventTarget;
  }
}

// Enhanced Event polyfill
if (typeof global.Event === 'undefined') {
  global.Event = class Event {
    constructor(type, eventInitDict = {}) {
      if (typeof type !== 'string') {
        throw new TypeError('Event type must be a string');
      }

      this.type = type;
      this.bubbles = Boolean(eventInitDict.bubbles);
      this.cancelable = Boolean(eventInitDict.cancelable);
      this.composed = Boolean(eventInitDict.composed);
      this.currentTarget = null;
      this.defaultPrevented = false;
      this.eventPhase = 0; // Event.NONE
      this.isTrusted = false;
      this.target = null;
      this.timeStamp = Date.now();
      this._stopPropagation = false;
      this._stopImmediatePropagation = false;
    }

    preventDefault() {
      if (this.cancelable) {
        this.defaultPrevented = true;
      }
    }

    stopPropagation() {
      this._stopPropagation = true;
    }

    stopImmediatePropagation() {
      this._stopPropagation = true;
      this._stopImmediatePropagation = true;
    }
  };

  // Event phase constants
  global.Event.NONE = 0;
  global.Event.CAPTURING_PHASE = 1;
  global.Event.AT_TARGET = 2;
  global.Event.BUBBLING_PHASE = 3;

  if (typeof window !== 'undefined') {
    window.Event = global.Event;
  }
}

// CustomEvent polyfill
if (typeof global.CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent extends global.Event {
    constructor(type, eventInitDict = {}) {
      super(type, eventInitDict);
      this.detail = eventInitDict.detail || null;
    }
  };
}

// AbortController polyfill (if not already available)
if (typeof global.AbortController === 'undefined') {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
        onabort: null,
      };
    }

    abort() {
      this.signal.aborted = true;
      if (this.signal.onabort) {
        this.signal.onabort();
      }
    }
  };

  global.AbortSignal = class AbortSignal extends global.EventTarget {
    constructor() {
      super();
      this.aborted = false;
      this.onabort = null;
    }

    static abort() {
      const signal = new AbortSignal();
      signal.aborted = true;
      return signal;
    }
  };
}

// TextEncoder/TextDecoder polyfills (if needed)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(input = '') {
      const utf8 = [];
      for (let i = 0; i < input.length; i++) {
        let charCode = input.charCodeAt(i);
        if (charCode < 0x80) {
          utf8.push(charCode);
        } else if (charCode < 0x800) {
          utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
        } else if (charCode < 0xd800 || charCode >= 0xe000) {
          utf8.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
        } else {
          i++;
          charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
          utf8.push(
            0xf0 | (charCode >> 18),
            0x80 | ((charCode >> 12) & 0x3f),
            0x80 | ((charCode >> 6) & 0x3f),
            0x80 | (charCode & 0x3f)
          );
        }
      }
      return new Uint8Array(utf8);
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(input) {
      let result = '';
      const bytes = new Uint8Array(input);
      for (let i = 0; i < bytes.length; i++) {
        result += String.fromCharCode(bytes[i]);
      }
      return result;
    }
  };
}

// Performance polyfill (basic implementation)
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
  };
}

  console.log('✅ Polyfills loaded successfully for React Native Hermes');

  // Test polyfills in development
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Simple test to verify EventTarget is working
    try {
      const testTarget = new global.EventTarget();
      testTarget.addEventListener('test', () => {});
      console.log('✅ EventTarget polyfill is working');
    } catch (error) {
      console.error('❌ EventTarget polyfill failed:', error);
    }
  }

})(); // Close the immediate function

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EventTarget: global.EventTarget,
    Event: global.Event,
    CustomEvent: global.CustomEvent,
    AbortController: global.AbortController,
  };
}
