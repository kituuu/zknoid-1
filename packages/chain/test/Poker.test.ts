import { AppChain, TestingAppChain } from '@proto-kit/sdk';
import { Field, Int64, PrivateKey, PublicKey, UInt64 } from 'o1js';
import { log } from '@proto-kit/common';
import { Pickles } from 'o1js/dist/node/snarky';
import { dummyBase64Proof } from 'o1js/dist/node/lib/proof_system';
import {
  Balances,
  Card,
  Combination,
  GameIndex,
  GameInfo,
  GameStatus,
  POKER_DECK_SIZE,
  PermutationMatrix,
  Poker,
} from '../src';
import {
  ShuffleProof,
  ShuffleProofPublicInput,
  shuffle,
} from '../src/poker/ShuffleProof';
import {
  InitialOpen,
  InitialOpenProof,
  InitialOpenPublicInput,
  PublicOpenProof,
  PublicOpenPublicInput,
  proveInitialOpen,
  provePublicOpen,
} from '../src/poker/DecryptProof';
import { Runtime } from '@proto-kit/module';
import {
  CombProposal,
  CombPublicInput,
  CombinationProof,
  proveCombinations,
} from '../src/poker/CombProof';
import { error } from 'console';
import { getTestAccounts } from './utils';

log.setLevel('ERROR');

const skipBlocks = async (
  amount: number,
  appChain: TestingAppChain<any, any, any, any>,
) => {
  for (let i = 0; i < amount; i++) {
    await appChain.produceBlock();
  }
};

export async function mockProof<I, O, P>(
  publicOutput: O,
  ProofType: new ({
    proof,
    publicInput,
    publicOutput,
    maxProofsVerified,
  }: {
    proof: unknown;
    publicInput: I;
    publicOutput: any;
    maxProofsVerified: 0 | 2 | 1;
  }) => P,
  publicInput: I,
): Promise<P> {
  const [, proof] = Pickles.proofOfBase64(await dummyBase64Proof(), 2);
  return new ProofType({
    proof: proof,
    maxProofsVerified: 2,
    publicInput,
    publicOutput,
  });
}

interface IndexedCard {
  card: Card;
  index: number;
}

const combinationFinder = (cards: Card[]): ICombination[] => {
  let indexedCards = cards.map((card, index) => {
    return {
      card,
      index,
    };
  });
  let res: ICombination[] = [];

  indexedCards.sort((a, b) => +Int64.from(a.card.value).sub(b.card.value)); // lowest to highest

  res.push(...checkStarightFlush(indexedCards));
  res.push(...checkFour(indexedCards));
  res.push(...checkFullHouse(indexedCards));
  res.push(...checkFlush(indexedCards));
  res.push(...checkStraight(indexedCards));
  res.push(...checkThree(indexedCards));
  res.push(...checkTwo(indexedCards));
  res.push(...checkHigh(indexedCards));

  // Remove combinations, so only 5 card is using
  let i = 0;
  let cardUsed = 0;
  for (i; i < res.length; i++) {
    if (cardUsed >= 5) {
      break;
    }
    cardUsed += res[i].indexes.length;
  }

  return res.slice(0, i);
};

const checkStarightFlush = (cards: IndexedCard[]): ICombination[] => {
  if (cards.length < 5) {
    return [];
  }

  for (let i = 0; i < cards.length - 4; i++) {
    let j = 1;
    for (; j < 5; j++) {
      if (
        cards[i + j].card.value
          .add(1)
          .equals(cards[i + j - 1].card.value)
          .not()
          .toBoolean() ||
        cards[i + j].card.color
          .equals(cards[i + j - 1].card.color)
          .not()
          .toBoolean()
      ) {
        break;
      }
    }

    if (j == 5) {
      let combinationCards = cards.splice(i, 5);
      return [
        {
          id: +Combination.straightFlushId.toString(),
          indexes: combinationCards.map((card) => card.index),
        },
      ];
    }
  }

  return [];
};

const checkFour = (cards: IndexedCard[]): ICombination[] => {
  if (cards.length < 4) {
    return [];
  }

  for (let i = 0; i < cards.length - 3; i++) {
    let j = 1;
    for (; j < 4; j++) {
      if (
        cards[i + j].card.value
          .equals(cards[i + j - 1].card.value)
          .not()
          .toBoolean()
      ) {
        break;
      }
    }

    if (j == 4) {
      let combinationCards = cards.splice(i, 4);
      return [
        {
          id: +Combination.fourId.toString(),
          indexes: combinationCards.map((card) => card.index),
        },
      ];
    }
  }

  return [];
};

