import { StateMap } from '@proto-kit/protocol';
import { Bool, Group, Provable, Struct, UInt64, PublicKey, Int64 } from 'o1js';
import { Json } from 'o1js/dist/node/bindings/mina-transaction/gen/transaction';

export const POKER_DECK_SIZE = 52;
export const MIN_VALUE = 2;
export const MAX_VALUE = 15;
export const MAX_COLOR = 4;

export const LAST_ROUND = 4;
export const MAX_PLAYERS = 2;

export const INITAL_BALANCE = 100;

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

  static fromJSONString(data: string): EncryptedCard {
    let { v1, v2, v3, numOfEncryption } = JSON.parse(data);

    return new EncryptedCard({
      value: [Group.fromJSON(v1), Group.fromJSON(v2), Group.fromJSON(v3)],
      numOfEncryption: UInt64.fromJSON(numOfEncryption),
    });
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
  static highId: UInt64 = UInt64.from(0);
  static pairId: UInt64 = UInt64.from(1);
  static twoPairId: UInt64 = UInt64.from(2);
  static threeId: UInt64 = UInt64.from(3);
  static straightId: UInt64 = UInt64.from(4);
  static flushId: UInt64 = UInt64.from(5);
  static fullHouseId: UInt64 = UInt64.from(6);
  static fourId: UInt64 = UInt64.from(7);
  static straightFlushId: UInt64 = UInt64.from(8);

  static zero(): Combination {
    return new Combination({ id: UInt64.zero, value: UInt64.zero });
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

export class GameInfo extends Struct({
  id: UInt64,
  status: UInt64,
  subStatus: UInt64,
  deck: EncryptedDeck,
  curPlayerIndex: UInt64, // Index of current player
  waitDecFrom: UInt64,
  decLeft: UInt64,
  maxPlayers: UInt64,
  lastCardIndex: UInt64,
  agrigatedPubKey: PublicKey,
  round: UInt64,
  highestCombinations: Provable.Array(Combination, 6),
  currentWinner: PublicKey,
  foldsAmount: UInt64,
  curBid: UInt64,
  bank: UInt64,
}) {
  nextPlayer(isFold: StateMap<GameIndex, Bool>) {
    // Bypass protokit simulation with no state. In this case this.maxPlayers == 0, and fails
    let modValue = Provable.if(
      this.maxPlayers.greaterThan(UInt64.zero),
      this.maxPlayers,
      UInt64.from(1),
    );

    this.curPlayerIndex = this.curPlayerIndex.add(1).mod(modValue);

    // Skip folded players
    for (let i = 0; i < MAX_PLAYERS - 1; i++) {
      let gameIndex = new GameIndex({
        gameId: this.id,
        index: this.curPlayerIndex,
      });
      let addValue = Provable.if(
        isFold.get(gameIndex).value,
        UInt64.from(1),
        UInt64.zero,
      );
      this.curPlayerIndex = this.curPlayerIndex.add(addValue).mod(modValue);
    }
  }

  // Give it some normal name
  next() {
    this.round = Provable.if(
      this.decLeft.equals(UInt64.from(1)),
      this.round.add(1),
      this.round,
    );

    this.status = Provable.if(
      this.round.equals(UInt64.from(LAST_ROUND)),
      UInt64.from(GameStatus.ENDING),
      this.status,
    );

    let decLeftSubValue = Provable.if(
      this.decLeft.greaterThan(UInt64.zero),
      UInt64.from(1),
      UInt64.zero,
    );
    this.decLeft = Provable.if(
      this.decLeft.greaterThan(UInt64.from(1)),
      this.decLeft.sub(decLeftSubValue),
      this.maxPlayers.sub(this.foldsAmount),
    );
  }

  checkAndTransistToReveal(userBids: StateMap<GameIndex, UInt64>): void {
    let curUserBid = userBids.get(
      new GameIndex({ gameId: this.id, index: this.curPlayerIndex }),
    ).value;

    let bidFinished = curUserBid.equals(this.curBid);
    this.subStatus = Provable.if(
      bidFinished,
      UInt64.from(GameSubStatus.REVEAL),
      this.subStatus,
    );

    this.curBid = Provable.if(bidFinished, UInt64.zero, this.curBid);
  }

  inBid(): Bool {
    return this.subStatus.equals(UInt64.from(GameSubStatus.BID));
  }

  inReveal(): Bool {
    return this.subStatus.equals(UInt64.from(GameSubStatus.REVEAL));
  }
}

export class GameIndex extends Struct({
  gameId: UInt64,
  index: UInt64,
}) {}

export class UserActionIndex extends Struct({
  gameId: UInt64,
  user: PublicKey,
  phase: UInt64,
}) {}
