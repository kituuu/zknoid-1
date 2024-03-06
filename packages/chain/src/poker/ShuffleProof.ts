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
import {
    EncryptedCard,
    EncryptedDeck,
    POKER_DECK_SIZE,
    PermutationMatrix,
} from './types';
import { convertToMesage, encrypt } from '../engine/ElGamal';

export class ShuffleProofPublicInput extends Struct({
    initialDeck: EncryptedDeck,
    agrigatedPubKey: PublicKey,
}) {}

export class ShuffleProofPublicOutput extends Struct({
    newDeck: EncryptedDeck,
}) {}

const initialEnctyptedDeck = new EncryptedDeck({
    cards: [...Array(POKER_DECK_SIZE).keys()].map((value) => {
        return new EncryptedCard({
            value: convertToMesage(value),
            numOfEncryption: UInt64.zero,
        });
    }),
});

export const shuffle = (
    publiciInput: ShuffleProofPublicInput,
    permutation: PermutationMatrix,
    noise: Field[] // #TODO change to provable array(if needed)
): ShuffleProofPublicOutput => {
    let newDeck = initialEnctyptedDeck;
    // We assume that numOfEncryption equals on each card during shuffle phaze
    let initialNumOfEncryption =
        publiciInput.initialDeck.cards[0].numOfEncryption;

    for (let i = 0; i < POKER_DECK_SIZE; i++) {
        newDeck.cards[i] = new EncryptedCard({
            value: encrypt(
                publiciInput.agrigatedPubKey,
                publiciInput.initialDeck.cards[i].value as [
                    Group,
                    Group,
                    Group,
                ], // fix as issue
                noise[i] // Generate random value(use value from private inputs)
            ),
            numOfEncryption: initialNumOfEncryption.add(1),
        });
    }

    newDeck = newDeck.applyPermutation(permutation);

    return new ShuffleProofPublicOutput({
        newDeck,
    });
};

export const Shuffle = Experimental.ZkProgram({
    publicInput: ShuffleProofPublicInput,
    publicOutput: ShuffleProofPublicOutput,
    methods: {
        shuffle: {
            privateInputs: [
                PermutationMatrix,
                Provable.Array(Field, POKER_DECK_SIZE),
            ],
            method: shuffle,
        },
    },
});

export class ShuffleProof extends Experimental.ZkProgram.Proof(Shuffle) {}
