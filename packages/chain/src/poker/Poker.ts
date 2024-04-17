import { Option, State, StateMap, assert } from '@proto-kit/protocol';
import { MatchMaker, QueueListItem } from '../engine/MatchMaker';
import { state, runtimeMethod, runtimeModule } from '@proto-kit/module';
import { UInt64 as ProtoUInt64 } from '@proto-kit/library';
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
  GameRoundIndex,
  GameStatus,
  GameSubStatus,
  INITAL_BALANCE,
  MAX_COLOR,
  MAX_VALUE,
  MIN_VALUE,
  NO_WINNER_INDEX,
  POKER_DECK_SIZE,
  RoundInfo,
  UserActionIndex,
  WinnerInfo,
} from './types';
import { CombinationProof } from './CombProof';
import { Game } from 'src/examples/BiggerCard/BiggerCards';
import { Lobby } from 'src/engine/LobbyManager';
import { PokerMatchMaker } from './Lobby/PokerMatchMaking';
import { MAX_PLAYERS } from './consts';

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
export class Poker extends PokerMatchMaker {
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
  @state() public userBid = StateMap.from<GameRoundIndex, UInt64>(
    GameRoundIndex,
    UInt64,
  );

  // gameId + userIndex => folded or not
  @state() public isFold = StateMap.from<GameIndex, Bool>(GameIndex, Bool);

  public override initGame(lobby: Lobby, shouldInit: Bool): UInt64 {
    const newId = this.getNextGameId();

    // let opp = Provable.if(
    //   opponent.isSome,
    //   this.userToSession.get(opponent.value.userAddress).orElse(player),
    //   player, // Workaround. PublicKey.zero cannot be transformed to Group elem
    // );

    // assert(
    //   this.userToSession.get(player).value.equals(PublicKey.empty()).not(),
    // );

    // Protokit workaround
    let pubKeyList = lobby.players.map((player) =>
      Provable.if(player.isEmpty(), this.transaction.sender.value, player),
    );

    let agrigatedPubKey = this.getAgrigatedPubKey(pubKeyList);
    let maxPlayers = lobby.curAmount;

    this.games.set(
      Provable.if(shouldInit, newId, UInt64.zero),
      new GameInfo({
        meta: new GameMeta({
          id: newId,
          maxPlayers, // Change depending on opponents count. For now only 2 players
        }),
        deck: initialEnctyptedDeck,
        agrigatedPubKey,
        round: RoundInfo.initial(maxPlayers),
        winnerInfo: WinnerInfo.initial(),
      }),
    );

    /// #TODO Transform to provable
    let players = lobby.players;

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

    return super.initGame(lobby, shouldInit);
  }

  public override getNextGameId(): UInt64 {
    return this.gamesNum.get().orElse(UInt64.from(1));
  }
  public override updateNextGameId(shouldUpdate: Bool): void {
    let curGameId = this.getNextGameId();

    this.gamesNum.set(Provable.if(shouldUpdate, curGameId.add(1), curGameId));
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
    assert(
      game.round.status.equals(UInt64.from(GameStatus.SETUP)),
      'Wrong status',
    );

    let currentPlayer = this.getUserByIndex(gameId, game.round.curPlayerIndex);

    // Check if right player runing setup
    assert(currentPlayer.equals(sender));

    // Check shuffle proof
    shuffleProof.verify();
    assert(shuffleProof.publicInput.initialDeck.equals(game.deck));

    // Update deck in games
    game.deck = shuffleProof.publicOutput.newDeck;
    game.nextPlayer(this.isFold);
    game.round.status = Provable.if(
      game.round.curPlayerIndex.equals(UInt64.from(0)), // turn returned to first player
      UInt64.from(GameStatus.INITIAL_OPEN),
      game.round.status,
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
      phase: game.round.status,
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
  public sendResult(
    gameId: UInt64,
    playerIndex: UInt64,
    proof: CombinationProof,
  ) {
    const sessionSender = this.sessions.get(this.transaction.sender.value);
    const sender = Provable.if(
      sessionSender.isSome,
      sessionSender.value,
      this.transaction.sender.value,
    );

    let userKey = new GameIndex({
      gameId,
      index: playerIndex,
    });

    let player = this.players.get(userKey).value;

    assert(sender.equals(player), 'Wrong player index');

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
      Provable.Array(Combination, 6),
      proof.publicOutput.combinations,
      game.winnerInfo.highestCombinations,
    );
    game.winnerInfo.currentWinner = Provable.if(
      compRes.isPositive(),
      playerIndex,
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

    let userRoundIndex = new GameRoundIndex({
      gameId,
      round: game.round.index,
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
    this.userBid.set(userRoundIndex, amount);

    // Change balances
    // Workaround protokit hard check. It is ok, due to previous check, but should be changed aniway, because its ugly
    let subAmount = Provable.if(
      userBalance.greaterThanOrEqual(amount),
      amount,
      UInt64.zero,
    );
    this.userBalance.set(userIndex, userBalance.sub(subAmount));
    game.round.bank = game.round.bank.add(subAmount);

    // Move to next user
    game.nextPlayer(this.isFold);

    // Update phaze if needed
    game.checkAndTransistToReveal(this.userBid, this.network.block.height);

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
    game.checkAndTransistToReveal(this.userBid, this.network.block.height);
  }

  @runtimeMethod()
  public claimWin(gameId: UInt64, playerIndex: UInt64) {
    // In case others folded
    let game = forceOptionValue(this.games.get(gameId));

    // All others folded
    assert(game.round.foldsAmount.equals(game.meta.maxPlayers.sub(1)));
    const playerKey = new GameIndex({
      gameId,
      index: playerIndex,
    });
    const isPlayerFolded = this.isFold.get(playerKey).value;
    assert(isPlayerFolded.not(), 'Cant claim win for folded user');

    this.startNewRound(game, playerIndex);
    this.games.set(gameId, game);
  }

  @runtimeMethod()
  public endRound(gameId: UInt64) {
    let game = forceOptionValue(this.games.get(gameId));

    assert(game.winnerInfo.timeOutFinished(this.network.block.height));

    // Transfer bank to winner, if it exists. If not money goes to next round bank
    const winner = game.winnerInfo.currentWinner;

    this.startNewRound(game, winner);

    // Update bank, if it was not distributed
    const noWinnerKey = new GameIndex({
      gameId,
      index: UInt64.from(NO_WINNER_INDEX),
    });

    const noWinnerBalance = this.userBalance.get(noWinnerKey).value;
    game.round.bank = noWinnerBalance;
    this.userBalance.set(noWinnerKey, UInt64.zero);
    this.games.set(gameId, game);
  }

  public proveOpponentTimeout(gameId: UInt64): void {}

  // Do not call this.games.set. So it is responsibility of calling contract to call it
  private startNewRound(game: GameInfo, winner: UInt64): void {
    this.payWinner(game, winner);

    // Update round
    game.cleanRoundInfo();

    this.clearFolds(game.meta.id);
  }

  private payWinner(game: GameInfo, index: UInt64): void {
    const winnerKey = new GameIndex({
      gameId: game.meta.id,
      index,
    });
    const curWinnerBalance = this.userBalance.get(winnerKey).value;

    this.userBalance.set(winnerKey, curWinnerBalance.add(game.round.bank));
  }

  private clearFolds(gameId: UInt64): void {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      let key = new GameIndex({
        gameId,
        index: UInt64.from(i),
      });
      this.isFold.set(key, Bool(false));
    }
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

  protected override getParticipationPrice() {
    return ProtoUInt64.from(0);
  }
}
