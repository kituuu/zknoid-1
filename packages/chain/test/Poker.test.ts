import { AppChain, TestingAppChain } from '@proto-kit/sdk';
import { Field, Int64, PrivateKey, PublicKey, UInt64 } from 'o1js';
import { log } from '@proto-kit/common';
import { Pickles } from 'o1js/dist/node/snarky';
import { dummyBase64Proof } from 'o1js/dist/node/lib/proof_system';
import {
  Balances,
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

describe('game hub', () => {
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

    const alicePrivateKey = PrivateKey.random();
    const alice = alicePrivateKey.toPublicKey();

    const bobPrivateKey = PrivateKey.random();
    const bob = bobPrivateKey.toPublicKey();

    await appChain.start();

    const poker = appChain.runtime.resolve('Poker');

    console.log('Finding match');
    // Find match
    {
      appChain.setSigner(alicePrivateKey);
      const tx1 = await appChain.transaction(alice, () => {
        poker.joinLobby(UInt64.from(1));
      });
      await tx1.sign();
      await tx1.send();

      let block = await appChain.produceBlock();
      expect(block?.transactions[0].status.toBoolean()).toBeTruthy();

      appChain.setSigner(bobPrivateKey);
      const tx2 = await appChain.transaction(bob, () => {
        poker.joinLobby(UInt64.from(1));
      });
      await tx2.sign();
      await tx2.send();

      block = await appChain.produceBlock();
      expect(block?.transactions[0].status.toBoolean()).toBeTruthy();

      // Start game
      appChain.setSigner(alicePrivateKey);
      const tx3 = await appChain.transaction(alice, () => {
        poker.startGame(UInt64.from(1));
      });
      await tx3.sign();
      await tx3.send();
    }

    await appChain.produceBlock();

    const gameId = UInt64.from(1);
    const aliceGameId =
      await appChain.query.runtime.Poker.activeGameId.get(alice);
    const bobGameId = await appChain.query.runtime.Poker.activeGameId.get(bob);

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

    console.log('Setup');
    // Setup
    let game = await getGame();

    let alicePermutation = PermutationMatrix.getZeroMatrix();
    await sendShuffle(appChain, poker, game, alicePermutation, alicePrivateKey);

    game = await getGame();

    let bobPermutation = PermutationMatrix.getZeroMatrix();
    await sendShuffle(appChain, poker, game, bobPermutation, bobPrivateKey);

    console.log('First turn');
    // Fist turn

    // First turn open
    game = await getGame();
    await sendInitialOpen(
      appChain,
      poker,
      game,
      alicePrivateKey,
      UInt64.from(0),
    );
    game = await getGame();
    await sendInitialOpen(appChain, poker, game, bobPrivateKey, UInt64.from(1));
    game = await getGame();

    expect(game.inBid().toBoolean()).toBeTruthy();

    // First turn bid
    await sendBid(appChain, poker, game, alicePrivateKey, UInt64.from(1));
    await sendBid(appChain, poker, game, bobPrivateKey, UInt64.from(1));

    game = await getGame();
    expect(game.round.bank.equals(UInt64.from(2)).toBoolean()).toBeTruthy();
    expect(game.round.index.equals(UInt64.from(1)).toBoolean()).toBeTruthy();

    // Second turn - Fourth turns
    for (let i = 1; i < 4; i++) {
      let round = UInt64.from(i);
      game = await getGame();
      expect(game.round.index.equals(round)).toBeTruthy();
      expect(game.inReveal().toBoolean()).toBeTruthy();
      await sendNextOpen(appChain, poker, game, alicePrivateKey, round);
      game = await getGame();
      expect(game.round.decLeft.equals(UInt64.from(1))).toBeTruthy();
      await sendNextOpen(appChain, poker, game, bobPrivateKey, round);

      game = await getGame();
      expect(game.round.index.equals(round)).toBeTruthy();
      expect(game.round.decLeft.equals(UInt64.from(2))).toBeTruthy();
      expect(game.inBid().toBoolean()).toBeTruthy();
      await sendBid(appChain, poker, game, alicePrivateKey, UInt64.from(1));
      game = await getGame();
      await sendBid(appChain, poker, game, bobPrivateKey, UInt64.from(1));
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
      alicePrivateKey,
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
      bobPrivateKey,
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
      appChain.setSigner(alicePrivateKey);
      let tx = await appChain.transaction(alice, () => {
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

    let bobBalance =
      await appChain.query.runtime.Poker.userBalance.get(aliceKey);

    expect(aliceBalance!.sub(bobBalance!).equals(UInt64.from(2)));

    // Wining
  }, 100000);
});
