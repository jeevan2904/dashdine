import nodeGlobals from 'globals';
import tseslint from 'typescript-eslint';

import baseConfig from './base.js';

/**
 * ESLint configuration for Node.js backend services.
 *
 * Extends the base config with:
 * - Node.js global variables (process, Buffer, __dirname, etc.)
 * - Node.js-specific rules
 *
 * Usage in a service:
 *   // eslint.config.js
 *   export { default } from '@dashdine/eslint-config/node';
 */

export default tseslint.config(
  // Spread all base configs (TypeScript, imports, unicorn, prettier)
  ...baseConfig,

  // Add Node.js-specific settings
  {
    files: ['**/*.ts'],

    languageOptions: {
      globals: {
        ...nodeGlobals.node,
      },
    },

    rules: {
      // In backend services, console is replaced by our logger package.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Allow require() in specific cases (dynamic imports, config files)
      '@typescript-eslint/no-require-imports': 'warn',

      // Relax explicit return types slightly for backend event handlers
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],
    },
  },
);
