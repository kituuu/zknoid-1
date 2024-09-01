import { createZkNoidGameConfig } from '@/lib/createConfig';
import { ZkNoidGameType } from '@/lib/platform/game_types';
import { RandzuLogic } from 'zknoid-chain-dev';
import { ZkNoidGameFeature, ZkNoidGameGenre } from '@/lib/platform/game_tags';
import PokerLobby from '@/games/pokerShowdown/components/PokerLobby';
import { LogoMode } from '@/app/constants/games';
import PokerShowdown from './PokerShowdown';

export const pokerShowdownConfig = createZkNoidGameConfig({
  id: 'pokershowdown',
  type: ZkNoidGameType.PVP,
  name: 'Poker Showdown',
  description:
    "Poker is comparing card game in which players wager over which hand is best according to that specific game's rules.",
  image: '/image/games/poker.jpg',
  logoMode: LogoMode.FULL_WIDTH,
  genre: ZkNoidGameGenre.Card,
  features: [ZkNoidGameFeature.Multiplayer],
  isReleased: true,
  releaseDate: new Date(2024, 8, 1),
  popularity: 50,
  author: 'Team Zkasino',
  rules: 'Poker rules',
  runtimeModules: {
    RandzuLogic,
  },
  page: PokerShowdown,
  lobby: PokerLobby,
});

export const pokerShowdownRedirectConfig = createZkNoidGameConfig({
  id: 'pokershowdown',
  type: ZkNoidGameType.PVP,
  name: 'Poker Showdown',
  description:
    "Poker is comparing card game in which players wager over which hand is best according to that specific game's rules.",
  image: '/image/games/poker.jpg',
  logoMode: LogoMode.FULL_WIDTH,
  genre: ZkNoidGameGenre.Card,
  features: [ZkNoidGameFeature.Multiplayer],
  isReleased: true,
  releaseDate: new Date(2024, 8, 1),
  popularity: 50,
  author: 'Team Zkasino',
  rules: 'Poker Rules',
  runtimeModules: {},
  page: undefined as any,
  lobby: undefined as any,
  externalUrl: 'https://proto.zknoid.io/games/pokershowdown/global',
});
