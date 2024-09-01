import React, { useState, useEffect } from 'react';
import Card from './Card'; // Assuming Card component is defined elsewhere
import { Deck } from '@/games/poker/utils/deck';

interface CardData {
  value: string;
  suit: string;
}

type Suit = 'diamonds' | 'clubs' | 'spades' | 'hearts' | 'BACK';
type CardValue = number | 'J' | 'Q' | 'K' | 'A';

interface CardsProps {
  numberOfTurns: number;
  player1Deck: Deck[];
  player2Deck: Deck[];
  houseDeck: Deck[];
  gameOver: boolean;
  currentUser: 'Player 1' | 'Player 2' | string;
  player1Chips: number;
  player2Chips: number;
  turn: 'Player 1' | 'Player 2' | string;
  winner: string | null;
  player1Name: string;
  player2Name: string;
}

export default function Cards({
  numberOfTurns,
  player1Deck,
  player2Deck,
  houseDeck,
  gameOver,
  currentUser,
  player1Chips,
  player2Chips,
  turn,
  winner,
  player1Name,
  player2Name,
}: CardsProps) {
  const [p1Heading, setP1Heading] = useState<string>('');
  const [p2Heading, setP2Heading] = useState<string>('');
  const [houseHeading, setHouseHeading] = useState<string>('');
  useEffect(() => {
    if (numberOfTurns < 2) setHouseHeading('Buy In to reveal cards');
    else if (numberOfTurns >= 2 && numberOfTurns < 4) setHouseHeading('Flop');
    else if (numberOfTurns >= 4 && numberOfTurns < 6) setHouseHeading('Turn');
    else if (numberOfTurns >= 6 && numberOfTurns < 8) setHouseHeading('River');
    else if (numberOfTurns >= 8) setHouseHeading('Game Over!');
  }, [numberOfTurns]);

  useEffect(() => {
    if (currentUser === 'Player 1' && winner === player1Name)
      setP1Heading(`👑 ${player1Name} (You)`);
    else if (currentUser === 'Player 1') setP1Heading(`${player1Name} (You)`);
    else if (winner === player1Name) setP1Heading(`👑 ${player1Name}`);
    else setP1Heading(player1Name);
    if (currentUser === 'Player 2' && winner === player2Name)
      setP2Heading(`👑 ${player2Name} (You)`);
    else if (currentUser === 'Player 2') setP2Heading(`${player2Name} (You)`);
    else if (winner === player2Name) setP2Heading(`👑 ${player2Name}`);
    else setP2Heading(player2Name);
  }, [winner, player1Name, player2Name, currentUser]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <h2
        style={{
          margin: '0.5rem 0',
          fontFamily: 'inherit',
          fontSize: '1.5rem',
          color: winner === 'Player 2' ? '#FFD700' : 'inherit',
        }}
      >
        {p2Heading}
      </h2>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {player2Deck &&
            player2Deck.map((item, index) => {
              if ((currentUser === 'Player 2' || gameOver === true) && item)
                return (
                  <Card
                    key={index}
                    className="player-card"
                    value={item.value as CardValue}
                    suit={item.suit as Suit}
                  />
                );
              else
                return (
                  <Card
                    key={index}
                    className="player-card-back"
                    suit="BACK"
                    value={1}
                  />
                );
            })}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              fontFamily: 'inherit',
            }}
          >
            Chips: {player2Chips}
          </h3>
          {currentUser === 'Player 1' &&
            turn === 'Player 2' &&
            gameOver === false && <p>Loading</p>}
        </div>
      </div>

      <h2
        style={{
          margin: '0.5rem 0',
          fontFamily: 'inherit',
          fontSize: '1.5rem',
        }}
      >
        {houseHeading}
      </h2>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {houseDeck &&
          houseDeck.map((item, index) => {
            if (item)
              return (
                <Card
                  key={index}
                  value={item.value as CardValue}
                  suit={(numberOfTurns >= 2 ? item.suit : 'BACK') as Suit}
                  className="card"
                />
              );
          })}
      </div>

      <h2
        style={{
          margin: '0.5rem 0',
          fontFamily: 'inherit',
          fontSize: '1.5rem',
          color: winner === 'Player 1' ? '#FFD700' : 'inherit',
        }}
      >
        {p1Heading}
      </h2>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              fontFamily: 'inherit',
            }}
          >
            Chips: {player1Chips}
          </h3>
          {currentUser === 'Player 2' &&
            turn === 'Player 1' &&
            gameOver === false && <p>Loading</p>}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {player1Deck &&
            player1Deck.map((item, index) => {
              if ((currentUser === 'Player 1' || gameOver === true) && item)
                return (
                  <Card
                    key={index}
                    className="player-card"
                    value={item.value as CardValue}
                    suit={item.suit as Suit}
                  />
                );
              else
                return (
                  <Card
                    key={index}
                    className="player-card-back"
                    suit="BACK"
                    value={1}
                  />
                );
            })}
        </div>
      </div>
    </div>
  );
}
