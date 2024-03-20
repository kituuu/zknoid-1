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
  FoldProof,
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
  GameMeta,
  GameStatus,
  GameSubStatus,
  INITAL_BALANCE,
  MAX_COLOR,
  MAX_VALUE,
  MIN_VALUE,
  POKER_DECK_SIZE,
  RoundInfo,
  UserActionIndex,
  WinnerInfo,
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
    let maxPlayers = UInt64.from(2);

    this.games.set(
      Provable.if(opponentReady, newId, UInt64.zero),
      new GameInfo({
        meta: new GameMeta({
          id: newId,
          maxPlayers, // Change depending on opponents count. For now only 2 players
        }),
        status: UInt64.from(GameStatus.SETUP),
        deck: initialEnctyptedDeck,
        agrigatedPubKey,
        round: RoundInfo.initial(maxPlayers),
        winnerInfo: WinnerInfo.initial(),
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

    let currentPlayer = this.getUserByIndex(gameId, game.round.curPlayerIndex);

    // Check if right player runing setup
    assert(currentPlayer.equals(sender));

    // Check shuffle proof
    shuffleProof.verify();
    assert(shuffleProof.publicInput.initialDeck.equals(game.deck));

    // Update deck in games
    game.deck = shuffleProof.publicOutput.newDeck;
    game.nextPlayer(this.isFold);
    game.status = Provable.if(
      game.round.curPlayerIndex.equals(UInt64.from(0)), // turn returned to first player
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
    game.round.subStatus = Provable.if(
      game.round.index.equals(UInt64.from(1)),
      UInt64.from(GameSubStatus.BID),
      game.round.subStatus,
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

    assert(openProof.publicInput.round.equals(game.round.index));

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
    // Add proof check
    proof.verify();

    let compRes = Combination.arrComp(
      proof.publicOutput.combinations,
      game.winnerInfo.highestCombinations,
    );
    game.winnerInfo.highestCombinations = Provable.if(
      compRes.isPositive(),
      Provable.Array(Combination, 3),
      proof.publicOutput.combinations,
      game.winnerInfo.highestCombinations,
    );
    game.winnerInfo.currentWinner = Provable.if(
      compRes.isPositive(),
      this.transaction.sender.value,
      game.winnerInfo.currentWinner,
    );

    this.games.set(gameId, game);
  }

  @runtimeMethod()
  public bid(gameId: UInt64, amount: UInt64) {
    let game = forceOptionValue(this.games.get(gameId));

    // Get user
    let sender = this.getSender(Bool(true));
    // Check that this it this user turn to bid

    let currentPlayer = this.getUserByIndex(gameId, game.round.curPlayerIndex);

    // Check if right player runing setup
    assert(currentPlayer.equals(sender), 'Wrong player to bid');

    // Check that amount do not exceed user balance
    let userIndex = new GameIndex({
      gameId,
      index: game.round.curPlayerIndex,
    });
    let userBalance = forceOptionValue(this.userBalance.get(userIndex));
    assert(
      userBalance.greaterThanOrEqual(amount),
      'Bid amount exceed user balance',
    );

    // Check that amount greater or equal to previous bid
    assert(
      amount.greaterThanOrEqual(game.round.curBid),
      'Amount less then previous bid',
    );
    // Update bid information
    game.round.curBid = amount;
    this.userBid.set(userIndex, amount);

    // Change balances
    this.userBalance.set(userIndex, userBalance.sub(amount));
    game.round.bank = game.round.bank.add(amount);

    // Move to next user
    game.nextPlayer(this.isFold);

    // Update phaze if needed
    game.checkAndTransistToReveal(this.userBid);

    this.games.set(gameId, game);
  }

  // @runtimeMethod()
  public fold(gameId: UInt64, foldProof: FoldProof) {
    let game = forceOptionValue(this.games.get(gameId));

    // Add profe check
    foldProof.verify();

    // Get user
    let sender = this.getSender(Bool(true));
    // Check that this it this user turn to bid

    let currentPlayer = this.getUserByIndex(gameId, game.round.curPlayerIndex);

    // Check if right player runing setup
    assert(currentPlayer.equals(sender), 'Wrong player to bid');

    const decryptedValues = foldProof.publicOutput.decryptedValues;

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

    let userIndex = new GameIndex({
      gameId,
      index: game.round.curPlayerIndex,
    });

    this.isFold.set(userIndex, Bool(true));
    game.round.foldsAmount = game.round.foldsAmount.add(1);

    game.nextPlayer(this.isFold);

    // Update phaze if needed
    game.checkAndTransistToReveal(this.userBid);
  }

  @runtimeMethod()
  public claimWin(gameId: UInt64) {
    // In case others folded
  }

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
