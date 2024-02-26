import { Experimental, Field, Group, PrivateKey, Struct } from 'o1js';
import { EncryptedCard, EncryptedDeck, POKER_DECK_SIZE } from './types';
import { encrypt } from 'src/engine/Hormonic';

export class ShuffleProofPublicInput extends Struct({
    initialDeck: EncryptedDeck,
}) {}

export class ShuffleProofPublicOutput extends Struct({
    newDeck: EncryptedDeck,
}) {}

// # TODO add permutation matrix
const shuffle = (
    input: ShuffleProofPublicInput,
    pk: PrivateKey
): ShuffleProofPublicOutput => {
    let pubKey = pk.toPublicKey();
    let newDeck = input.initialDeck;

    for (let i = 0; i < POKER_DECK_SIZE; i++) {
        newDeck.cards[i] = new EncryptedCard({
            value: encrypt(
                pubKey,
                newDeck.cards[i].value as [Group, Group], // fix as issue
                Field.from(0) // Generate random value(use value from private inputs)
            ),
        });
    }

    return new ShuffleProofPublicOutput({
        newDeck,
    });
};

export const Shuffle = Experimental.ZkProgram({
    publicInput: ShuffleProofPublicInput,
    publicOutput: ShuffleProofPublicOutput,
    methods: {
        shuffle: {
            privateInputs: [PrivateKey], // Also there should be permutation matrix
            method: shuffle,
        },
    },
});

export class ShuffleProof extends Experimental.ZkProgram.Proof(Shuffle) {}
