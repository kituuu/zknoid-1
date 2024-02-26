import { Experimental, Struct } from 'o1js';
import { EncryptedCard } from './types';

export class DecryptProofPublicInput extends Struct({
    initCard: EncryptedCard,
}) {}
export class DecryptProofPublicOutput extends Struct({
    newCard: EncryptedCard,
}) {}

const decrypt = (
    publicInput: DecryptProofPublicInput
): DecryptProofPublicOutput => {
    // TODO
    return new DecryptProofPublicOutput({
        newCard: publicInput.initCard,
    });
};

export const Decrypt = Experimental.ZkProgram({
    publicInput: DecryptProofPublicInput,
    publicOutput: DecryptProofPublicOutput,
    methods: {
        decrypt: {
            privateInputs: [],
            method: decrypt,
        },
    },
});

export class DecryptProof extends Experimental.ZkProgram.Proof(Decrypt) {}
