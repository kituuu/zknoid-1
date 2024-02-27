import { Bool, Group, Provable, Struct, UInt64 } from 'o1js';

export const POKER_DECK_SIZE = 52;

export class Card extends Struct({
    value: UInt64,
}) {}

export class Deck extends Struct({
    cards: Provable.Array(Card, POKER_DECK_SIZE),
}) {}

export class EncryptedCard extends Struct({
    value: [Group, Group], // Change to provable array, or to new Type
    numOfEncryption: UInt64,
}) {
    equals(ec: EncryptedCard): Bool {
        return this.value[0]
            .equals(ec.value[0])
            .and(this.value[1].equals(ec.value[1]))
            .and(this.numOfEncryption.equals(ec.numOfEncryption));
    }
}

export class EncryptedDeck extends Struct({
    cards: Provable.Array(EncryptedCard, POKER_DECK_SIZE),
}) {
    equals(ed: EncryptedDeck): Bool {
        let res = new Bool(true);
        for (let i = 0; i < POKER_DECK_SIZE; i++) {
            res = res.and(this.cards[i].equals(ed.cards[i]));
        }

        return res;
    }
}

export enum GameStatus {
    SETUP,
    GAME,
}

export class GameInfo extends Struct({
    status: UInt64, // change to provable type
    deck: EncryptedDeck,
    curPlayerIndex: UInt64, // Index of current player
    waitDecFrom: UInt64,
    maxPlayers: UInt64,
    lastCardIndex: UInt64,
}) {
    nextTurn() {
        this.curPlayerIndex = this.curPlayerIndex.add(1).mod(this.maxPlayers);
    }
}

export class GameIndex extends Struct({
    gameId: UInt64,
    index: UInt64,
}) {}
