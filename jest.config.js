module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.spec.js',
    '<rootDir>/tests/integration/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'js/**/*.js',
    'app.js',
    '!js/**/*.spec.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 23,
      lines: 27,
      statements: 27
    }
  }
};
