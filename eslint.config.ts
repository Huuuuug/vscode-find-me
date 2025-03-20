import ganghu from '@ganghu/eslint-config'

export default ganghu(
  {
    typescript: true,
    vue: true,
    overrides: {
      typescript: {
        'no-console': 'warn',
      },
    },
  },
  {
    ignores: ['node_modules'],
  },
)