const checkFullHouse = (cards: IndexedCard[]): ICombination[] => {
  let cardsCopy = [...cards];

  let threeSearchResult = checkThree(cardsCopy);
  let twoSearchResult = checkTwo(cardsCopy, false);

  if (threeSearchResult.length == 1 && twoSearchResult.length == 1) {
    cards = cardsCopy;
    return [
      {
        id: +Combination.fullHouseId.toString(),
        indexes: threeSearchResult[0].indexes.concat(
          twoSearchResult[0].indexes,
        ),
      },
    ];
  }

  return [];
};

const checkFlush = (cards: IndexedCard[]): ICombination[] => {
  let colorsToIndexes: { [color: string]: number[] } = {
    '0': [],
    '1': [],
    '2': [],
    '3': [],
  };

  cards.forEach((iCard) => {
    colorsToIndexes[iCard.card.color.toString()].push(iCard.index);
  });

  for (let color in colorsToIndexes) {
    if (colorsToIndexes[color].length >= 4) {
      let indexes = colorsToIndexes[color].slice(-4); // Pick highest 4 cards
      let newCards = cards.filter((card) => !indexes.includes(card.index));
      cards.length = 0;
      cards.push(...newCards);

      return [
        {
          id: +Combination.flushId.toString(),
          indexes,
        },
      ];
    }
  }

  return [];
};

const checkStraight = (cards: IndexedCard[]): ICombination[] => {
  if (cards.length < 5) {
    return [];
  }

  for (let i = 0; i < cards.length - 4; i++) {
    let j = 1;
    for (; j < 5; j++) {
      if (
        cards[i + j].card.value
          .equals(cards[i + j - 1].card.value.add(1))
          .not()
          .toBoolean()
      ) {
        break;
      }
    }

    if (j == 5) {
      let combinationCards = cards.splice(i, 5);
      return [
        {
          id: +Combination.straightId.toString(),
          indexes: combinationCards.map((card) => card.index),
        },
      ];
    }
  }

  return [];
};
const checkThree = (cards: IndexedCard[]): ICombination[] => {
  if (cards.length < 3) {
    return [];
  }

  for (let i = 0; i < cards.length - 2; i++) {
    let first = cards[i].card;
    let second = cards[i + 1].card;
    let third = cards[i + 2].card;
    if (
      first.value
        .equals(second.value)
        .and(first.value.equals(third.value))
        .toBoolean()
    ) {
      let combCards = cards.splice(i, 3);
      return [
        {
          id: +Combination.threeId.toString(),
          indexes: combCards.map((card) => card.index),
        },
      ];
    }
  }

  return [];
};

const checkTwo = (
  cards: IndexedCard[],
  allowSeveral = true,
): ICombination[] => {
  let res: ICombination[] = [];
  if (cards.length < 2) {
    return res;
  }

  for (let i = 0; i < cards.length - 1; i++) {
    let first = cards[i].card;
    let second = cards[i + 1].card;
    if (first.value.equals(second.value).toBoolean()) {
      let combCards = cards.splice(i, 2);
      res.push({
        id: +Combination.twoPairId.toString(),
        indexes: combCards.map((card) => card.index),
      });
      if (!allowSeveral) {
        return res;
      }
    }
  }

  return res;
};

const checkHigh = (cards: IndexedCard[]): ICombination[] => {
  return cards
    .map((card) => {
      return {
        id: +Combination.highId,
        indexes: [card.index],
      };
    })
    .reverse(); // Reverse so highest card go first
};

