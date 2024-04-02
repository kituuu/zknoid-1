import { createZkNoidGameConfig } from '@/lib/createConfig';
import { Poker } from 'zknoid-chain-dev';
import PokerPage from './components/PokerPage';
import { ZkNoidGameFeature, ZkNoidGameGenre } from '@/lib/platform/game_tags';

export const pokerConfig = createZkNoidGameConfig({
  id: 'poker',
  name: 'Poker card game',
  author: 'ZkNoid team',
  description:
    "Poker is comparing card game in which players wager over which hand is best according to that specific game's rules.",
  image: '/poker.webp',
  rating: 666,
  genre: ZkNoidGameGenre.BoardGames,
  features: [ZkNoidGameFeature.Multiplayer],
  isReleased: false,
  releaseDate: new Date(2024, 0, 1),
  popularity: 50,
  runtimeModules: {
    Poker,
  },
  page: PokerPage,
});
