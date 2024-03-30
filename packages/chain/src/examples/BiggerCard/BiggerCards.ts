import {
  RuntimeModule,
  runtimeMethod,
  runtimeModule,
  state,
} from '@proto-kit/module';
import { StateMap } from '@proto-kit/protocol';
import { Group, Provable, PublicKey, Struct, UInt64 } from 'o1js';
import { CardGameBase } from '../../engine/cards/CardGameBase';
import {
  PokerCard,
  PokerDecryptProof,
  PokerEncryptedCard,
  PokerEncryptedDeck,
  PokerShuffleProof,
} from '../../engine/cards/DefaultCards';

export const GameStatuses = {
  INIT: UInt64.from(0),
  SETUP: UInt64.from(1),
  REVEAL: UInt64.from(2),
  FINISHED: UInt64.from(3),
};

const MAX_PLAYERS = UInt64.from(2);

export class Game extends Struct({
  id: UInt64,
  status: UInt64,
  agrigatedPublicKey: PublicKey,
  encryptedDeck: PokerEncryptedDeck, // Wrong type somehow
  waitNum: UInt64,
  firstPlayer: PublicKey,
  secondPlayer: PublicKey,
  winner: PublicKey,
}) {
  next(): void {
    this.waitNum = this.waitNum.add(1);
    const allPlayersMoved = this.waitNum.equals(MAX_PLAYERS);
    this.status = Provable.if(allPlayersMoved, this.status.add(1), this.status);
    this.waitNum = Provable.if(allPlayersMoved, UInt64.zero, this.waitNum);
  }
}

interface AConfig {}

@runtimeModule()
export class A extends RuntimeModule<AConfig> {}

@runtimeModule()
export class BiggerCard
  extends CardGameBase<PokerCard, PokerEncryptedCard, PokerEncryptedDeck, Game>
  implements RuntimeModule<{}>
{
  @state() public games = StateMap.from<UInt64, Game>(UInt64, Game as any); // ?

  @runtimeMethod()
  public participate(gameId: UInt64) {
    // Game game from contract
    let game = this.games.get(gameId).value;
    console.log(game);

    // Check that staus is init
    expect(game.status.equals(GameStatuses.INIT));

    // Add sender private key to agrigated public key
    const sender = this.transaction.sender.value;

    let pubKey = Provable.if(
      game.agrigatedPublicKey.isEmpty(),
      sender,
      game.agrigatedPublicKey,
    );
    let intialGroupValue = Provable.if(
      game.agrigatedPublicKey.isEmpty(),
      Group.zero,
      pubKey.toGroup(),
    );

    game.agrigatedPublicKey = PublicKey.fromGroup(
      intialGroupValue.add(sender.toGroup()),
    );

    game.firstPlayer = Provable.if(
      game.waitNum.equals(UInt64.from(0)),
      sender,
      game.firstPlayer,
    );
    game.secondPlayer = Provable.if(
      game.waitNum.equals(UInt64.from(1)),
      sender,
      game.secondPlayer,
    );

    game.next();

    this.games.set(gameId, game);
  }

  @runtimeMethod()
  public shuffle(gameId: UInt64, shuffleProof: PokerShuffleProof) {
    let game = this.games.get(gameId).value;

    expect(game.status.equals(GameStatuses.SETUP));

    // #TODO add checks
    const newEncryptedDeck = this._shuffle(shuffleProof);

    game.encryptedDeck = newEncryptedDeck;

    console.log('Contract');
    console.log(game.encryptedDeck.cards[0].value[0].x.toString());
    console.log(game.encryptedDeck.cards[0].numOfEncryption.toString());

    game.next();

    this.games.set(gameId, game);
  }

  @runtimeMethod()
  public openCardsFirstTwo(
    gameId: UInt64,
    firstProof: PokerDecryptProof,
    secodProof: PokerDecryptProof,
  ) {
    let game = this.games.get(gameId).value;
    expect(game.status.equals(GameStatuses.REVEAL));

    this._decrypt(game.encryptedDeck.cards[0], firstProof);
    this._decrypt(game.encryptedDeck.cards[1], secodProof);

    game.next();

    this.games.set(gameId, game);
  }

  @runtimeMethod()
  public pickWinner(gameId: UInt64) {
    let game = this.games.get(gameId).value;

    expect(game.status.equals(GameStatuses.FINISHED));

    const firstCard = game.encryptedDeck.cards[0];
    const secondCard = game.encryptedDeck.cards[1];

    const firstCardDecoded = firstCard.toCard();
    const secondCardDecoded = secondCard.toCard();

    const firstWin = firstCardDecoded.value.greaterThenOrEqual(
      secondCardDecoded.value,
    );

    game.winner = Provable.if(firstWin, game.firstPlayer, game.secondPlayer);

    this.games.set(gameId, game);
  }
}
