// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
      '**/*.js',
      '**/*.mjs',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // RED TEST: This rule should fail on existing `as any` usages
      // Issue: workers-lsgq.1 - GitStore uses `as any` to access ctx
      // The rule catches ALL `as any` type assertions which is overly strict
      // but necessary for TDD RED phase to demonstrate the problem
      '@typescript-eslint/no-explicit-any': 'error',

      // Allow unused vars with underscore prefix (common pattern)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  // RED TEST: DO class max-lines enforcement
  // Issue: workers-kupw.1 - DO class > 1000 lines (lint rule)
  // Epic: workers-kupw - Architecture Refactoring
  //
  // This rule enforces a strict 100-line limit per file (excluding blanks/comments)
  // to drive architectural refactoring. The goal is single-responsibility classes.
  //
  // Current status (after skipBlankLines/skipComments):
  //   - agent.ts: ~126 meaningful lines (FAILS)
  //   - schema.ts: ~200+ meaningful lines (FAILS)
  //   - json-rpc.ts: ~130 meaningful lines (FAILS)
  //   - core.ts: ~60 meaningful lines (PASSES)
  //
  // The GREEN phase will extract mixins (CRUDMixin, ThingsMixin, EventsMixin,
  // ActionsMixin) to bring files under the limit.
  {
    files: ['packages/do-core/src/**/*.ts'],
    rules: {
      'max-lines': ['error', {
        max: 100,
        skipBlankLines: true,
        skipComments: true,
      }],
    },
  }
)
