import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.{ts,tsx}",
    "**/*.{spec,test}.{ts,tsx}",
  ],
  setupFiles: ["<rootDir>/src/tests/setup.ts"],
  moduleNameMapper: {
    "\\.(less|css)$": "<rootDir>/src/tests/styleMock.ts",
    "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/src/tests/fileMock.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
        jsx: "react-jsx",
      },
    ],
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/.umi/**",
    "!src/.umi-production/**",
    "!src/tests/**",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

export default config;
