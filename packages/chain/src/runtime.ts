import { UInt64 } from '@proto-kit/library';
import { ArkanoidGameHub } from './arkanoid/ArkanoidGameHub';
import { Poker } from './poker/Poker';
import { RandzuLogic } from './randzu/RandzuLogic';
import { ThimblerigLogic } from './thimblerig/ThimblerigLogic';
import { Balances } from './framework';
import { ModulesConfig } from '@proto-kit/common';

const modules = {
  ArkanoidGameHub,
  ThimblerigLogic,
  Balances,
  RandzuLogic,
  Poker,
};

const config: ModulesConfig<typeof modules> = {
  ArkanoidGameHub: {},
  ThimblerigLogic: {},
  Balances: {
    totalSupply: UInt64.from(10000),
  },
  RandzuLogic: {},
  Poker: {},
};

export default {
  modules,
  config,
};
