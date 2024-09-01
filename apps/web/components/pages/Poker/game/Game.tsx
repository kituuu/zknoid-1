import React, { useState, useEffect, useContext } from 'react';
import { NextPage } from 'next';
// import io from 'socket.io-client';
// import queryString from 'query-string';
import Cards from './Cards';
import { Deck, DECK_OF_CARDS } from '../../../../games/poker/utils/deck';
import RaiseModal from './RaiseModal';
import { RandzuField } from 'zknoid-chain-dev';
import { IGameInfo, MatchQueueState } from '@/lib/stores/matchQueue';
import shuffleArray from '@/games/poker/utils/shuffleArray';

// let socket;
// const ENDPOINT = process.env.NEXT_PUBLIC_ENDPOINT;

interface IGameViewProps {
  gameInfo: IGameInfo<RandzuField> | undefined;
  matchInfo: MatchQueueState;
  loadingElement: { x: number; y: number } | undefined;
  loading: boolean;
}

const Game = ({
  gameInfo,
  matchInfo,
  loadingElement,
  loading,
}: IGameViewProps) => {
  //   const router = useRouter();
  //   const { roomCode } = router.query;

  // Initialize socket state
  const [room, setRoom] = useState<string | string[] | undefined>(
    matchInfo.activeGameId.toString()
  );
  const [roomFull, setRoomFull] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const currentUser = gameInfo?.currentUserIndex == 0 ? 'Player 1' : 'Player 2';

  // Initialize game state
  const [gameOver, setGameOver] = useState<boolean | undefined>();
  const [winner, setWinner] = useState('');
  const [turn, setTurn] = useState('');
  const [numberOfTurns, setNumberOfTurns] = useState(0);
  const [player1Deck, setPlayer1Deck] = useState<Deck[]>([
    {
      value: 'Q',
      suit: 'spades',
    },
    {
      value: 'A',
      suit: 'clubs',
    },
  ]);
  const [player2Deck, setPlayer2Deck] = useState<Deck[]>([
    {
      value: 'Q',
      suit: 'spades',
    },
    {
      value: 'A',
      suit: 'clubs',
    },
  ]);
  const [houseDeck, setHouseDeck] = useState<Deck[]>([]);
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
  const [shuffledDeck, setShuffledDeck] = useState<Deck[]>([]);
  const [restart, setRestart] = useState(false);

  useEffect(() => {
    const shuffledCards = shuffleArray(DECK_OF_CARDS);
    setShuffledDeck(shuffledCards);
    //extract 2 cards to player1Deck
    const player1Deck = shuffledCards.splice(0, 2);
    setPlayer1Deck(player1Deck);
    //extract 2 cards to player2Deck
    const player2Deck = shuffledCards.splice(0, 2);
    setPlayer2Deck(player2Deck);

    //extract 3 cards to houseDeck
    const houseDeck = shuffledCards.splice(0, 3);
    setHouseDeck(houseDeck);
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
  }, [gameInfo?.currentUserIndex]);
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
