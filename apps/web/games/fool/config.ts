import { createZkNoidGameConfig } from '@/lib/createConfig';
import { Fool } from 'zknoid-chain-dev';
import FoolPage from './components/FoolPage';

export const foolConfig = createZkNoidGameConfig({
  id: 'fool',
  name: 'Fool card game',
  description:
    'The objective of the game is to shed all one\'s cards when there are no more cards left in the deck. At the end of the game, the last player with cards in their hand is the durak or "fool"',
  image: '/fool.jpg',
  runtimeModules: {
    Fool,
  },
  page: FoolPage,
});
