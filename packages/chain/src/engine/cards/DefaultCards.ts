import {
  Bool,
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
/*
export class PokerEncryptedCard extends Struct({
  value: [Group, Group, Group],
  numOfEncryption: UInt64,
}) {
  static zero(): PokerEncryptedCard {
    return new PokerEncryptedCard({
      value: [Group.zero, Group.zero, Group.zero],
      numOfEncryption: UInt64.zero,
    });
  }
  static fromJSONString<T extends PokerEncryptedCard>(data: string): T {
    let { v1, v2, v3, numOfEncryption } = JSON.parse(data);

    return <T>new PokerEncryptedCard({
      value: [Group.fromJSON(v1), Group.fromJSON(v2), Group.fromJSON(v3)],
      numOfEncryption: UInt64.fromJSON(numOfEncryption),
    });
  }

  // !Equals do not check this.value[2]!
  equals(ec: PokerEncryptedCard): Bool {
    return this.value[0]
      .equals(ec.value[0])
      .and(this.value[1].equals(ec.value[1]))
      .and(this.numOfEncryption.equals(ec.numOfEncryption));
  }

  toJSONString(): string {
    let v1 = this.value[0].toJSON();
    let v2 = this.value[1].toJSON();
    let v3 = this.value[2].toJSON();
    let numOfEncryption = this.numOfEncryption.toJSON();

    return JSON.stringify({ v1, v2, v3, numOfEncryption });
  }

  copy(): PokerEncryptedCard {
    return PokerEncryptedCard.fromJSONString(this.toJSONString());
  }

  // Used for permutation. Do not make sense otherwise. num can be only 0 or 1
  mul(num: UInt64): PokerEncryptedCard {
    num.assertLessThan(UInt64.from(2));
    return Provable.if(
      num.equals(UInt64.zero),
      PokerEncryptedCard,
      PokerEncryptedCard.zero(),
      this,
    ) as PokerEncryptedCard;
  }

  // Used for permutation. Do not make sense otherwise
  add(ec: PokerEncryptedCard): PokerEncryptedCard {
    return new PokerEncryptedCard({
      value: [
        this.value[0].add(ec.value[0]),
        this.value[1].add(ec.value[1]),
        this.value[2].add(ec.value[2]),
      ],
      numOfEncryption: this.numOfEncryption.add(ec.numOfEncryption),
    });
  }

  addDecryption(decPart: Group): void {
    this.value[0] = this.value[0].add(decPart);
  }

  // No checking, that the private key is valid. So it should be made outside
  decrypt(sk: PrivateKey) {
    this.value[2] = this.value[2].add(decryptOne(sk, this.value[0]));
    this.numOfEncryption = this.numOfEncryption.sub(UInt64.from(1));
  }

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
*/

// This is how it suppose to be done. But currently there is some porblems with types
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

/*
export class PokerEncryptedDeck extends Struct({
  cards: Provable.Array(PokerEncryptedCard, POKER_DECK_SIZE),
}) {
  static fromJSONString(data: string): PokerEncryptedDeck {
    let cards = [];
    let cardsJSONs = JSON.parse(data);
    for (let i = 0; i < POKER_DECK_SIZE; i++) {
      cards.push(PokerEncryptedCard.fromJSONString(cardsJSONs[i]));
    }

    return new PokerEncryptedDeck({
      cards,
    });
  }

  equals(ed: PokerEncryptedDeck): Bool {
    let res = new Bool(true);
    for (let i = 0; i < this.cards.length; i++) {
      res = res.and(this.cards[i].equals(ed.cards[i]));
    }

    return res;
  }

  toJSONString(): string {
    let cardsJSONs = [];
    for (let i = 0; i < this.cards.length; i++) {
      cardsJSONs.push(this.cards[i].toJSONString());
    }

    return JSON.stringify(cardsJSONs);
  }

  applyPermutation(permutation: PokerPermutationMatrix): PokerEncryptedDeck {
    if (POKER_DECK_SIZE != permutation.getSize()) {
      throw Error(
        `deckSize is not equal to permutation size ${POKER_DECK_SIZE} != ${permutation.getSize()}`,
      );
    }

    let final = PokerEncryptedDeck.fromJSONString(this.toJSONString()); // Is it proper copy for proof?

    for (let i = 0; i < permutation.getSize(); i++) {
      let res = PokerEncryptedCard.zero();

      for (let j = 0; j < permutation.getSize(); j++) {
        res = res.add(this.cards[j].mul(permutation.getValue(i, j)));
      }

      final.cards[i] = res;
    }

    return final;
  }
}
*/

// This is how it should be implemented. But again some problems with types
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
