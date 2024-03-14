import { ArkanoidGameHub } from './arkanoid/ArkanoidGameHub';
import { Poker } from './poker/Poker';
import { Balances } from './framework/balances';
import { RandzuLogic } from './randzu/RandzuLogic';
import { ThimblerigLogic } from './thimblerig/ThimblerigLogic';

export default {
  modules: {
    ArkanoidGameHub,
    Balances,
    ThimblerigLogic,

    RandzuLogic,
    Poker,
  },
  config: {
    ArkanoidGameHub: {},
    Balances: {},
    ThimblerigLogic: {},

    RandzuLogic: {},
    Poker: {},
  },
};
