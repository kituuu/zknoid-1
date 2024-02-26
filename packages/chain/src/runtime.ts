import { ArkanoidGameHub } from './arkanoid/ArkanoidGameHub';
import { Fool } from './fool/Fool';
import { Balances } from './framework/balances';
import { RandzuLogic } from './randzu/RandzuLogic';

export default {
    modules: {
        ArkanoidGameHub,
        Balances,
        RandzuLogic,
        Fool,
    },
    config: {
        ArkanoidGameHub: {},
        Balances: {},
        RandzuLogic: {},
        Fool: {},
    },
};
