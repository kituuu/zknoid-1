import { Option, State, StateMap, assert } from '@proto-kit/protocol';
import { MatchMaker, QueueListItem } from '../engine/MatchMaker';
import { state, runtimeMethod, runtimeModule } from '@proto-kit/module';
import { Bool, Group, Proof, Provable, PublicKey, Struct, UInt64 } from 'o1js';

const FOOL_DECK_SIZE = 36;

export class Card extends Struct({
    value: UInt64,
}) {}

export class Deck extends Struct({
    cards: Provable.Array(Card, FOOL_DECK_SIZE),
}) {}

export class EncryptedCard extends Struct({
    value: Group,
}) {}

export class EncryptedDeck extends Struct({
    cards: Provable.Array(EncryptedCard, FOOL_DECK_SIZE),
    numOfEncryptions: UInt64,
}) {}

enum GameStatus {
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

class GameIndex extends Struct({
    gameId: UInt64,
    index: UInt64,
}) {}

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
    public setup(
        gameId: UInt64,
        newDeck: EncryptedDeck,
        shuffleProof: Proof<any, any>
    ) {
        let game = forceOptionValue(this.games.get(gameId));
        // Check that game in setup status
        assert(game.status.equals(UInt64.from(GameStatus.SETUP)));

        let currentPlayer = this.getUserByIndex(gameId, game.curPlayerIndex);

        // Check if right player runing setup
        assert(currentPlayer.equals(this.transaction.sender));

        // Check shuffle proof
        // #TODO check, that public input equals previous deck
        // Check that number of encryption increased
        shuffleProof.verify();

        // Update deck in games
        game.deck = newDeck;
        game.nextTurn();
        game.status = Provable.if(
            newDeck.numOfEncryptions.equals(game.maxPlayers),
            UInt64.from(GameStatus.GAME),
            game.status
        );

        this.games.set(gameId, game);
    }

    @runtimeMethod()
    public drawCard() {}

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
