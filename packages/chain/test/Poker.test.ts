import { AppChain, TestingAppChain } from '@proto-kit/sdk';
import { Field, PrivateKey, PublicKey, UInt64 } from 'o1js';
import { log } from '@proto-kit/common';
import { Pickles } from 'o1js/dist/node/snarky';
import { dummyBase64Proof } from 'o1js/dist/node/lib/proof_system';
import { GameInfo, POKER_DECK_SIZE, PermutationMatrix, Poker } from 'src';
import {
  ShuffleProof,
  ShuffleProofPublicInput,
  shuffle,
} from 'src/poker/ShuffleProof';
import {
  InitialOpenPublicInput,
  proveInitialOpen,
} from 'src/poker/DecryptProof';
import { Runtime } from '@proto-kit/module';

log.setLevel('ERROR');

const chunkenize = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size),
  );

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
  appChain: TestingAppChain<any, any>,
  poker: Poker,
  game: GameInfo,
  permutation: PermutationMatrix,
  sender: PublicKey,
) => {
  let shuffleInput = new ShuffleProofPublicInput({
    initialDeck: game.deck,
    agrigatedPubKey: game.agrigatedPubKey,
  });

  let noises = [...Array(POKER_DECK_SIZE)].map(() => Field.from(0));
  let shuffleOutput = shuffle(shuffleInput, permutation, noises);

  let aliceShuffleProof = await mockProof(
    shuffleOutput,
    ShuffleProof,
    shuffleInput,
  );

  {
    const tx = await appChain.transaction(sender, () => {
      poker.setup(game.meta.id, aliceShuffleProof);
    });
    tx.sign();
    tx.send();
  }
};

describe('game hub', () => {
  it.skip('Log proof', async () => {
    console.log(await dummyBase64Proof());
  });
  it('Two players basic case', async () => {
    const appChain = TestingAppChain.fromRuntime({
      modules: {
        Poker,
      },
    });

    appChain.configurePartial({
      Runtime: {
        Poker: {},
      },
    });

    const alicePrivateKey = PrivateKey.random();
    const alice = alicePrivateKey.toPublicKey();

    const bobPrivateKey = PrivateKey.random();
    const bob = alicePrivateKey.toPublicKey();

    await appChain.start();

    const poker = appChain.runtime.resolve('Poker');

    // Find match
    {
      const tx1 = await appChain.transaction(alice, () => {
        poker.register(alice, UInt64.zero);
      });
      tx1.sign();
      tx1.send();

      const tx2 = await appChain.transaction(bob, () => {
        poker.register(bob, UInt64.zero);
      });
      tx2.sign();
      tx2.send();
    }

    const gameId = UInt64.from(1);
    const aliceGameId =
      await appChain.query.runtime.Poker.activeGameId.get(alice);
    const bobGameId = await appChain.query.runtime.Poker.activeGameId.get(bob);

    expect(aliceGameId).toBe(bobGameId);
    expect(aliceGameId).toBe(gameId);

    // Setup
    let game = await appChain.query.runtime.Poker.games.get(gameId);

    if (!game) {
      throw Error('No game found');
    }

    let alicePermutation = PermutationMatrix.getZeroMatrix();
    await sendShuffle(appChain, poker, game, alicePermutation, alice);

    game = await appChain.query.runtime.Poker.games.get(gameId);
    if (!game) {
      throw Error('No game found');
    }

    let bobPermutation = PermutationMatrix.getZeroMatrix();
    await sendShuffle(appChain, poker, game, bobPermutation, bob);

    // Fist turn

    // First turn open
    let publicOpen = new InitialOpenPublicInput({
      deck,
    });
    proveInitialOpen(publicInput, pk);
    // First turn bid

    // Second turn

    // Third turn

    // Fourth turn

    // Wining
  });
});
