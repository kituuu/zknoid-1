import { createConfig } from '@/lib/createConfig';

import { pokerShowdownConfig } from './pokerShowdown/config';
export const zkNoidConfig = createConfig({
  games: [pokerShowdownConfig],
});
