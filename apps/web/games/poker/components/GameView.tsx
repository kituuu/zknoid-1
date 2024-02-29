'use client';

import { convertToMesage } from 'zknoid-chain-dev';
import {
  Card,
  EncryptedCard,
  EncryptedDeck,
  POKER_DECK_SIZE,
} from 'zknoid-chain-dev/dist/src/poker/types';
import { ICard, IGameInfo } from '../stores/matchQueue';
import { Group, PublicKey } from 'o1js';
import { ReactElement, useEffect, useState } from 'react';
import Image from 'next/image';

interface IGameViewProps {
  gameInfo: IGameInfo | undefined;
  publicKey: string | undefined;
  encryptAll: () => Promise<any>;
  decryptSingle: (i: number) => Promise<any>;
}

const eCardToDiv = (ec: EncryptedCard): ReactElement => {
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
};

const cardToDiv = (card: Card): ReactElement => {
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
};

const cardToString = (ec: EncryptedCard): string => {
  if (+ec.numOfEncryption.toString() == 0) {
    return ec.toCard().toString();
  } else {
    return `Hidden. Decryptions left: ${ec.numOfEncryption.toString()}`;
  }
};

const sortEncryptedCards = (
  ed: EncryptedDeck,
): [[EncryptedCard, number][], [Card, number][], [Card, number][]] => {
  let closedCards: [EncryptedCard, number][] = [];
  let ownCards: [Card, number][] = [];
  let openCards: [Card, number][] = [];

  ed.cards.forEach((ec: EncryptedCard, i: number) => {
    if (+ec.numOfEncryption.toString() == 0) {
      openCards.push([ec.toCard(), i]);
    } else {
      closedCards.push([ec, i]);
    }
  });

  return [closedCards, ownCards, openCards];
};

export const GameView = (props: IGameViewProps) => {
  let [openCards, setOpenCards] = useState<[Card, number][]>([]);
  let [ownCards, setOwnCards] = useState<[Card, number][]>([]);
  let [closedCards, setClosedCards] = useState<[EncryptedCard, number][]>([]);

  useEffect(() => {
    if (!props.gameInfo) {
      return;
    }

    let [closedCards, ownCards, openCards] = sortEncryptedCards(
      props.gameInfo.contractDeck,
    );
    setOpenCards(openCards);
    setOwnCards(ownCards);
    setClosedCards(closedCards);
  }, [props.gameInfo?.contractDeck]);

  return (
    <>
      <div>Your public key: ${props.publicKey}</div>
      <div>Next user ${props.gameInfo?.nextUser.toBase58()}</div>
      <div onClick={props.encryptAll}> Encrypt all </div>
      <div className="grid grid-flow-col grid-rows-4 content-start gap-4 ">
        {openCards.map(([card]) => {
          return cardToDiv(card);
        })}
      </div>
      {closedCards.length && (
        <div>
          <div>{closedCards.length > 0 && eCardToDiv(closedCards[0][0])}</div>
          <div onClick={() => props.decryptSingle(closedCards[0][1])}>
            {' '}
            Decrypt this card{' '}
          </div>
        </div>
      )}
    </>
  );
};
