import { Experimental, Group, PrivateKey, Struct } from 'o1js';
import { EncryptedCard } from './types';
import { decrypt } from '../engine/Hormonic';

export class DecryptProofPublicInput extends Struct({
    initCard: EncryptedCard,
}) {}
export class DecryptProofPublicOutput extends Struct({
    newCard: EncryptedCard,
}) {}

export const proveDecrypt = (
    publicInput: DecryptProofPublicInput,
    pk: PrivateKey
): DecryptProofPublicOutput => {
    // TODO normal decryption. Current is not secure, but for tests - ok
    let newCard = new EncryptedCard({
        value: decrypt(pk, publicInput.initCard.value as [Group, Group, Group]),
        numOfEncryption: publicInput.initCard.numOfEncryption.sub(1),
    });

    return new DecryptProofPublicOutput({
        newCard,
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
