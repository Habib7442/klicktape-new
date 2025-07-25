/**
 * Polyfill Test Utility
 * Tests if required polyfills are working correctly
 */

export const testPolyfills = () => {
  const results = {
    EventTarget: false,
    Event: false,
    CustomEvent: false,
    AbortController: false,
    TextEncoder: false,
    TextDecoder: false,
    performance: false,
  };

  try {
    // Test EventTarget
    if (typeof global.EventTarget !== 'undefined') {
      const target = new global.EventTarget();
      target.addEventListener('test', () => {});
      results.EventTarget = true;
    }

    // Test Event
    if (typeof global.Event !== 'undefined') {
      const event = new global.Event('test');
      results.Event = true;
    }

    // Test CustomEvent
    if (typeof global.CustomEvent !== 'undefined') {
      const customEvent = new global.CustomEvent('test', { detail: 'test' });
      results.CustomEvent = true;
    }

    // Test AbortController
    if (typeof global.AbortController !== 'undefined') {
      const controller = new global.AbortController();
      results.AbortController = true;
    }

    // Test TextEncoder
    if (typeof global.TextEncoder !== 'undefined') {
      const encoder = new global.TextEncoder();
      encoder.encode('test');
      results.TextEncoder = true;
    }

    // Test TextDecoder
    if (typeof global.TextDecoder !== 'undefined') {
      const decoder = new global.TextDecoder();
      results.TextDecoder = true;
    }

    // Test performance
    if (typeof global.performance !== 'undefined') {
      global.performance.now();
      results.performance = true;
    }

    console.log('🧪 Polyfill Test Results:', results);
    
    const allPassed = Object.values(results).every(Boolean);
    if (allPassed) {
      console.log('✅ All polyfills are working correctly!');
    } else {
      console.warn('⚠️ Some polyfills are missing or not working:', 
        Object.entries(results).filter(([_, passed]) => !passed).map(([name]) => name)
      );
    }

    return results;
  } catch (error) {
    console.error('❌ Error testing polyfills:', error);
    return results;
  }
};

export default testPolyfills;
