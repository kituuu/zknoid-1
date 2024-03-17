import { Option, State, StateMap, assert } from '@proto-kit/protocol';
import { MatchMaker, QueueListItem } from '../engine/MatchMaker';
import { state, runtimeMethod, runtimeModule } from '@proto-kit/module';
import {
  Bool,
  Experimental,
  Group,
  Int64,
  Proof,
  Provable,
  PublicKey,
  Struct,
  UInt64,
} from 'o1js';
import { ShuffleProof } from './ShuffleProof';
import {
  DecryptProof,
  InitialOpenProof,
  PublicOpenProof,
} from './DecryptProof';
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
  UserActionIndex,
} from './types';

const MAX_PLAYERS = 2;

function forceOptionValue<T>(o: Option<T>): T {
  assert(o.isSome, 'forceOptionValue fail. Trying to access unitialized value');
  return o.value;
}

export const initialEnctyptedDeck = new EncryptedDeck({
  cards: [...Array(MAX_VALUE - MIN_VALUE).keys()].flatMap((value) => {
    return [...Array(MAX_COLOR).keys()].map((color) => {
      return new Card({
        value: UInt64.from(value + MIN_VALUE),
        color: UInt64.from(color),
      }).toEncryptedCard();
    });
  }),
});

export class RoundIndexes extends Struct({
  values: Provable.Array(Int64, 3),
}) {
  static from(values: number[]): RoundIndexes {
    return new RoundIndexes({
      values: values.map((v: number) => Int64.from(v)),
    });
  }
}

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
    PublicKey,
  );

  // #TODO remove
  // [GameId, cardIndex] => player
  @state() public kardToPlayer = StateMap.from<GameIndex, PublicKey>(
    GameIndex,
    PublicKey,
  );

  @state() public userActionsDone = StateMap.from<UserActionIndex, Bool>(
    UserActionIndex,
    Bool,
  );

  public override initGame(
    opponentReady: Bool,
    opponent: Option<QueueListItem>,
  ): UInt64 {
    let newId = this.lastGameId.get().orElse(UInt64.from(0));
    this.lastGameId.set(newId.add(1));

    let opp = Provable.if(
      opponent.isSome,
      this.userToSession
        .get(opponent.value.userAddress)
        .orElse(this.transaction.sender.value),
      this.transaction.sender.value, // Workaround. PublicKey.zero cannot be transformed to Group elem
    );

    assert(
      this.userToSession
        .get(this.transaction.sender.value)
        .value.equals(PublicKey.empty())
        .not(),
    );

    let pubKeyList = [
      this.userToSession
        .get(this.transaction.sender.value)
        .orElse(this.transaction.sender.value),
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
        decLeft: UInt64.from(2),
        maxPlayers: UInt64.from(2), // Change depending on opponents count. For now only 2 players
        lastCardIndex: UInt64.zero,
        agrigatedPubKey,
        round: UInt64.zero,
      }),
    );

    /// #TODO Transform to provable
    let players = [opponent.value.userAddress, this.transaction.sender.value];

    for (let i = 0; i < players.length; i++) {
      this.players.set(
        new GameIndex({
          gameId: newId,
          index: UInt64.from(i),
        }),
        players[i],
      );
    }

    return UInt64.from(newId);
  }

  // #TODO change to provable
  private getAgrigatedPubKey(pubKeys: PublicKey[]): PublicKey {
    return PublicKey.fromGroup(
      pubKeys
        .map((val) => val.toGroup())
        .reduce((acc, val) => acc.add(val), Group.zero),
    );
  }

  // Can be made parallel
  @runtimeMethod()
  public setup(gameId: UInt64, shuffleProof: ShuffleProof) {
    const sessionSender = this.sessions.get(this.transaction.sender.value);
    const sender = Provable.if(
      sessionSender.isSome,
      sessionSender.value,
      this.transaction.sender.value,
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
      UInt64.from(GameStatus.INITIAL_OPEN),
      game.status,
    );

    this.games.set(gameId, game);
  }

  // Open 2 shared cards and all cards of oponents
  @runtimeMethod()
  public initialOpen(gameId: UInt64, initOpenProof: InitialOpenProof) {
    let game = forceOptionValue(this.games.get(gameId));
    // assert(game.status.equals(UInt64.from(GameStatus.INITIAL_OPEN)));

    const sessionSender = this.sessions.get(this.transaction.sender.value);
    const sender = Provable.if(
      sessionSender.isSome,
      sessionSender.value,
      this.transaction.sender.value,
    );

    initOpenProof.verify();

    // Check that cards are the same
    // assert(initOpenProof.publicInput.deck.equals(game.deck));

    // Check that this user has not done this already
    let uii = new UserActionIndex({
      gameId,
      user: sender,
      phase: game.status,
    });

    assert(this.userActionsDone.get(uii).isSome.not());
    // this.userActionsDone.set(uii, Bool(true));

    const decryptedValues = initOpenProof.publicOutput.decryptedValues;

    for (let i = 0; i < POKER_DECK_SIZE; i++) {
      let prevNumOfEncryption = game.deck.cards[i].numOfEncryption;
      // Workaround protokit simulation with no state
      let subValue = Provable.if(
        prevNumOfEncryption
          .greaterThan(UInt64.zero)
          .and(decryptedValues[i].equals(Group.zero).not()),
        UInt64.from(1),
        UInt64.zero,
      );
      game.deck.cards[i].value[2] = game.deck.cards[i].value[2].add(
        decryptedValues[i],
      );
      game.deck.cards[i].numOfEncryption =
        game.deck.cards[i].numOfEncryption.sub(subValue);
    }

    // #TODO move to separate function
    game.round = Provable.if(
      game.decLeft.equals(UInt64.from(1)),
      game.round.add(1),
      game.round,
    );

    let decLeftSubValue = Provable.if(
      game.decLeft.greaterThan(UInt64.zero),
      UInt64.from(1),
      UInt64.zero,
    );
    game.decLeft = Provable.if(
      game.decLeft.greaterThan(UInt64.from(1)),
      game.decLeft.sub(decLeftSubValue),
      game.maxPlayers,
    );

    this.games.set(gameId, game);
  }

  @runtimeMethod()
  public openNext(gameId: UInt64, openProof: PublicOpenProof) {
    let game = forceOptionValue(this.games.get(gameId));
    openProof.verify();
    // assert(game.deck.equals(openProof.publicInput.deck))

    // Check indexes
    let indexes = this.getRoundIndexes(game.round);
    openProof.publicInput.indexes;

    const decryptedValues = openProof.publicOutput.decryptedValues;

    for (let i = 0; i < POKER_DECK_SIZE; i++) {
      let prevNumOfEncryption = game.deck.cards[i].numOfEncryption;
      // Workaround protokit simulation with no state
      let subValue = Provable.if(
        prevNumOfEncryption
          .greaterThan(UInt64.zero)
          .and(decryptedValues[i].equals(Group.zero).not()),
        UInt64.from(1),
        UInt64.zero,
      );
      game.deck.cards[i].value[2] = game.deck.cards[i].value[2].add(
        decryptedValues[i],
      );
      game.deck.cards[i].numOfEncryption =
        game.deck.cards[i].numOfEncryption.sub(subValue);
    }

    game.round = Provable.if(
      game.decLeft.equals(UInt64.from(1)),
      game.round.add(1),
      game.round,
    );

    let decLeftSubValue = Provable.if(
      game.decLeft.greaterThan(UInt64.zero),
      UInt64.from(1),
      UInt64.zero,
    );
    game.decLeft = Provable.if(
      game.decLeft.greaterThan(UInt64.from(1)),
      game.decLeft.sub(decLeftSubValue),
      game.maxPlayers,
    );

    this.games.set(gameId, game);
  }

  /*
  @runtimeMethod()
  public drawCard(gameId: UInt64) {
    let game = forceOptionValue(this.games.get(gameId));
    let currentPlayer = this.getUserByIndex(gameId, game.curPlayerIndex);

    // Check if right player runing setup
    assert(currentPlayer.equals(this.transaction.sender.value));

    this.kardToPlayer.set(
      new GameIndex({
        gameId,
        index: game.lastCardIndex,
      }),
      this.transaction.sender.value,
    );

    game.lastCardIndex = game.lastCardIndex.add(1);
    game.nextTurn();
  }
  */

  // Do not check for recall.
  @runtimeMethod()
  public decryptCard(
    gameId: UInt64,
    cardId: UInt64,
    decryptProof: DecryptProof,
  ) {
    let game = forceOptionValue(this.games.get(gameId));
    let card = game.deck.cards[+cardId.toString()]; // Unprovable. Change to provable version
    assert(card.value[0].equals(decryptProof.publicInput.m0));

    decryptProof.verify();
    game.deck.cards[+cardId.toString()].value[2] = game.deck.cards[
      +cardId.toString()
    ].value[2].add(decryptProof.publicOutput.decryptedPart);

    let prevNumOfEncryption =
      game.deck.cards[+cardId.toString()].numOfEncryption;
    // Workaround protokit simulation with no state
    let subValue = Provable.if(
      prevNumOfEncryption.greaterThan(UInt64.zero),
      UInt64.from(1),
      UInt64.zero,
    );

    game.deck.cards[+cardId.toString()].numOfEncryption =
      game.deck.cards[+cardId.toString()].numOfEncryption.sub(subValue);
    this.games.set(gameId, game);
  }

  // // #TODO check if array is provable. Change if it is not
  // @runtimeMethod()
  // public decryptMultipleCards(
  //     gameId: UInt64,
  //     cardsId: UInt64[],
  //     decryptProofs: DecryptProof[]
  // ) {
  //     for (let i = 0; i < cardsId.length; i++) {
  //         this.decryptCard(gameId, cardsId[i], decryptProofs[i]);
  //     }
  // }

  private getUserByIndex(gameId: UInt64, index: UInt64): PublicKey {
    return forceOptionValue(
      this.players.get(
        new GameIndex({
          gameId,
          index,
        }),
      ),
    );
  }

  /// First 5 cards [0, 4] are common cards
  /// Next card are players cards [5, 6] - 1st player, [7, 8] - second and so on
  /// Returns 0 if it is common card, userId +1 if it is card of userId
  private getCardOwner(gameId: UInt64, index: UInt64): UInt64 {
    let value = Provable.if(
      index.lessThan(UInt64.from(5)),
      UInt64.zero,
      index.sub(UInt64.from(5)).div(UInt64.from(2)).add(UInt64.from(1)),
    );

    return value;
  }
  private getRoundIndexes(round: UInt64): RoundIndexes {
    const firstTurn = RoundIndexes.from([0, 1, 2]);
    const secondTurn = RoundIndexes.from([3, -1, -1]);
    const thirdTurn = RoundIndexes.from([4, -1, -1]);
    const isFirst = round.equals(UInt64.from(1));
    const isSecond = round.equals(UInt64.from(2));
    const isThird = round.equals(UInt64.from(3));

    return Provable.switch([isFirst, isSecond, isThird], RoundIndexes, [
      firstTurn,
      secondTurn,
      thirdTurn,
    ]);
  }
}
