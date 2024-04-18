import {
  Experimental,
  Group,
  Int64,
  PrivateKey,
  Provable,
  Struct,
  UInt64,
} from 'o1js';
import { EncryptedCard, EncryptedDeck, POKER_DECK_SIZE } from './types';
import { decrypt, decryptOne } from '../engine/ElGamal';
import { MAX_PLAYERS } from './consts';

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

export class DecryptProof extends Experimental.ZkProgram.Proof(Decrypt) {}

/////////////////////////////// Initial Open ////////////////////////////////////

export class InitialOpenPublicInput extends Struct({
  deck: EncryptedDeck,
  playerIndex: UInt64,
}) {}

export class InitialOpenPublicOutput extends Struct({
  decryptedValues: Provable.Array(Group, POKER_DECK_SIZE),
}) {}

export const proveInitialOpen = (
  publicInput: InitialOpenPublicInput,
  pk: PrivateKey,
): InitialOpenPublicOutput => {
  let decryptedValues: Group[] = Array(POKER_DECK_SIZE).fill(Group.zero);

  // Decrypt first two cards
  // decryptedValues[0] = decryptOne(pk, publicInput.deck.cards[0].value[0]);
  // decryptedValues[1] = decryptOne(pk, publicInput.deck.cards[1].value[0]);

  for (let i = 0; i < MAX_PLAYERS; i++) {
    // #TODOChange to max players
    let curPos = UInt64.from(i);

    // #TODO i is not constrained/ Fix it
    decryptedValues[5 + 2 * i] = Provable.if(
      curPos.equals(publicInput.playerIndex),
      Group.zero,
      decryptOne(pk, publicInput.deck.cards[5 + 2 * i].value[0]),
    );
    decryptedValues[5 + 2 * i + 1] = Provable.if(
      curPos.equals(publicInput.playerIndex),
      Group.zero,
      decryptOne(pk, publicInput.deck.cards[5 + 2 * i + 1].value[0]),
    );
  }

  return new InitialOpenPublicOutput({ decryptedValues });
};

export const InitialOpen = Experimental.ZkProgram({
  publicInput: InitialOpenPublicInput,
  publicOutput: InitialOpenPublicOutput,
  methods: {
    proveInitialOpen: {
      privateInputs: [PrivateKey],
      method: proveInitialOpen,
    },
  },
});

export class InitialOpenProof extends Experimental.ZkProgram.Proof(
  InitialOpen,
) {}

////////////////////////// Public card open ///////////////////////////

export class RoundIndexes extends Struct({
  values: Provable.Array(Int64, 3),
}) {
  static from(values: number[]): RoundIndexes {
    return new RoundIndexes({
      values: values.map((v: number) => Int64.from(v)),
    });
  }
}

export const getRoundIndexes = (round: UInt64): RoundIndexes => {
  const firstTurn = RoundIndexes.from([0, 1, 2]);
  const secondTurn = RoundIndexes.from([3, -1, -1]);
  const thirdTurn = RoundIndexes.from([4, -1, -1]);
  const isFirst = round.equals(UInt64.from(1));
  const isSecond = round.equals(UInt64.from(2));
  const isThird = round.equals(UInt64.from(3));

  return Provable.switch([isFirst, isSecond, isThird], RoundIndexes, [
    firstTurn,
    secondTurn,
    thirdTurn,
  ]);
};

export class PublicOpenPublicInput extends Struct({
  deck: EncryptedDeck,
  round: UInt64,
}) {}

export class PublicOpenPublicOutput extends Struct({
  decryptedValues: Provable.Array(Group, POKER_DECK_SIZE),
}) {}

export const provePublicOpen = (
  publicInput: PublicOpenPublicInput,
  pk: PrivateKey,
): PublicOpenPublicOutput => {
  let decryptedValues: Group[] = Array(POKER_DECK_SIZE).fill(Group.zero);

  let indexes = getRoundIndexes(publicInput.round).values;

  for (let i = 0; i < indexes.length; i++) {
    let index = indexes[i];
    let val = Provable.if(index.isPositive(), index, Int64.from(0));
    let numVal = +val.toString();
    // #TODO Array access is not provable. Change to provable version
    let decrypted = decryptOne(pk, publicInput.deck.cards[numVal].value[0]);
    decryptedValues[numVal] = Provable.if(
      index.isPositive(),
      decrypted,
      Group.zero,
    );
  }

  return new InitialOpenPublicOutput({ decryptedValues });
};

export const PublicOpen = Experimental.ZkProgram({
  publicInput: PublicOpenPublicInput,
  publicOutput: PublicOpenPublicOutput,
  methods: {
    provePublicOpen: {
      privateInputs: [PrivateKey],
      method: provePublicOpen,
    },
  },
});

export class PublicOpenProof extends Experimental.ZkProgram.Proof(PublicOpen) {}

///////////////////////////////////// FoldProof //////////////////////////////////////

/*
Upon fold you should open all card, that should be open. Unless other players would not be able 
to find out their values.
*/

// #TODO refactor. Now its 90% copy. Reduce duplication

export class FoldIndexes extends Struct({
  values: Provable.Array(Int64, 5),
}) {
  static from(values: number[]): RoundIndexes {
    return new RoundIndexes({
      values: values.map((v: number) => Int64.from(v)),
    });
  }
}

export const getFoldIndexes = (round: UInt64): FoldIndexes => {
  const firstTurn = FoldIndexes.from([0, 1, 2, 3, 4]);
  const secondTurn = FoldIndexes.from([3, 4, -1, -1, -1]);
  const thirdTurn = FoldIndexes.from([4, -1, -1, -1, -1]);
  const isFirst = round.equals(UInt64.from(1));
  const isSecond = round.equals(UInt64.from(2));
  const isThird = round.equals(UInt64.from(3));

  return Provable.switch([isFirst, isSecond, isThird], FoldIndexes, [
    firstTurn,
    secondTurn,
    thirdTurn,
  ]);
};

export class FoldProofPublicInput extends Struct({
  deck: EncryptedDeck,
  round: UInt64,
}) {}

export class FoldProofPublicOutput extends Struct({
  decryptedValues: Provable.Array(Group, POKER_DECK_SIZE),
}) {}

export const proveFold = (
  publicInput: FoldProofPublicInput,
  pk: PrivateKey,
): FoldProofPublicOutput => {
  let decryptedValues: Group[] = Array(POKER_DECK_SIZE).fill(Group.zero);

  let indexes = getFoldIndexes(publicInput.round).values;

  for (let i = 0; i < indexes.length; i++) {
    let index = indexes[i];
    let val = Provable.if(index.isPositive(), index, Int64.from(0));
    let numVal = +val.toString();
    // #TODO Array access is not provable. Change to provable version
    let decrypted = decryptOne(pk, publicInput.deck.cards[numVal].value[0]);
    decryptedValues[numVal] = Provable.if(
      index.isPositive(),
      decrypted,
      Group.zero,
    );
  }
  return new FoldProofPublicOutput({ decryptedValues });
};

export const FoldApp = Experimental.ZkProgram({
  publicInput: FoldProofPublicInput,
  publicOutput: FoldProofPublicOutput,
  methods: {
    proveFold: {
      privateInputs: [PrivateKey],
      method: proveFold,
    },
  },
});

export class FoldProof extends Experimental.ZkProgram.Proof(FoldApp) {}
