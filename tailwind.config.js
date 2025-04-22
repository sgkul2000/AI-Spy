import { join } from 'path';
import { skeleton } from '@skeletonlabs/tw-plugin';
import { undercover } from './src/theme';

export default {
  darkMode: 'class',
  content: [
    './src/**/*.{html,js,svelte,ts}',
    join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
  ],
  theme: {
    extend: {},
  },
  plugins: [
    skeleton({
      themes: { custom: [undercover] }
    })
  ]
};