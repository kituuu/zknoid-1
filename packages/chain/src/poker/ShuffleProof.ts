import { Experimental, Struct } from 'o1js';
import { EncryptedDeck } from './types';

export class ShuffleProofPublicInput extends Struct({
    initialDeck: EncryptedDeck,
}) {}

export class ShuffleProofPublicOutput extends Struct({
    newDeck: EncryptedDeck,
}) {}

const shuffle = (input: ShuffleProofPublicInput): ShuffleProofPublicOutput => {
    // TODO!
    return new ShuffleProofPublicOutput({
        newDeck: input.initialDeck,
    });
};

export const Shuffle = Experimental.ZkProgram({
    publicInput: ShuffleProofPublicInput,
    publicOutput: ShuffleProofPublicOutput,
    methods: {
        shuffle: {
            privateInputs: [],
            method: shuffle,
        },
    },
});

export class ShuffleProof extends Experimental.ZkProgram.Proof(Shuffle) {}
