import { createConfig } from '@/lib/createConfig';
import { arkanoidConfig } from './arkanoid/config';
import { randzuConfig } from './randzu/config';
import { foolConfig } from './fool/config';

export const zkNoidConfig = createConfig({
  games: [arkanoidConfig, randzuConfig, foolConfig],
});
