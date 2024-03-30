import {
  Experimental,
  Field,
  Group,
  PrivateKey,
  Provable,
  PublicKey,
  Struct,
  UInt64,
} from 'o1js';
import { EncryptedCardBase } from './EncryptedCardBase';
import { ICard } from './interfaces/ICard';
import { toEncryptedCardHelper } from './CardBase';
import { IEncrypedCard } from './interfaces/IEncryptedCard';
import { EncryptedDeckBase } from './DeckBase';
import { convertToMesage, decryptOne, encrypt } from '../ElGamal';
import { getPermutationMatrix } from './Permutation';

const POKER_MAX_COLOR = 4;
const POKER_MAX_VALUE = 15;
const POKER_MIN_VALUE = 2;
const POKER_DECK_SIZE = (POKER_MAX_VALUE - POKER_MIN_VALUE) * POKER_MAX_COLOR;

export class PokerCard
  extends Struct({
    value: UInt64, // TODO check value \in [2, 14]
    color: UInt64, // TODO check value \in [0, 3]
  })
  implements ICard<PokerEncryptedCard>
{
  toEncryptedCard(): PokerEncryptedCard {
    return toEncryptedCardHelper(PokerEncryptedCard, this.getIndex());
  }

  getIndex(): UInt64 {
    return this.value.mul(POKER_MAX_COLOR).add(this.color);
  }

  toString(): string {
    return `Value: ${this.value.toString()}. Color: ${this.color.toString()}`;
  }
}

export class PokerEncryptedCard
  extends EncryptedCardBase
  implements IEncrypedCard<PokerCard>
{
  toCard(): PokerCard {
    this.numOfEncryption.assertEquals(UInt64.zero);

    let groupVal = this.value[1].sub(this.value[2]);
    let curV = Group.generator;
    let value = 0;
    let color = 0;
    let found = false;
    for (let i = 0; i < POKER_MAX_VALUE * POKER_MAX_COLOR; i++) {
      if (curV.equals(groupVal).toBoolean()) {
        found = true;
        break;
      }

      curV = curV.add(Group.generator);
      color++;
      value += Math.floor(color / POKER_MAX_COLOR);
      color = color % POKER_MAX_COLOR;
    }

    // if (!found) {
    //     throw Error('Card cannot be decrypted');
    // }

    return new PokerCard({
      value: UInt64.from(value),
      color: UInt64.from(color),
    });
  }
}

export class PokerEncryptedDeck extends EncryptedDeckBase(
  PokerEncryptedCard,
  {
    cards: Provable.Array(PokerEncryptedCard, POKER_DECK_SIZE),
  },
  POKER_DECK_SIZE,
) {}

export class PokerPermutationMatrix extends getPermutationMatrix(
  POKER_DECK_SIZE,
) {}

//////////////////////////////////////// Shuffle /////////////////////////////////////////

export class ShuffleProofPublicInput extends Struct({
  initialDeck: PokerEncryptedDeck,
  agrigatedPubKey: PublicKey,
}) {}

export class ShuffleProofPublicOutput extends Struct({
  newDeck: PokerEncryptedDeck,
}) {}

const initialEnctyptedDeck = new PokerEncryptedDeck({
  cards: [...Array(POKER_DECK_SIZE).keys()].map((value) => {
    return new PokerEncryptedCard({
      value: convertToMesage(value),
      numOfEncryption: UInt64.zero,
    });
  }),
});

export const shuffle = (
  publiciInput: ShuffleProofPublicInput,
  permutation: PokerPermutationMatrix,
  noise: Field[], // #TODO change to provable array(if needed)
): ShuffleProofPublicOutput => {
  let newDeck = initialEnctyptedDeck;
  // We assume that numOfEncryption equals on each card during shuffle phaze
  let initialNumOfEncryption =
    publiciInput.initialDeck.cards[0].numOfEncryption;

  for (let i = 0; i < POKER_DECK_SIZE; i++) {
    newDeck.cards[i] = new PokerEncryptedCard({
      value: encrypt(
        publiciInput.agrigatedPubKey,
        publiciInput.initialDeck.cards[i].value as [Group, Group, Group], // fix as issue
        noise[i], // Generate random value(use value from private inputs)
      ),
      numOfEncryption: initialNumOfEncryption.add(1),
    });
  }

  newDeck = newDeck.applyPermutation(permutation);

  return new ShuffleProofPublicOutput({
    newDeck,
  });
};

export const PokerShuffleApp = Experimental.ZkProgram({
  publicInput: ShuffleProofPublicInput as any, // ?
  publicOutput: ShuffleProofPublicOutput as any, // ?
  methods: {
    shuffle: {
      privateInputs: [
        PokerPermutationMatrix,
        Provable.Array(Field, POKER_DECK_SIZE),
      ],
      method: shuffle,
    },
  },
});

export class PokerShuffleProof extends Experimental.ZkProgram.Proof(
  PokerShuffleApp,
) {}

////////////////////////////////////// Decrypt /////////////////////////////////////

export class DecryptProofPublicInput extends Struct({
  m0: Group,
}) {}
export class DecryptProofPublicOutput extends Struct({
  decryptedPart: Group,
}) {}

export const proveDecrypt = (
  publicInput: DecryptProofPublicInput,
  pk: PrivateKey,
): DecryptProofPublicOutput => {
  let decryptedPart = decryptOne(pk, publicInput.m0);

  return new DecryptProofPublicOutput({
    decryptedPart,
  });
};

export const Decrypt = Experimental.ZkProgram({
  publicInput: DecryptProofPublicInput,
  publicOutput: DecryptProofPublicOutput,
  methods: {
    decrypt: {
      privateInputs: [PrivateKey],
      method: proveDecrypt,
    },
  },
});

export class PokerDecryptProof extends Experimental.ZkProgram.Proof(Decrypt) {}
