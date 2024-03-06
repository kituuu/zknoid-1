import { Option, State, StateMap, assert } from '@proto-kit/protocol';
import { MatchMaker, QueueListItem } from '../engine/MatchMaker';
import { state, runtimeMethod, runtimeModule } from '@proto-kit/module';
import {
    Bool,
    Experimental,
    Group,
    Proof,
    Provable,
    PublicKey,
    Struct,
    UInt64,
} from 'o1js';
import { ShuffleProof } from './ShuffleProof';
import { DecryptProof } from './DecryptProof';
import {
    Card,
    EncryptedCard,
    EncryptedDeck,
    GameIndex,
    GameInfo,
    GameStatus,
    MAX_COLOR,
    MAX_VALUE,
    MIN_VALUE,
    POKER_DECK_SIZE,
} from './types';
import { convertToMesage } from '../engine/ElGamal';

function forceOptionValue<T>(o: Option<T>): T {
    assert(
        o.isSome,
        'forceOptionValue fail. Trying to access unitialized value'
    );
    return o.value;
}

export const initialEnctyptedDeck = new EncryptedDeck({
    cards: [...Array(MAX_VALUE - MIN_VALUE).keys()].flatMap((value) => {
        return [...Array(MAX_COLOR).keys()].map((color) => {
            console.log(`${value + MIN_VALUE}-${color}`);
            return new Card({
                value: UInt64.from(value + MIN_VALUE),
                color: UInt64.from(color),
            }).toEncryptedCard();
        });
    }),
});

@runtimeModule()
export class Poker extends MatchMaker {
    @state() public games = StateMap.from<UInt64, GameInfo>(UInt64, GameInfo);
    @state() public lastGameId = State.from<UInt64>(UInt64);

    @state() public gamesNum = State.from<UInt64>(UInt64);

    // // Session => player amount
    // @state() public playersNum = StateMap.from<UInt64, UInt64>(UInt64, UInt64);

    // [Session, index] => player
    @state() public players = StateMap.from<GameIndex, PublicKey>(
        GameIndex,
        PublicKey
    );

    // [GameId, cardIndex] => player
    @state() public kardToPlayer = StateMap.from<GameIndex, PublicKey>(
        GameIndex,
        PublicKey
    );

    public override initGame(
        opponentReady: Bool,
        opponent: Option<QueueListItem>
    ): UInt64 {
        let newId = this.lastGameId.get().orElse(UInt64.from(1));
        this.lastGameId.set(newId.add(1));

        let opp = Provable.if(
            opponent.isSome,
            this.userToSession
                .get(opponent.value.userAddress)
                .orElse(this.transaction.sender),
            this.transaction.sender // Workaround. PublicKey.zero cannot be transformed to Group elem
        );

        assert(
            this.userToSession
                .get(this.transaction.sender)
                .value.equals(PublicKey.empty())
                .not()
        );

        let pubKeyList = [
            this.userToSession
                .get(this.transaction.sender)
                .orElse(this.transaction.sender),
            opp,
        ];

        let agrigatedPubKey = this.getAgrigatedPubKey(pubKeyList);

        this.games.set(
            Provable.if(opponentReady, newId, UInt64.zero),
            new GameInfo({
                status: UInt64.from(GameStatus.SETUP),
                deck: initialEnctyptedDeck,
                curPlayerIndex: UInt64.zero,
                waitDecFrom: UInt64.zero,
                maxPlayers: UInt64.from(2), // Change depending on opponents count. For now only 2 players
                lastCardIndex: UInt64.zero,
                agrigatedPubKey,
            })
        );

        /// #TODO Transform to provable
        let players = [opponent.value.userAddress, this.transaction.sender];

        for (let i = 0; i < players.length; i++) {
            this.players.set(
                new GameIndex({
                    gameId: newId,
                    index: UInt64.from(i),
                }),
                players[i]
            );
        }

        return UInt64.from(newId);
    }

    // #TODO change to provable
    private getAgrigatedPubKey(pubKeys: PublicKey[]): PublicKey {
        return PublicKey.fromGroup(
            pubKeys
                .map((val) => val.toGroup())
                .reduce((acc, val) => acc.add(val), Group.zero)
        );
    }

    @runtimeMethod()
    public setup(gameId: UInt64, shuffleProof: ShuffleProof) {
        const sessionSender = this.sessions.get(this.transaction.sender);
        const sender = Provable.if(
            sessionSender.isSome,
            sessionSender.value,
            this.transaction.sender
        );

        let game = forceOptionValue(this.games.get(gameId));
        // Check that game in setup status
        assert(game.status.equals(UInt64.from(GameStatus.SETUP)));

        let currentPlayer = this.getUserByIndex(gameId, game.curPlayerIndex);

        // Check if right player runing setup
        assert(currentPlayer.equals(sender));

        // Check shuffle proof
        shuffleProof.verify();
        assert(shuffleProof.publicInput.initialDeck.equals(game.deck));

        // Update deck in games
        game.deck = shuffleProof.publicOutput.newDeck;
        game.nextTurn();
        game.status = Provable.if(
            game.curPlayerIndex.equals(UInt64.from(0)), // turn returned to first player
            UInt64.from(GameStatus.GAME),
            game.status
        );

        this.games.set(gameId, game);
    }

    @runtimeMethod()
    public drawCard(gameId: UInt64) {
        let game = forceOptionValue(this.games.get(gameId));
        let currentPlayer = this.getUserByIndex(gameId, game.curPlayerIndex);

        // Check if right player runing setup
        assert(currentPlayer.equals(this.transaction.sender));

        this.kardToPlayer.set(
            new GameIndex({
                gameId,
                index: game.lastCardIndex,
            }),
            this.transaction.sender
        );

        game.lastCardIndex = game.lastCardIndex.add(1);
        game.nextTurn();
    }

    @runtimeMethod()
    public decryptCard(
        gameId: UInt64,
        cardId: UInt64,
        decryptProof: DecryptProof
    ) {
        let game = forceOptionValue(this.games.get(gameId));
        let card = game.deck.cards[+cardId.toString()]; // Unprovable. Change to provable version
        assert(card.equals(decryptProof.publicInput.initCard));

        decryptProof.verify();
        game.deck.cards[+cardId.toString()] = decryptProof.publicOutput.newCard;
        this.games.set(gameId, game);
    }

    private getUserByIndex(gameId: UInt64, index: UInt64): PublicKey {
        return forceOptionValue(
            this.players.get(
                new GameIndex({
                    gameId,
                    index,
                })
            )
        );
    }
}
