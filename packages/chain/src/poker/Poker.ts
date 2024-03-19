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
  Combination,
  EncryptedCard,
  EncryptedDeck,
  GameIndex,
  GameInfo,
  GameStatus,
  GameSubStatus,
  INITAL_BALANCE,
  MAX_COLOR,
  MAX_VALUE,
  MIN_VALUE,
  POKER_DECK_SIZE,
  UserActionIndex,
} from './types';
import { CombinationProof } from './CombProof';

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

  // gameId + userIndex => gameBalance
  @state() public userBalance = StateMap.from<GameIndex, UInt64>(
    GameIndex,
    UInt64,
  );
  @state() public userBid = StateMap.from<GameIndex, UInt64>(GameIndex, UInt64);

  // gameId + userIndex => folded or not
  @state() public isFold = StateMap.from<GameIndex, Bool>(GameIndex, Bool);

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
        id: newId,
        status: UInt64.from(GameStatus.SETUP),
        subStatus: UInt64.from(GameSubStatus.NONE),
        deck: initialEnctyptedDeck,
        curPlayerIndex: UInt64.zero,
        waitDecFrom: UInt64.zero,
        decLeft: UInt64.from(2),
        maxPlayers: UInt64.from(2), // Change depending on opponents count. For now only 2 players
        lastCardIndex: UInt64.zero,
        agrigatedPubKey,
        round: UInt64.zero,
        highestCombinations: [...Array(6)].map(Combination.zero),
        currentWinner: PublicKey.empty(),
        foldsAmount: UInt64.zero,
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

    for (let i = 0; i < players.length; i++) {
      this.userBalance.set(
        new GameIndex({
          gameId: newId,
          index: UInt64.from(i),
        }),
        UInt64.from(INITAL_BALANCE),
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
    game.nextPlayer(this.isFold);
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

    game.next();
    game.subStatus = Provable.if(
      game.round.equals(UInt64.from(1)),
      UInt64.from(GameSubStatus.BID),
      game.subStatus,
    );

    this.games.set(gameId, game);
  }

  @runtimeMethod()
  public openNext(gameId: UInt64, openProof: PublicOpenProof) {
    let game = forceOptionValue(this.games.get(gameId));
    openProof.verify();
    // assert(game.deck.equals(openProof.publicInput.deck))
    assert(game.inReveal());

    // Check indexes
    // let indexes = getRoundIndexes(game.round);

    assert(openProof.publicInput.round.equals(game.round));

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

    game.next();

    this.games.set(gameId, game);
  }

  @runtimeMethod()
  public sendResult(gameId: UInt64, proof: CombinationProof) {
    // #TODO check for user

    let game = forceOptionValue(this.games.get(gameId));
    proof.verify();

    let compRes = Combination.arrComp(
      proof.publicOutput.combinations,
      game.highestCombinations,
    );
    game.highestCombinations = Provable.if(
      compRes.isPositive(),
      Provable.Array(Combination, 3),
      proof.publicOutput.combinations,
      game.highestCombinations,
    );
    game.currentWinner = Provable.if(
      compRes.isPositive(),
      this.transaction.sender.value,
      game.currentWinner,
    );

    this.games.set(gameId, game);
  }

  @runtimeMethod()
  public bid(gameId: UInt64, amount: UInt64) {
    // Get user
    // Check that this it this user turn to bid
    // Check that amount do not exceed user balance
    // Check that amount greater or equal to previous bid
    // Update bid information
    // Change balances
    // Move to next user
    // Update phaze if needed
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
}
