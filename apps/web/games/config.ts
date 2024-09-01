// import { arkanoidConfig, arkanoidRedirectConfig } from './arkanoid/config';
// import { checkersConfig, checkersRedirectConfig } from './checkers/config';
// import { thimblerigConfig, thimblerigRedirectConfig } from './thimblerig/config';
// import { tileVilleConfig } from '@/games/tileville/config';
// import { lotteryConfig } from '@/games/lottery/config';

import { createConfig } from '@/lib/createConfig';

import { pokerConfig } from '@/games/poker/config';
import { pokerShowdownConfig } from './pokerShowdown/config';
export const zkNoidConfig = createConfig({
  games: [
    // lotteryConfig,
    // tileVilleConfig,
    // checkersConfig,
    // thimblerigConfig,
    // arkanoidConfig,
    pokerConfig,
    pokerShowdownConfig,
  ],
});
