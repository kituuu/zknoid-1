import {
  Experimental,
  Field,
  Group,
  InferProvable,
  Provable,
  ProvableExtended,
  PublicKey,
  Struct,
  UInt64,
} from 'o1js';
import { IPermutationMatrix } from '../interfaces/IPermutationMatrix';
import { encrypt } from 'src/engine/ElGamal';
import { PermutationMatrix } from 'src/poker';

// EncryptedDeck -> ED
//

interface IDeck<ED, EC> {
  new: () => ED;
  // size: () => number;
  cards: EC[];
  // applyPermutation: (pm: IPermutationMatrix) => this;
  initialEnctyptedDeck: () => ED;
}

interface T1 {
  numOfEncryption: UInt64;
  value: [Group, Group, Group];
}
/*
export function createProof<
  C extends Struct<any>,
  EC extends Struct<C> & {
    numOfEncryption: UInt64;
    value: [Group, Group, Group];
  },
  ED extends IDeck<ED, EC>,
  PM extends IPermutationMatrix,
  // >(ecType: new ({}) => EC, deckType: IDeck<ED, Struct<C>>) {
>(
  ecType: new ({}) => EC,

  deckType: Struct<ED> & { initialEnctyptedDeck(): ED },

  // deckType: { new (): ED; initialEnctyptedDeck(): ED; getCard(i: number): C },
) {
  class ShuffleProofPublicInput extends Struct({
    initialDeck: deckType,
    agrigatedPubKey: PublicKey,
  }) {}

  class ShuffleProofPublicOutput extends Struct({
    newDeck: deckType,
  }) {}

  const shuffle = (
    publiciInput: ShuffleProofPublicInput,
    permutation: PM,
    noise: Field[], // #TODO change to provable array(if needed)
  ): ShuffleProofPublicOutput => {
    // let newDeck = new deckType();
    let newDeck = deckType.initialEnctyptedDeck();

    // We assume that numOfEncryption equals on each card during shuffle phaze
    let initialNumOfEncryption =
      publiciInput.initialDeck.cards[0].numOfEncryption;

    for (let i = 0; i < newDeck.cards.length; i++) {
      newDeck.cards[i] = new ecType({
        value: encrypt(
          publiciInput.agrigatedPubKey,
          publiciInput.initialDeck.cards[i].value as [Group, Group, Group], // fix as issue
          noise[i], // Generate random value(use value from private inputs)
        ),
        numOfEncryption: initialNumOfEncryption.add(1),
      });
    }

    return new ShuffleProofPublicOutput({
      newDeck,
    });
  };

  const Shuffle = Experimental.ZkProgram({
    publicInput: ShuffleProofPublicInput,
    publicOutput: ShuffleProofPublicOutput,
    methods: {
      shuffle: {
        privateInputs: [
          PermutationMatrix,
          Provable.Array(Field, deckType.size()),
        ],
        method: shuffle,
      },
    },
  });

  class ShuffleProof extends Experimental.ZkProgram.Proof(Shuffle) {}
}
*/

// export class ShuffleProofPublicInput extends Struct({
//   initialDeck: EncryptedDeck,
//   agrigatedPubKey: PublicKey,
// }) {}

// export class ShuffleProofPublicOutput extends Struct({
//   newDeck: EncryptedDeck,
// }) {}

// const initialEnctyptedDeck = new EncryptedDeck({
//   cards: [...Array(POKER_DECK_SIZE).keys()].map((value) => {
//     return new EncryptedCard({
//       value: convertToMesage(value),
//       numOfEncryption: UInt64.zero,
//     });
//   }),
// });

// export const shuffle = (
//   publiciInput: ShuffleProofPublicInput,
//   permutation: PermutationMatrix,
//   noise: Field[], // #TODO change to provable array(if needed)
// ): ShuffleProofPublicOutput => {
//   let newDeck = initialEnctyptedDeck;
//   // We assume that numOfEncryption equals on each card during shuffle phaze
//   let initialNumOfEncryption =
//     publiciInput.initialDeck.cards[0].numOfEncryption;

//   for (let i = 0; i < POKER_DECK_SIZE; i++) {
//     newDeck.cards[i] = new EncryptedCard({
//       value: encrypt(
//         publiciInput.agrigatedPubKey,
//         publiciInput.initialDeck.cards[i].value as [Group, Group, Group], // fix as issue
//         noise[i], // Generate random value(use value from private inputs)
//       ),
//       numOfEncryption: initialNumOfEncryption.add(1),
//     });
//   }

//   newDeck = newDeck.applyPermutation(permutation);

//   return new ShuffleProofPublicOutput({
//     newDeck,
//   });
// };

// export const Shuffle = Experimental.ZkProgram({
//   publicInput: ShuffleProofPublicInput,
//   publicOutput: ShuffleProofPublicOutput,
//   methods: {
//     shuffle: {
//       privateInputs: [
//         PermutationMatrix,
//         Provable.Array(Field, POKER_DECK_SIZE),
//       ],
//       method: shuffle,
//     },
//   },
// });

// export class ShuffleProof extends Experimental.ZkProgram.Proof(Shuffle) {}
