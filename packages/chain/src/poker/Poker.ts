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
import { EncryptedDeck, GameIndex, GameInfo, GameStatus } from './types';

function forceOptionValue<T>(o: Option<T>): T {
    assert(
        o.isSome,
        'forceOptionValue fail. Trying to access unitialized value'
    );
    return o.value;
}

@runtimeModule()
export class Poker extends MatchMaker {
    @state() public games = StateMap.from<UInt64, GameInfo>(UInt64, GameInfo);

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
        // TODO
        return UInt64.from(0);
    }

    @runtimeMethod()
    public setup(gameId: UInt64, shuffleProof: ShuffleProof) {
        let game = forceOptionValue(this.games.get(gameId));
        // Check that game in setup status
        assert(game.status.equals(UInt64.from(GameStatus.SETUP)));

        let currentPlayer = this.getUserByIndex(gameId, game.curPlayerIndex);

        // Check if right player runing setup
        assert(currentPlayer.equals(this.transaction.sender));

        // Check shuffle proof
        shuffleProof.verify();
        assert(shuffleProof.publicInput.initialDeck.equals(game.deck));

        // Update deck in games
        game.deck = shuffleProof.publicOutput.newDeck;
        game.nextTurn();
        game.status = Provable.if(
            game.curPlayerIndex.equals(UInt64.from(0)) // turn returned to first player
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
        game.deck.cards[+cardId.toString()] =
            decryptProof.publicOutput.newCard;
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
