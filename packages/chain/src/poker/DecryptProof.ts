import { Experimental, Group, PrivateKey, Struct } from 'o1js';
import { EncryptedCard } from './types';
import { decrypt, decryptOne } from '../engine/ElGamal';

export class DecryptProofPublicInput extends Struct({
    m0: Group,
}) {}
export class DecryptProofPublicOutput extends Struct({
    decryptedPart: Group,
}) {}

export const proveDecrypt = (
    publicInput: DecryptProofPublicInput,
    pk: PrivateKey
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
