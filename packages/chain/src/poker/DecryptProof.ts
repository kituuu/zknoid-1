import {
    Experimental,
    Group,
    PrivateKey,
    Provable,
    Struct,
    UInt64,
} from 'o1js';
import { EncryptedCard, EncryptedDeck, POKER_DECK_SIZE } from './types';
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

/////////////////////////////// Initial Open ////////////////////////////////////

export class InitialOpenPublicInput extends Struct({
    deck: EncryptedDeck,
    playerIndex: UInt64,
}) {}

export class InitialOpenPublicOutput extends Struct({
    decryptedValues: Provable.Array(Group, POKER_DECK_SIZE),
}) {}

const proveInitialOpen = (
    publicInput: InitialOpenPublicInput,
    pk: PrivateKey
): InitialOpenPublicOutput => {
    let decryptedValues: Group[] = Array(POKER_DECK_SIZE).fill(Group.zero);

    // Decrypt first two cards
    decryptedValues[0] = decryptOne(pk, publicInput.deck.cards[0].value[0]);
    decryptedValues[1] = decryptOne(pk, publicInput.deck.cards[1].value[0]);

    for (let i = 0; i < 2; i++) {
        // #TODOChange to max players
        let curPos = UInt64.from(i);

        // #TODO i is not constrained/ Fix it
        decryptedValues[5 + 2 * i] = Provable.if(
            curPos.equals(publicInput.playerIndex),
            Group.zero,
            decryptOne(pk, publicInput.deck.cards[5 + 2 * i].value[0])
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
    InitialOpen
) {}
