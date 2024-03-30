import { RuntimeModule, runtimeModule, state } from '@proto-kit/module';
import { StateMap } from '@proto-kit/protocol';
import { Group, Proof, PublicKey, Struct, UInt64 } from 'o1js';
import { IEncrypedCard } from './interfaces/IEncryptedCard';
import { ICard } from './interfaces/ICard';

interface IGame {
  agrigatedPublicKey: PublicKey;
}

interface IEncrypedDeck {}

class BasicGame extends Struct({
  agrigatedPublicKey: PublicKey,
}) {}

@runtimeModule()
export class CardGameBase<
  C extends ICard<EC>,
  EC extends IEncrypedCard<C>,
  ED extends IEncrypedDeck,
  G extends IGame,
> extends RuntimeModule<{}> {
  @state() public games = StateMap.from<UInt64, any>(UInt64, BasicGame);

  protected _shuffle(shuffleProof: Proof<any, { newDeck: ED }>): ED {
    // #TODO add checks
    shuffleProof.verify();

    return shuffleProof.publicOutput.newDeck;
  }

  protected _decrypt(
    encryptedCard: IEncrypedCard<any>,
    decryptProof: Proof<any, { decryptedPart: Group }>,
  ) {
    // #TODO add checks
    decryptProof.verify();
    encryptedCard.addDecryption(decryptProof.publicOutput.decryptedPart);
  }

  protected _open(
    encryptedCard: IEncrypedCard<any>,
    decryptProof: Proof<any, { decryptedPart: Group }>,
  ): C {
    this._decrypt(encryptedCard, decryptProof);

    return encryptedCard.toCard();
  }
}
