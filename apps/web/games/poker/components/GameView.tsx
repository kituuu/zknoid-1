'use client';

import { convertToMesage } from 'zknoid-chain-dev';
import {
  EncryptedCard,
  POKER_DECK_SIZE,
} from 'zknoid-chain-dev/dist/src/poker/types';
import { ICard, IGameInfo } from '../stores/matchQueue';
import { Group, PublicKey } from 'o1js';

interface IGameViewProps {
  gameInfo: IGameInfo | undefined;
  publicKey: string | undefined;
  encryptAll: () => Promise<any>;
  decryptSingle: (i: number) => Promise<any>;
}

const cardToString = (ec: EncryptedCard): string => {
  if (+ec.numOfEncryption.toString() == 0) {
    return ec.toCard().toString();
  } else {
    return `Hidden. Decryptions left: ${ec.numOfEncryption.toString()}`;
  }
};

export const GameView = (props: IGameViewProps) => {
  return (
    <>
      <div>Your public key: ${props.publicKey}</div>
      <div>Next user ${props.gameInfo?.nextUser.toBase58()}</div>
      <div onClick={props.encryptAll}> Encrypt all </div>
      {props.gameInfo?.contractDeck.cards.map(
        (card: EncryptedCard, i: number) => (
          <div>
            <div>{cardToString(card)}</div>
            {+card.numOfEncryption.toString() != 0 && (
              <div onClick={() => props.decryptSingle(i)}>
                {' '}
                Decrypt this card{' '}
              </div>
            )}
          </div>
        ),
      )}
    </>
  );
};
