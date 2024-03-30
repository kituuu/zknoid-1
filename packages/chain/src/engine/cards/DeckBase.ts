import { Bool, Struct } from 'o1js';
import { IEncrypedCard } from './interfaces/IEncryptedCard';
import { IPermutationMatrix } from './interfaces/IPermutationMatrix';
import { assert } from '@proto-kit/protocol';

export function EncryptedDeckBase<C, EC extends IEncrypedCard<C>>(
  ecType: {
    // Move to interface
    // new (): EC;
    fromJSONString<L>(v: string): EC;
    zero(): EC;
  },
  fields: {
    cards: any;
  },
  deckSize: number,
) {
  return class EncryptedDeckBase extends Struct(fields) {
    static fromJSONString<T extends EncryptedDeckBase>(data: string): T {
      let cards: EC[] = [];
      let cardsJSONs = JSON.parse(data);
      for (let i = 0; i < deckSize; i++) {
        cards.push(ecType.fromJSONString<EC>(cardsJSONs[i]) as EC);
      }

      return <T>new EncryptedDeckBase({
        cards,
      });
    }

    equals(ed: EncryptedDeckBase): Bool {
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

    applyPermutation(permutation: IPermutationMatrix): EncryptedDeckBase {
      if (deckSize != permutation.getSize()) {
        throw Error(
          `deckSize is not equal to permutation size ${deckSize} != ${permutation.getSize()}`,
        );
      }

      let final = EncryptedDeckBase.fromJSONString(this.toJSONString()); // Is it proper copy for proof?

      for (let i = 0; i < permutation.getSize(); i++) {
        let res = ecType.zero();

        for (let j = 0; j < permutation.getSize(); j++) {
          res = res.add(this.cards[j].mul(permutation.getValue(i, j))) as EC;
        }

        final.cards[i] = res;
      }

      return final;
    }
  };
}
