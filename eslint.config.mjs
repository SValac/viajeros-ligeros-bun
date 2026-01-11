import antfu from '@antfu/eslint-config';

// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  antfu(
    {
      type: 'app',
      vue: true,
      formatters: true,
      stylistic: {
        indent: 2,
        semi: true,
        quotes: 'single',
      },
      ignores: ['./src/github/schema.docs.graphql', '**/migrations/*', 'TRAVEL_FEATURE.md', 'ARCHITECTURE_PLAN.md', 'FEATURE_ITINERARY_SERVICES.md'],
    },
    {
      rules: {
        'vue/max-attributes-per-line': ['error', {
          singleline: {
            max: 2,
          },
          multiline: {
            max: 1,
          },
        }],
        'ts/no-redeclare': 'off',
        'ts/consistent-type-definitions': ['error', 'type'],
        'no-console': ['off'],
        'antfu/no-top-level-await': ['off'],
        'node/prefer-global/process': ['off'],
        'node/no-process-env': ['error', { allowedVariables: ['NODE_ENV'] }],
        'perfectionist/sort-imports': [
          'error',
          {
            tsconfigRootDir: '.',
          },
        ],
        'unicorn/filename-case': [
          'error',
          {
            case: 'kebabCase',
            ignore: ['README.md', 'CLAUDE.md', 'TRAVEL_FEATURE.md', 'ARCHITECTURE_PLAN.md', 'FEATURE_ITINERARY_SERVICES.md'],
          },
        ],
      },
    },
  ),
  // Your custom configs here
);
