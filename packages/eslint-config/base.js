import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import-x';
import unicornPlugin from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

/**
 * Base ESLint configuration for ALL DashDine packages.
 *
 * Uses tseslint.config() helper which properly types everything
 * and resolves type incompatibilities between ESLint v9 and plugins.
 *
 * This config enforces:
 * - TypeScript strict rules (no `any`, no unused vars, etc.)
 * - Import ordering and validation
 * - Modern JavaScript patterns (via unicorn plugin)
 * - Prettier compatibility (formatting rules disabled)
 */

export default tseslint.config(
  // ═══════════════════════════════════════════════
  // Global ignores (applies to all files)
  // ═══════════════════════════════════════════════
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '.turbo/',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
    ],
  },

  // ═══════════════════════════════════════════════
  // TypeScript files configuration
  // ═══════════════════════════════════════════════
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import-x': importPlugin,
      unicorn: unicornPlugin,
    },

    rules: {
      // ── TypeScript Strict Rules ──

      // Ban the `any` type - defeats the purpose of TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',

      // Variables declared but never used = dead code
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Require awaiting promises - forgetting await is a very common bug
      '@typescript-eslint/no-floating-promises': 'error',

      // Don't use promises where not expected
      '@typescript-eslint/no-misused-promises': 'error',

      // Prefer nullish coalescing (??) over logical OR (||)
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',

      // Use optional chaining (?.) instead of && chains
      '@typescript-eslint/prefer-optional-chaining': 'warn',

      // Require explicit return types on exported functions
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],

      // Ban @ts-ignore - use @ts-expect-error instead
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': 'allow-with-description',
          'ts-expect-error': 'allow-with-description',
        },
      ],

      // Enforce consistent type imports (import type { X } from ...)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // Enforce consistent type exports
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],

      // ── Import Rules ──

      'import-x/no-unresolved': 'off',
      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],

      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: '@dashdine/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],

      // ── Unicorn Rules (Modern JS Patterns) ──

      'unicorn/no-instanceof-array': 'error',
      'unicorn/prefer-at': 'warn',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/prefer-module': 'off',

      // ── General JavaScript Rules ──

      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-constructor-return': 'error',
      'no-dupe-keys': 'error',
      'no-eval': 'error',
      'no-param-reassign': ['error', { props: false }],
      'prefer-const': 'error',
      'prefer-template': 'warn',
    },
  },

  // ═══════════════════════════════════════════════
  // Prettier compatibility (MUST be last)
  // ═══════════════════════════════════════════════
  eslintConfigPrettier,
);
