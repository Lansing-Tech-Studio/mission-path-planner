// Polyfills for jsdom in Node.js
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Import jest-canvas-mock to stub canvas 2D context
require('jest-canvas-mock');

// Mock Image constructor for canvas image loading
global.Image = class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
  }
  
  set src(value) {
    this._src = value;
    // Simulate successful image load
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
  
  get src() {
    return this._src;
  }
};

// Mock URL.createObjectURL and revokeObjectURL for file exports
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock window.print for print tests
global.window.print = jest.fn();

// Suppress console errors during tests unless needed
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