describe('Combination finder tests', () => {
  it('Finds two, three, four', () => {
    let cards = [...Array(4)].map((_, index) => Card.from(2, index));

    let twoComb = combinationFinder(cards.slice(0, 2));

    expect(twoComb.length).toBe(1);
    expect(twoComb[0].id).toBe(+Combination.twoPairId);

    let threeComb = combinationFinder(cards.slice(0, 3));

    expect(threeComb.length).toBe(1);
    expect(threeComb[0].id).toBe(+Combination.threeId);

    let fourComb = combinationFinder(cards.slice(0, 4));

    expect(fourComb.length).toBe(1);
    expect(fourComb[0].id).toBe(+Combination.fourId);
  });

  it('Finds flush', () => {
    let cards = [...Array(4)].map((_, index) => Card.from(index, 2));

    let flushComb = combinationFinder(cards);

    expect(flushComb.length).toBe(1);
    expect(flushComb[0].id).toBe(+Combination.flushId);
  });
  it('Finds straight', () => {
    let cards = [...Array(5)].map((_, index) => Card.from(index, index % 4));

    let straightComb = combinationFinder(cards);

    expect(straightComb.length).toBe(1);
    expect(straightComb[0].id).toBe(+Combination.straightId);
  });

  it('Finds mix', () => {
    let cards = Array(6);
    cards[0] = Card.from(2, 0);
    cards[1] = Card.from(2, 1);
    cards[2] = Card.from(2, 2);

    cards[3] = Card.from(5, 0);
    cards[4] = Card.from(6, 1);
    cards[5] = Card.from(7, 2);

    let mixedComb = combinationFinder(cards); // Tree + 2 high

    expect(mixedComb.length).toBe(3);
    expect(mixedComb[0].id).toBe(+Combination.threeId);
    expect(mixedComb[1].id).toBe(+Combination.highId);
    expect(mixedComb[2].id).toBe(+Combination.highId);
  });
});

/*
class PokerHelper {
  appChain: TestingAppChain<any, any>;
  poker: Poker;
  constructor(appChain: TestingAppChain<{ Poker: Poker }, any>, poker: Poker) {
    this.appChain = appChain;
    this.poker = poker;
  }

  sendShuffle() {}

  async getGameInfo(gameId: GameInfo): Promise<GameInfo> {
    let game = await this.appChain.query.runtime.Poker.games.get(gameId);

    if (!game) {
      throw Error('No game found');
    }

    return game;
  }
}
*/

// const getGame = async (appChain: AppChain, gameId: UInt64)

const sendShuffle = async (
  appChain: TestingAppChain<any, any, any, any>,
  poker: Poker,
  game: GameInfo,
  permutation: PermutationMatrix,
  senderPrivateKey: PrivateKey,
) => {
  appChain.setSigner(senderPrivateKey);
  let sender = senderPrivateKey.toPublicKey();
  let shuffleInput = new ShuffleProofPublicInput({
    initialDeck: game.deck,
    agrigatedPubKey: game.agrigatedPubKey,
  });

  let noises = [...Array(POKER_DECK_SIZE)].map(() => Field.from(1));
  let shuffleOutput = shuffle(shuffleInput, permutation, noises);

  let shuffleProof = await mockProof(shuffleOutput, ShuffleProof, shuffleInput);

  {
    const tx = await appChain.transaction(sender, () => {
      poker.setup(game.meta.id, shuffleProof);
    });
    await tx.sign();
    await tx.send();
  }

  let block = await appChain.produceBlock();
  expect(block?.transactions[0].status.toBoolean()).toBeTruthy();
};

const sendBid = async (
  appChain: TestingAppChain<any, any, any, any>,
  poker: Poker,
  game: GameInfo,
  senderPrivateKey: PrivateKey,
  amount: UInt64,
) => {
  appChain.setSigner(senderPrivateKey);
  let sender = senderPrivateKey.toPublicKey();
  const tx = await appChain.transaction(sender, () => {
    poker.bid(game.meta.id, amount);
  });
  await tx.sign();
  await tx.send();

  let block = await appChain.produceBlock();
  expect(block?.transactions[0].status.toBoolean()).toBeTruthy();
};

const sendInitialOpen = async (
  appChain: TestingAppChain<any, any, any, any>,
  poker: Poker,
  game: GameInfo,
  senderPrivateKey: PrivateKey,
  playerIndex: UInt64,
) => {
  appChain.setSigner(senderPrivateKey);
  let sender = senderPrivateKey.toPublicKey();

  let publicInput = new InitialOpenPublicInput({
    deck: game.deck,
    playerIndex,
  });
  let publicOutput = proveInitialOpen(publicInput, senderPrivateKey);
  let proof = await mockProof(publicOutput, InitialOpenProof, publicInput);

  {
    const tx = await appChain.transaction(sender, () => {
      poker.initialOpen(game.meta.id, proof);
    });
    await tx.sign();
    await tx.send();
  }

  let block = await appChain.produceBlock();
  expect(block?.transactions[0].status.toBoolean()).toBeTruthy();
};

