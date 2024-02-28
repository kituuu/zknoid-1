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

let defaultCards: { [key: string]: number } = {};

const messageToKey = (m: [Group, Group]): string => {
  return m[0].x.toString();
};

[...Array(POKER_DECK_SIZE).keys()].forEach((value) => {
  defaultCards[messageToKey(convertToMesage(value))] = value;
});

const cardToString = (card: ICard): string => {
  if (card.numOfEncryptions == 0) {
    return defaultCards[messageToKey(card.value as [Group, Group])].toString();
  } else {
    return `Hidden. Decryptions left: ${card.numOfEncryptions}`;
  }
};

export const GameView = (props: IGameViewProps) => {
  return (
    <>
      <div>Your public key: ${props.publicKey}</div>
      <div>Next user ${props.gameInfo?.nextUser.toBase58()}</div>
      <div onClick={props.encryptAll}> Encrypt all </div>
      {props.gameInfo?.deck.map((card, i) => (
        <div>
          <div>{cardToString(card)}</div>
          {card.numOfEncryptions != 0 && (
            <div onClick={() => props.decryptSingle(i)}>
              {' '}
              Decrypt this card{' '}
            </div>
          )}
        </div>
      ))}
    </>
  );
};
