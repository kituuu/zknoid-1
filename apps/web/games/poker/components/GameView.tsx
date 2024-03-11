'use client';

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
  sessionKey: string | undefined;
  encryptAll: () => Promise<any>;
  decryptSingle: (i: number) => Promise<any>;
}

const anyCardToDiv = (ec: EncryptedCard): ReactElement => {
  if (+ec.numOfEncryption.toString() == 0) {
    return cardToDiv(ec.toCard());
  } else {
    return eCardToDiv(ec);
  }
};

const eCardToDiv = (ec: EncryptedCard): ReactElement => {
  return (
    <div className="w-max">
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
    <div className="w-max">
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
    <div className="flex w-full flex-grow flex-col">
      <div>Your public key: ${props.publicKey}</div>
      <div>Your session public key: ${props.sessionKey}</div>
      <div>Next user ${props.gameInfo?.nextUser.toBase58()}</div>
      <div>Index ${props.gameInfo?.selfIndex}</div>
      <div onClick={props.encryptAll}> Encrypt all </div>

      <div className="flex flex-grow flex-col">
        <div className="width h-40 w-full flex-none"></div>
        <div className="flex w-full flex-grow items-center justify-center">
          <div className="flex justify-center gap-5">
            {props.gameInfo?.contractDeck.cards.slice(0, 5).map(anyCardToDiv)}

            {/* {openCards.slice(0, 4).map(([card]) => {
              return cardToDiv(card);
            })}

            {closedCards.length > 0 && (
              <div>
                <div>
                  {closedCards.length > 0 && eCardToDiv(closedCards[0][0])}
                </div>
                <div onClick={() => props.decryptSingle(closedCards[0][1])}>
                  {' '}
                  Decrypt this card{' '}
                </div>
              </div>
            )} */}
          </div>
        </div>
        <div className="h-40 w-full flex-none"></div>
      </div>
    </div>
  );
};
