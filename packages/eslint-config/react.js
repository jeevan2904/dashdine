import browserGlobals from 'globals';
import tseslint from 'typescript-eslint';

import baseConfig from './base.js';

/**
 * ESLint configuration for React frontend applications.
 *
 * Extends the base config with:
 * - Browser global variables (window, document, fetch, etc.)
 * - React-specific rules (will add react plugin when we build frontends)
 *
 * Usage in a frontend app:
 *   // eslint.config.js
 *   export { default } from '@dashdine/eslint-config/react';
 */

export default tseslint.config(
  // Spread all base configs
  ...baseConfig,

  // Add browser-specific settings
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      globals: {
        ...browserGlobals.browser,
      },
    },

    rules: {
      // In frontend, console.log is acceptable for development
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // Relax explicit return types for React components
      '@typescript-eslint/explicit-function-return-type': 'off',

      // Allow non-null assertions in React (e.g., ref.current!)
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
);
