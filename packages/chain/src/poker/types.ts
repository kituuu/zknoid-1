import { Bool, Group, Provable, Struct, UInt64 } from 'o1js';
import { Json } from 'o1js/dist/node/bindings/mina-transaction/gen/transaction';

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

    toJSONString(): string {
        let v1 = this.value[0].toJSON();
        let v2 = this.value[1].toJSON();
        let numOfEncryption = this.numOfEncryption.toJSON();

        return JSON.stringify({ v1, v2, numOfEncryption });
    }

    static fromJSONString(data: string): EncryptedCard {
        let { v1, v2, numOfEncryption } = JSON.parse(data);

        return new EncryptedCard({
            value: [Group.fromJSON(v1), Group.fromJSON(v2)],
            numOfEncryption: UInt64.fromJSON(numOfEncryption),
        });
    }
}

export class EncryptedDeck extends Struct({
    cards: Provable.Array(EncryptedCard, POKER_DECK_SIZE),
}) {
    // Was a name collision with Struct
    static fromJSONString(data: string): EncryptedDeck {
        let cards: EncryptedCard[] = [];
        let cardsJSONs = JSON.parse(data);
        for (let i = 0; i < POKER_DECK_SIZE; i++) {
            cards.push(
                EncryptedCard.fromJSONString(cardsJSONs[i]) as EncryptedCard
            );
        }

        return new EncryptedDeck({
            cards,
        });
    }

    equals(ed: EncryptedDeck): Bool {
        let res = new Bool(true);
        for (let i = 0; i < this.cards.length; i++) {
            res = res.and(this.cards[i].equals(ed.cards[i]));
        }

        return res;
    }

    toJSONString(): string {
        let cardsJSONs = [];
        for (let i = 0; i < this.cards.length; i++) {
            cardsJSONs.push(this.cards[i].toJSONString());
        }

        return JSON.stringify(cardsJSONs);
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
        // Bypass protokit simulation with no state. In this case this.maxPlayers == 0, and fails
        let modValue = Provable.if(
            this.maxPlayers.greaterThan(UInt64.zero),
            this.maxPlayers,
            UInt64.from(1)
        );

        this.curPlayerIndex = this.curPlayerIndex.add(1).mod(modValue);
    }
}

export class GameIndex extends Struct({
    gameId: UInt64,
    index: UInt64,
}) {}