const sendNextOpen = async (
  appChain: TestingAppChain<any, any, any, any>,
  poker: Poker,
  game: GameInfo,
  senderPrivateKey: PrivateKey,
  round: UInt64,
) => {
  appChain.setSigner(senderPrivateKey);
  let sender = senderPrivateKey.toPublicKey();
  let publicInput = new PublicOpenPublicInput({
    deck: game.deck,
    round,
  });
  let publicOutput = provePublicOpen(publicInput, senderPrivateKey);
  let proof = await mockProof(publicOutput, PublicOpenProof, publicInput);

  {
    const tx = await appChain.transaction(sender, () => {
      poker.openNext(game.meta.id, proof);
    });
    await tx.sign();
    await tx.send();
  }

  let block = await appChain.produceBlock();
  expect(block?.transactions[0].status.toBoolean()).toBeTruthy();
};

interface ICombination {
  id: number;
  indexes: number[];
}

const sendCombinations = async (
  appChain: TestingAppChain<any, any, any, any>,
  poker: Poker,
  game: GameInfo,
  senderPrivateKey: PrivateKey,
  combinations: ICombination[],
  playerIndex: number,
) => {
  if (combinations.length > 6) {
    throw Error('To much combinations');
  }

  appChain.setSigner(senderPrivateKey);
  let sender = senderPrivateKey.toPublicKey();

  const fillIndexesToFull = (arr: number[]): number[] => {
    if (arr.length > 5) {
      throw error('To much elements for combination');
    }
    let emptyAmount = 5 - arr.length;

    return arr.concat(...Array(emptyAmount).fill(-1));
  };

  let combinationProposals = combinations.map(
    (combination) =>
      new CombProposal({
        proposedComb: UInt64.from(combination.id),
        indexes: fillIndexesToFull(combination.indexes).map((elem) =>
          Int64.from(elem),
        ),
      }),
  );

  let emptyProposalsLeft = 6 - combinationProposals.length;
  combinationProposals.push(
    ...Array(emptyProposalsLeft).fill(CombProposal.empty()),
  );

  let encryptedCardsPrepared = game.deck.cards
    .slice(0, 5)
    .concat(
      game.deck.cards.slice(5 + 2 * playerIndex, 5 + 2 * playerIndex + 2),
    );
  encryptedCardsPrepared[5].decrypt(senderPrivateKey);
  encryptedCardsPrepared[6].decrypt(senderPrivateKey);

  let cardsPrepared = encryptedCardsPrepared.map((ec) => ec.toCard());

  let publicInput = new CombPublicInput({
    encryptedCards: encryptedCardsPrepared,
    cards: cardsPrepared,
    combinationProposals,
  });

  let publiOutput = proveCombinations(publicInput);

  let proof = await mockProof(publiOutput, CombinationProof, publicInput);

  {
    const tx = await appChain.transaction(sender, () => {
      poker.sendResult(game.meta.id, UInt64.from(playerIndex), proof);
    });
    await tx.sign();
    await tx.send();
  }

  let block = await appChain.produceBlock();
  expect(block?.transactions[0].status.toBoolean()).toBeTruthy();
};

