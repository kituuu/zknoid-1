import React from 'react';

type Suit = 'diamonds' | 'clubs' | 'spades' | 'hearts' | 'BACK';
type CardValue = number | 'J' | 'Q' | 'K' | 'A';

interface Deck {
  value: CardValue;
  suit: Suit;
}

function Card({
  value,
  suit,
  className,
}: {
  value: CardValue;
  suit: Suit;
  className: string;
}) {
  return (
    <>
      {suit !== 'BACK' && (
        <img
          className={className}
          alt={suit + '-' + value}
          src={`/cards/${suit.toUpperCase()}/${suit.toUpperCase()}_${value}.svg`}
        />
      )}
      {suit === 'BACK' && (
        <img
          className={className}
          alt={suit + '-' + value}
          src={`/cards/${suit}.svg`}
        />
      )}
    </>
  );
}

export default Card;
