import { StateMap } from '@proto-kit/protocol';
import {
  Bool,
  Group,
  Provable,
  Struct,
  UInt64,
  PublicKey,
  Int64,
  PrivateKey,
} from 'o1js';
import { Json } from 'o1js/dist/node/bindings/mina-transaction/gen/transaction';
import { decryptOne } from '../engine/ElGamal';

export const POKER_DECK_SIZE = 52;
export const MIN_VALUE = 2;
export const MAX_VALUE = 15;
export const MAX_COLOR = 4;

export const LAST_ROUND = 4;
export const MAX_PLAYERS = 2;

export const INITAL_BALANCE = 100;

export const WIN_CLAIM_TIMEOUT_IN_BLOCKS = 10;

export const NO_WINNER_INDEX = Number.MAX_SAFE_INTEGER;

const boolToInt = (b: Bool): Int64 => {
  return Provable.if(b, Int64.from(1), Int64.from(-1));
};

// May be do it not Struct. It is used only fo initialization and web
export class Card extends Struct({
  value: UInt64, // TODO check value \in [2, 14]
  color: UInt64, // TODO check value \in [0, 3]
}) {
  toEncryptedCard(): EncryptedCard {
    return new EncryptedCard({
      value: [
        Group.zero,
        Group.generator.scale(
          +this.value.toString() * 4 + +this.color.toString() + 1, // +1 so no zero point
        ),
        Group.zero,
        // Group.generator.scale(+this.value.toString()), // It is ok as long as Card is not used in contract and proofs
        // Group.generator.scale(+this.color.toString()),
      ],
      numOfEncryption: UInt64.zero,
    });
  }

  getIndex(): UInt64 {
    return this.value.mul(MAX_COLOR).add(this.color);
  }

  toString(): string {
    return `Value: ${this.value.toString()}. Color: ${this.color.toString()}`;
  }
}

export class Deck extends Struct({
  cards: Provable.Array(Card, POKER_DECK_SIZE),
}) {}

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

const permutateArray = <T>(array: T[]): T[] => {
  /// Copy array
  let rest = array.slice();
  let res: T[] = [];

  while (rest.length > 0) {
    let randomIndex = getRandomInt(rest.length);
    res.push(rest.splice(randomIndex, 1)[0]);
  }

  return res;
};

export class PermutationMatrix extends Struct({
  value: Provable.Array(
    Provable.Array(UInt64, POKER_DECK_SIZE),
    POKER_DECK_SIZE,
  ),
}) {
  static getZeroMatrix(): PermutationMatrix {
    return new PermutationMatrix({
      value: [...Array(POKER_DECK_SIZE).keys()].map((i) => {
        let row = new Array(POKER_DECK_SIZE).fill(UInt64.zero);
        row[i] = UInt64.one;
        return row;
      }),
    });
  }

  static getRandomMatrix(): PermutationMatrix {
    let initital = PermutationMatrix.getZeroMatrix();
    return new PermutationMatrix({ value: permutateArray(initital.value) });
  }

  toString(): string {
    return this.value
      .map((row) => row.map((value) => +value.toString()))
      .reduce((prev, cur) => prev + '\n' + cur.toString(), '');
  }
}

