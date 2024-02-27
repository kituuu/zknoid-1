import { createZkNoidGameConfig } from '@/lib/createConfig';
import { Poker } from 'zknoid-chain-dev';
import PokerPage from './components/PokerPage';

export const pokerConfig = createZkNoidGameConfig({
  id: 'poker',
  name: 'Poker card game',
  description:
    "Poker is comparing card game in which players wager over which hand is best according to that specific game's rules.",
  image: '/poker.webp',
  runtimeModules: {
    Poker,
  },
  page: PokerPage,
});
