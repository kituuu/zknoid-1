import { fetchAccount, Field, Bool, UInt64, PrivateKey, PublicKey } from 'o1js';

import type {
  PokerWorkerRequest,
  PokerWorkerReponse,
  WorkerFunctions,
} from './pokerWorker';
import {
  Bricks,
  EncryptedCard,
  EncryptedDeck,
  GameInputs,
  checkGameRecord,
} from 'zknoid-chain-dev';
import { GameRecordProof } from 'zknoid-chain';
import { ShuffleProof } from 'zknoid-chain-dev/dist/src/poker/ShuffleProof';
import {
  DecryptProof,
  InitialOpenProof,
} from 'zknoid-chain-dev/dist/src/poker/DecryptProof';

export default class PokerWorkerClient {
  // loadContracts() {
  //   return this._call('loadContracts', {});
  // }
  // compileContracts() {
  //   return this._call('compileContracts', {});
  // }
  // initZkappInstance(bridgePublicKey58: string) {
  //   return this._call('initZkappInstance', { bridgePublicKey58 });
  // }
  // bridge(amount: UInt64) {
  //   return this._call('bridge', { amount });
  // }
  // async proveGameRecord({
  //   seed,
  //   inputs,
  //   debug,
  // }: {
  //   seed: Field;
  //   inputs: GameInputs[];
  //   debug: Bool;
  // }) {
  //   const result = await this._call('proveGameRecord', {
  //     seedJson: seed.toJSON(),
  //     inputs: JSON.stringify(inputs.map((elem) => GameInputs.toJSON(elem))),
  //     debug: Bool.toJSON(debug),
  //   });
  //   console.log('Restoring', result);
  //   const restoredProof = GameRecordProof.fromJSON(result);

  //   return restoredProof;
  // }

  async proveShuffle(deck: EncryptedDeck, agrigatedPubKey: PublicKey) {
    const result = await this._call('proveShuffle', {
      deckJSON: deck.toJSONString(),
      agrigatedPkBase58: agrigatedPubKey.toBase58(),
    });
    console.log('Restoring', result);
    const restoredProof = ShuffleProof.fromJSON(result);

    return restoredProof;
  }

  async proveDecrypt(card: EncryptedCard, pk: PrivateKey) {
    const result = await this._call('proveDecrypt', {
      cardJSON: card.toJSONString(),
      pkBase58: pk.toBase58(),
    });
    console.log('Restoring', result);
    const restoredProof = DecryptProof.fromJSON(result);

    return restoredProof;
  }

  async proveInitial(deck: EncryptedDeck, pk: PrivateKey, playerIndex: number) {
    const result = await this._call('proveInitial', {
      deckJSON: deck.toJSONString(),
      pkBase58: pk.toBase58(),
      playerIndex: playerIndex.toString(),
    });
    console.log('Restoring', result);
    const restoredProof = InitialOpenProof.fromJSON(result);

    return restoredProof;
  }

  worker: Worker;

  promises: {
    [id: number]: { resolve: (res: any) => void; reject: (err: any) => void };
  };

  nextId: number;

  readyPromise: Promise<void>;

  constructor() {
    this.promises = {};

    this.worker = new Worker(new URL('./pokerWorker.ts', import.meta.url));
    (window as any).workerPoker = this.worker;
    this.readyPromise = new Promise((resolve, reject) => {
      this.promises[0] = { resolve, reject };
    });

    this.nextId = 1;

    this.worker.onmessage = (event: MessageEvent<PokerWorkerReponse>) => {
      this.promises[event.data.id].resolve(event.data.data);
      delete this.promises[event.data.id];
    };
  }

  async waitFor(): Promise<void> {
    await this.readyPromise;
  }

  _call(fn: WorkerFunctions, args: any) {
    return new Promise((resolve, reject) => {
      this.promises[this.nextId] = { resolve, reject };

      const message: PokerWorkerRequest = {
        id: this.nextId,
        fn,
        args,
      };

      this.worker.postMessage(message);

      this.nextId++;
    });
  }
}
