'use client';

import { convertToMesage } from 'zknoid-chain-dev';
import {
  EncryptedCard,
  POKER_DECK_SIZE,
} from 'zknoid-chain-dev/dist/src/poker/types';
import { ICard, IGameInfo } from '../stores/matchQueue';
import { Group, PublicKey } from 'o1js';
import { ReactElement } from 'react';
import Image from 'next/image';

interface IGameViewProps {
  gameInfo: IGameInfo | undefined;
  publicKey: string | undefined;
  encryptAll: () => Promise<any>;
  decryptSingle: (i: number) => Promise<any>;
}

const cardToDiv = (ec: EncryptedCard): ReactElement => {
  if (+ec.numOfEncryption.toString() == 0) {
    let card = ec.toCard();
    return (
      <div>
        {/* {`${card.value.toString()}_${card.color.toString()}`} */}
        <Image
          src={`/poker_cards/${card.value.toString()}_${card.color.toString()}.svg`}
          alt=""
          width={167}
          height={242}
        />
      </div>
    );
  } else {
    return (
      <div>
        <Image
          src="/poker_cards/black_joker.svg"
          alt=""
          width={167}
          height={242}
        />
        <div>Numer of encryptions: {ec.numOfEncryption.toString()}</div>
      </div>
    );
  }
};

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
      <div className="grid grid-flow-col grid-rows-4 content-start gap-4 ">
        {props.gameInfo?.contractDeck.cards.map(
          (card: EncryptedCard, i: number) => (
            <div>
              {cardToDiv(card)}
              {+card.numOfEncryption.toString() != 0 && (
                <div onClick={() => props.decryptSingle(i)}>
                  {' '}
                  Decrypt this card{' '}
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </>
  );
};
