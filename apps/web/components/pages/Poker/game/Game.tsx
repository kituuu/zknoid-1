import React, { useState, useEffect, useContext } from 'react';
import { NextPage } from 'next';
// import io from 'socket.io-client';
// import queryString from 'query-string';
import Cards from './Cards';

import RaiseModal from './RaiseModal';

// let socket;
// const ENDPOINT = process.env.NEXT_PUBLIC_ENDPOINT;

interface GameProps {}

interface CardData {
  value: string;
  suit: string;
}

const Game: NextPage<GameProps> = () => {
  //   const router = useRouter();
  //   const { roomCode } = router.query;
  const roomCode = 'safsd';

  // Initialize socket state
  const [room, setRoom] = useState<string | string[] | undefined>(roomCode);
  const [roomFull, setRoomFull] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState('');

  useEffect(() => {
    // Socket connection logic commented out
    // const connectionOptions = {
    //     forceNew: true,
    //     reconnectionAttempts: 'Infinity',
    //     transports: ['websocket'],
    // };
    // socket = io.connect(ENDPOINT, connectionOptions);

    // socket.emit('join', { room: room }, (error: any) => {
    //     if (error) setRoomFull(true);
    // });

    // Cleanup on component unmount
    return () => {
      // socket.emit('disconnection');
      // socket.off();
    };
  }, []);

  // Initialize game state
  const [gameOver, setGameOver] = useState<boolean | undefined>();
  const [winner, setWinner] = useState('');
  const [turn, setTurn] = useState('');
  const [numberOfTurns, setNumberOfTurns] = useState(0);
  const [player1Deck, setPlayer1Deck] = useState<CardData[]>([]);
  const [player2Deck, setPlayer2Deck] = useState<CardData[]>([]);
  const [houseDeck, setHouseDeck] = useState<CardData[]>([]);
  const [player1Chips, setPlayer1Chips] = useState(0);
  const [player2Chips, setPlayer2Chips] = useState(0);
  const [increment, setIncrement] = useState(0);
  const [pot, setPot] = useState(0);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [player1Name, setPlayer1Name] = useState('Player 1');
  const [player2Name, setPlayer2Name] = useState('Player 2');

  const [localHand, setLocalHand] = useState('N/A');

  // Game logic useEffect hooks...
  // (The rest of the useEffect hooks remain largely unchanged,
  // just remove socket emissions and handle state locally)

  const callHandler = () => {
    // Handle call action
  };

  const raiseHandler = (amount: number) => {
    // Handle raise action
  };

  const foldHandler = () => {
    // Handle fold action
  };

  // Local state
  const [shuffledDeck, setShuffledDeck] = useState<string[]>([]);
  const [restart, setRestart] = useState(false);

  // Restart game logic...

  //   if (users.length < 2) return <h1>Waiting...</h1>;

  return (
    <div className="game-bg noselect">
      <div className="game-board">
        <div className="room-code">
          <h2>Room Code: {room}</h2>
        </div>
        <Cards
          numberOfTurns={numberOfTurns}
          player1Deck={player1Deck}
          player2Deck={player2Deck}
          houseDeck={houseDeck}
          gameOver={gameOver as boolean}
          currentUser={currentUser}
          player1Chips={player1Chips}
          player2Chips={player2Chips}
          turn={turn}
          player1Name={player1Name}
          player2Name={player2Name}
          winner={winner}
        />

        <div className="pot-display">
          <h3>Pot 💰: {pot}</h3>
        </div>
        <div className="game-controls">
          {!gameOver && (
            <>
              <button
                disabled={
                  currentUser !== turn ||
                  (currentUser === 'Player 2' && player2Chips < increment) ||
                  (currentUser === 'Player 1' && player1Chips < increment) ||
                  gameOver
                }
                onClick={() => callHandler()}
              >
                {(raiseAmount === 0 &&
                  increment &&
                  numberOfTurns < 2 &&
                  `Buy In(${increment})`) ||
                  (raiseAmount === 0 && increment && `Call(${increment})`) ||
                  (raiseAmount > 0 && `Call(${raiseAmount})`) ||
                  'Check'}
              </button>
              <RaiseModal
                minRaise={raiseAmount > 0 ? raiseAmount : increment}
                maxRaise={
                  currentUser === 'Player 1' ? player1Chips : player2Chips
                }
                // initialValue={raiseAmount > 0 ? raiseAmount + increment : undefined}
                isDisabled={(turn !== currentUser || gameOver) as boolean}
                // callHandler={() => {
                //     callHandler();
                // }}
                raiseHandler={(amount: number) => {
                  raiseHandler(amount);
                }}
              />
              <button
                disabled={currentUser !== turn || gameOver}
                onClick={() => foldHandler()}
              >
                Fold
              </button>
            </>
          )}

          {gameOver && (
            <button
              disabled={restart}
              onClick={() => {
                setRestart(true);
              }}
            >
              Restart
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;
