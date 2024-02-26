export interface IGame {
  id: string;
  logo: string;
  name: string;
  description: string;
  tags: string[];
  defaultPage: string;
  active: boolean;
}

export const announcedGames: IGame[] = [
  {
    id: 'checkers',
    logo: '/checkers.webp',
    name: 'Checkers game',
    description: 'Compete other players in the classic board game',
    tags: ['L2 game', 'multiplayer', 'board games'],
    defaultPage: 'global',
    active: false,
  },
];

export const defaultGames: IGame[] = [
  {
    id: 'arkanoid',
    logo: '/Arkanoid.png',
    name: 'Arkanoid game',
    description:
      'Old but gold game. Beat all the bricks and protect the ball from falling',
    tags: ['L2 game', 'singleplayer', 'retro'],
    defaultPage: 'competitions-list',
    active: true,
  },
  {
    id: 'randzu',
    logo: '/randzu.jpeg',
    name: 'Randzu game',
    description:
      'Two players take turns placing pieces on the board attempting to create lines of 5 of their own color',
    tags: ['L2 game', 'multiplayer', 'board games'],
    defaultPage: 'global',
    active: true,
  },
  {
    id: 'fool',
    logo: '/fool.jpg',
    name: 'Fool card game',
    description:
      'The objective of the game is to shed all one\'s cards when there are no more cards left in the deck. At the end of the game, the last player with cards in their hand is the durak or "fool".',
    tags: ['L2 game', 'multiplayer', 'card games'],
    defaultPage: 'global',
    active: true,
  },
];
