export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupDb.js"],
  testTimeout: 30000,
  coverageProvider: "v8",
  collectCoverageFrom: [
    "app.js",
    "controllers/**/*.js",
    "middleware/**/*.js",
    "models/**/*.js",
    "routes/**/*.js",
    "utils/**/*.js",
  ],
  coverageDirectory: "coverage",
};