export class EncryptedCard extends Struct({
  value: [Group, Group, Group], // Change to provable array, or to new Type
  numOfEncryption: UInt64,
}) {
  static zero(): EncryptedCard {
    return new EncryptedCard({
      value: [Group.zero, Group.zero, Group.zero],
      numOfEncryption: UInt64.zero,
    });
  }
  static fromJSONString(data: string): EncryptedCard {
    let { v1, v2, v3, numOfEncryption } = JSON.parse(data);

    return new EncryptedCard({
      value: [Group.fromJSON(v1), Group.fromJSON(v2), Group.fromJSON(v3)],
      numOfEncryption: UInt64.fromJSON(numOfEncryption),
    });
  }

  // !Equals do not check this.value[2]!
  equals(ec: EncryptedCard): Bool {
    return this.value[0]
      .equals(ec.value[0])
      .and(this.value[1].equals(ec.value[1]))
      .and(this.numOfEncryption.equals(ec.numOfEncryption));
  }

  toJSONString(): string {
    let v1 = this.value[0].toJSON();
    let v2 = this.value[1].toJSON();
    let v3 = this.value[2].toJSON();
    let numOfEncryption = this.numOfEncryption.toJSON();

    return JSON.stringify({ v1, v2, v3, numOfEncryption });
  }

  copy(): EncryptedCard {
    return EncryptedCard.fromJSONString(this.toJSONString());
  }

  // Used for permutation. Do not make sense otherwise
  mul(num: UInt64): EncryptedCard {
    num.assertLessThan(UInt64.from(2));
    return Provable.if(
      num.equals(UInt64.zero),
      EncryptedCard,
      EncryptedCard.zero(),
      this,
    ) as EncryptedCard;
  }
  // Used for permutation. Do not make sense otherwise
  add(ec: EncryptedCard): EncryptedCard {
    return new EncryptedCard({
      value: [
        this.value[0].add(ec.value[0]),
        this.value[1].add(ec.value[1]),
        this.value[2].add(ec.value[2]),
      ],
      numOfEncryption: this.numOfEncryption.add(ec.numOfEncryption),
    });
  }

  // No checking!
  decrypt(sk: PrivateKey) {
    this.value[2] = this.value[2].add(decryptOne(sk, this.value[0]));
    this.numOfEncryption = this.numOfEncryption.sub(UInt64.from(1));
  }

  toCard(): Card {
    this.numOfEncryption.assertEquals(UInt64.zero);

    let groupVal = this.value[1].sub(this.value[2]);
    let curV = Group.generator;
    let value = 0;
    let color = 0;
    let found = false;
    for (let i = 0; i < MAX_VALUE * MAX_COLOR; i++) {
      if (curV.equals(groupVal).toBoolean()) {
        found = true;
        break;
      }

      curV = curV.add(Group.generator);
      color++;
      value += Math.floor(color / MAX_COLOR);
      color = color % MAX_COLOR;
    }

    // if (!found) {
    //     throw Error('Card cannot be decrypted');
    // }

    return new Card({
      value: UInt64.from(value),
      color: UInt64.from(color),
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
      cards.push(EncryptedCard.fromJSONString(cardsJSONs[i]) as EncryptedCard);
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

  applyPermutation(permutation: PermutationMatrix): EncryptedDeck {
    let final = EncryptedDeck.fromJSONString(this.toJSONString()); // Is it proper copy for proof?

    for (let i = 0; i < permutation.value.length; i++) {
      let res = EncryptedCard.zero();
      let curRow = permutation.value[i];

      for (let j = 0; j < permutation.value[i].length; j++) {
        res = res.add(this.cards[j].mul(curRow[j]));
      }

      final.cards[i] = res;
    }

    return final;
  }
}

export class Combination extends Struct({
  id: UInt64,
  value: UInt64,
}) {
  static emptyId: UInt64 = UInt64.zero;
  static highId: UInt64 = UInt64.from(1);
  static pairId: UInt64 = UInt64.from(2);
  static twoPairId: UInt64 = UInt64.from(3);
  static threeId: UInt64 = UInt64.from(4);
  static straightId: UInt64 = UInt64.from(5);
  static flushId: UInt64 = UInt64.from(6);
  static fullHouseId: UInt64 = UInt64.from(7);
  static fourId: UInt64 = UInt64.from(8);
  static straightFlushId: UInt64 = UInt64.from(9);

  static zero(): Combination {
    return new Combination({ id: Combination.emptyId, value: UInt64.zero });
  }

  static arrComp(v1: Combination[], v2: Combination[]): Int64 {
    let decided = Bool(false);
    let res = Int64.from(0);

    for (let i = 0; i < v1.length; i++) {
      let greater = v1[i].greaterThen(v2[i]);
      let equal = v1[i].equals(v2[i]);
      let newDecided = decided.or(equal.not());
      res = Provable.if(
        newDecided.equals(decided).not(),
        boolToInt(greater),
        res,
      );
      decided = decided.or(greater);
    }

    return res;
  }

  greaterThen(c: Combination): Bool {
    return this.id
      .greaterThan(c.id)
      .or(this.id.equals(c.id).and(this.value.greaterThan(c.value)));
  }

  equals(c: Combination): Bool {
    return this.id.equals(c.id).and(this.value.equals(c.value));
  }
}

export enum GameStatus {
  SETUP,
  INITIAL_OPEN,
  GAME,
  ENDING,
}

export enum GameSubStatus {
  NONE,
  REVEAL,
  BID,
}

export class WinnerInfo extends Struct({
  highestCombinations: Provable.Array(Combination, 6),
  currentWinner: UInt64,
  timeOutStated: Bool,
  timeOutStartBlock: UInt64,
}) {
  static initial(): WinnerInfo {
    return new WinnerInfo({
      highestCombinations: [...Array(6)].map(Combination.zero),
      currentWinner: UInt64.from(NO_WINNER_INDEX),
      timeOutStated: Bool(false),
      timeOutStartBlock: UInt64.from(0),
    });
  }

  startCountdown(shouldStart: Bool, blockHeight: UInt64): void {
    this.timeOutStated = shouldStart; // Can it be overwriten?
    this.timeOutStartBlock = blockHeight;
  }

  timeOutFinished(curBlock: UInt64): Bool {
    return this.timeOutStated.and(
      curBlock.greaterThan(
        this.timeOutStartBlock.add(WIN_CLAIM_TIMEOUT_IN_BLOCKS),
      ),
    );
  }
}

export class GameMeta extends Struct({
  id: UInt64,
  maxPlayers: UInt64,
}) {}

export class RoundInfo extends Struct({
  index: UInt64,
  status: UInt64,
  subStatus: UInt64,
  curPlayerIndex: UInt64,
  decLeft: UInt64,
  foldsAmount: UInt64,
  curBid: UInt64,
  bank: UInt64,
}) {
  static initial(maxPlayers: UInt64): RoundInfo {
    return new RoundInfo({
      index: UInt64.zero,
      status: UInt64.from(GameStatus.SETUP),
      subStatus: UInt64.from(GameSubStatus.NONE),
      curPlayerIndex: UInt64.zero,
      decLeft: maxPlayers,
      foldsAmount: UInt64.zero,
      curBid: UInt64.zero,
      bank: UInt64.zero,
    });
  }
}

export class GameInfo extends Struct({
  meta: GameMeta,
  deck: EncryptedDeck,
  agrigatedPubKey: PublicKey,
  round: RoundInfo,
  winnerInfo: WinnerInfo,
}) {
  nextPlayer(isFold: StateMap<GameIndex, Bool>) {
    // Bypass protokit simulation with no state. In this case this.maxPlayers == 0, and fails
    let modValue = Provable.if(
      this.meta.maxPlayers.greaterThan(UInt64.zero),
      this.meta.maxPlayers,
      UInt64.from(1),
    );

    this.round.curPlayerIndex = this.round.curPlayerIndex.add(1).mod(modValue);

    // Skip folded players
    for (let i = 0; i < MAX_PLAYERS - 1; i++) {
      let gameIndex = new GameIndex({
        gameId: this.meta.id,
        index: this.round.curPlayerIndex,
      });
      let addValue = Provable.if(
        isFold.get(gameIndex).value,
        UInt64.from(1),
        UInt64.zero,
      );
      this.round.curPlayerIndex = this.round.curPlayerIndex
        .add(addValue)
        .mod(modValue);
    }
  }

  // Give it some normal name
  next() {
    let decLeftSubValue = Provable.if(
      this.round.decLeft.greaterThan(UInt64.zero),
      UInt64.from(1),
      UInt64.zero,
    );

    this.round.subStatus = Provable.if(
      this.round.decLeft.greaterThan(UInt64.from(1)),
      this.round.subStatus,
      UInt64.from(GameSubStatus.BID),
    );

    this.round.decLeft = Provable.if(
      this.round.decLeft.greaterThan(UInt64.from(1)),
      this.round.decLeft.sub(decLeftSubValue),
      this.meta.maxPlayers.sub(this.round.foldsAmount),
    );
  }

  checkAndTransistToReveal(
    userBids: StateMap<GameRoundIndex, UInt64>,
    blockHeight: UInt64,
  ): void {
    let curUserBid = userBids.get(
      new GameRoundIndex({
        gameId: this.meta.id,
        round: this.round.index,
        index: this.round.curPlayerIndex,
      }),
    ).value;

    let bidFinished = curUserBid.equals(this.round.curBid);

    this.round.index = Provable.if(
      bidFinished,
      this.round.index.add(1),
      this.round.index,
    );

    const isLastRound = this.round.index.equals(UInt64.from(LAST_ROUND));
    this.round.status = Provable.if(
      isLastRound,
      UInt64.from(GameStatus.ENDING),
      this.round.status,
    );

    this.winnerInfo.startCountdown(isLastRound, blockHeight);

    this.round.subStatus = Provable.if(
      bidFinished,
      UInt64.from(GameSubStatus.REVEAL),
      this.round.subStatus,
    );

    this.round.curBid = Provable.if(
      bidFinished,
      UInt64.zero,
      this.round.curBid,
    );
  }

  inBid(): Bool {
    return this.round.subStatus.equals(UInt64.from(GameSubStatus.BID));
  }

  inReveal(): Bool {
    return this.round.subStatus.equals(UInt64.from(GameSubStatus.REVEAL));
  }

  cleanRoundInfo(): void {
    this.round = RoundInfo.initial(this.meta.maxPlayers);
    this.winnerInfo = WinnerInfo.initial();
  }
}

export class GameIndex extends Struct({
  gameId: UInt64,
  index: UInt64,
}) {}

export class GameRoundIndex extends Struct({
  gameId: UInt64,
  round: UInt64,
  index: UInt64,
}) {}

export class UserActionIndex extends Struct({
  gameId: UInt64,
  user: PublicKey,
  phase: UInt64,
}) {}
