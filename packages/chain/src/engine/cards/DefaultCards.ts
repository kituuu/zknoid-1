import { Field, Group, Struct, UInt64 } from 'o1js';
import { EncryptedCardBase } from './EncryptedCardBase';
import { ICard } from './interfaces/ICard';
import { toEncryptedCardHelper } from './CardBase';
import { IEncrypedCard } from './interfaces/IEncryptedCard';

const POKER_MAX_COLOR = 4;
const POKER_MAX_VALUE = 15;

export class PokerCard
  extends Struct({
    value: UInt64, // TODO check value \in [2, 14]
    color: UInt64, // TODO check value \in [0, 3]
  })
  implements ICard<PokerEncryptedCard>
{
  toEncryptedCard(): PokerEncryptedCard {
    return toEncryptedCardHelper(PokerEncryptedCard, this.getIndex());
  }

  getIndex(): UInt64 {
    return this.value.mul(POKER_MAX_COLOR).add(this.color);
  }

  toString(): string {
    return `Value: ${this.value.toString()}. Color: ${this.color.toString()}`;
  }
}

class PokerEncryptedCard
  extends EncryptedCardBase
  implements IEncrypedCard<PokerCard>
{
  toCard(): PokerCard {
    this.numOfEncryption.assertEquals(UInt64.zero);

    let groupVal = this.value[1].sub(this.value[2]);
    let curV = Group.generator;
    let value = 0;
    let color = 0;
    let found = false;
    for (let i = 0; i < POKER_MAX_VALUE * POKER_MAX_COLOR; i++) {
      if (curV.equals(groupVal).toBoolean()) {
        found = true;
        break;
      }

      curV = curV.add(Group.generator);
      color++;
      value += Math.floor(color / POKER_MAX_COLOR);
      color = color % POKER_MAX_COLOR;
    }

    // if (!found) {
    //     throw Error('Card cannot be decrypted');
    // }

    return new PokerCard({
      value: UInt64.from(value),
      color: UInt64.from(color),
    });
  }
}