describe.skip('Poker', () => {
  it('Two players basic case', async () => {
    const appChain = TestingAppChain.fromRuntime({
      Poker,
      Balances,
    });

    appChain.configurePartial({
      Runtime: {
        Poker: {},
        Balances: {
          totalSupply: UInt64.from(10000),
        },
      },
    });

    const players = getTestAccounts(2);

    const [alice, bob] = players;

    await appChain.start();

    const poker = appChain.runtime.resolve('Poker');

    console.log('Finding match');

    const LobbyId = UInt64.from(1);

    for (const player of players) {
      appChain.setSigner(player.privateKey);
      const tx1 = await appChain.transaction(player.publicKey, () => {
        poker.joinLobby(LobbyId);
      });
      await tx1.sign();
      await tx1.send();

      let block = await appChain.produceBlock();
      expect(block?.transactions[0].status.toBoolean()).toBeTruthy();
    }

    appChain.setSigner(alice.privateKey);
    const tx1 = await appChain.transaction(alice.publicKey, () => {
      poker.startGame(LobbyId);
    });

    await tx1.sign();
    await tx1.send();

    await appChain.produceBlock();

    const gameId = UInt64.from(1);
    const aliceGameId = await appChain.query.runtime.Poker.activeGameId.get(
      alice.publicKey,
    );
    const bobGameId = await appChain.query.runtime.Poker.activeGameId.get(
      bob.publicKey,
    );

    expect(aliceGameId!.equals(bobGameId!).toBoolean()).toBeTruthy();
    expect(aliceGameId!.equals(gameId).toBoolean()).toBeTruthy();

    const aliceKey = new GameIndex({
      gameId,
      index: UInt64.from(0),
    });

    const bobKey = new GameIndex({
      gameId,
      index: UInt64.from(1),
    });

    const getGame = async (): Promise<GameInfo> => {
      return (await appChain.query.runtime.Poker.games.get(gameId))!;
    };

    let game = await getGame();

    console.log('Setup');
    for (const player of players) {
      game = await getGame();
      const permutation = PermutationMatrix.getZeroMatrix();

      await sendShuffle(appChain, poker, game, permutation, player.privateKey);
    }

    console.log('First turn');
    // Fist turn

    for (const [index, player] of players.entries()) {
      game = await getGame();
      await sendInitialOpen(
        appChain,
        poker,
        game,
        player.privateKey,
        UInt64.from(index),
      );
    }

    game = await getGame();

    expect(game.inBid().toBoolean()).toBeTruthy();

    // First turn bid

    for (const player of players) {
      await sendBid(appChain, poker, game, player.privateKey, UInt64.from(1));
    }

    game = await getGame();
    expect(game.round.bank.equals(UInt64.from(2)).toBoolean()).toBeTruthy();
    expect(game.round.index.equals(UInt64.from(1)).toBoolean()).toBeTruthy();

    // Second turn - Fourth turns
    for (let i = 1; i < 4; i++) {
      console.log(i);
      let round = UInt64.from(i);
      game = await getGame();

      expect(game.inReveal().toBoolean()).toBeTruthy();
      for (const player of players) {
        game = await getGame();
        await sendNextOpen(appChain, poker, game, player.privateKey, round);
      }

      game = await getGame();
      expect(game.inBid().toBoolean()).toBeTruthy();
      for (const player of players) {
        game = await getGame();
        await sendBid(appChain, poker, game, player.privateKey, UInt64.from(1));
      }
    }

    // Combinations proofs:
    //    First player: 4th and highest card
    //    Second player: 4th and highest card

    // First
    let firstCombinations: ICombination[] = [
      {
        id: +Combination.fourId.toString(),
        indexes: [0, 1, 2, 3],
      },
      {
        id: +Combination.highId,
        indexes: [6],
      },
    ];

    let secondCombinations = [
      {
        id: +Combination.fourId.toString(),
        indexes: [0, 1, 2, 3],
      },
      {
        id: +Combination.highId,
        indexes: [8],
      },
    ];

    game = await getGame();

    await sendCombinations(
      appChain,
      poker,
      game,
      alice.privateKey,
      firstCombinations,
      0,
    );

    game = await getGame();
    expect(
      game.winnerInfo.currentWinner.equals(UInt64.from(0)).toBoolean(),
    ).toBeTruthy();

    await sendCombinations(
      appChain,
      poker,
      game,
      bob.privateKey,
      secondCombinations,
      1,
    );

    game = await getGame();
    expect(
      game.winnerInfo.currentWinner.equals(UInt64.from(1)).toBoolean(),
    ).toBeTruthy();

    expect(+game.round.status.toString()).toBe(GameStatus.ENDING);

    await skipBlocks(10, appChain);

    {
      console.log('End round');
      appChain.setSigner(alice.privateKey);
      let tx = await appChain.transaction(alice.publicKey, () => {
        poker.endRound(gameId);
      });

      await tx.sign();
      await tx.send();

      let block = await appChain.produceBlock();
      expect(block?.transactions[0].status.toBoolean()).toBeTruthy();
    }

    game = await getGame();

    expect(game.round.status.equals(UInt64.zero)).toBeTruthy();
    expect(game.round.bank.equals(UInt64.zero)).toBeTruthy();

    let aliceBalance =
      await appChain.query.runtime.Poker.userBalance.get(aliceKey);

    let bobBalance = await appChain.query.runtime.Poker.userBalance.get(bobKey);

    // console.log(`alice: ${aliceBalance!.toString()}`);
    // console.log(`bob: ${bobBalance!.toString()}`);

    // expect(aliceBalance!.sub(bobBalance!).equals(UInt64.from(2)));

    // Wining
  }, 1000000);
});
