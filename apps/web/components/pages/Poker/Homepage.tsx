import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import GameCodeModal from './GameCodeModal';
import randomCodeGenerator from '@/games/poker/utils/randomCodeGenerator';
import { UserContext } from '@/games/poker/utils/UserContext';
import './Homepage.css';

let socket: any;
const ENDPOINT = 'http://localhost:3000/games/poker';

const PokerPage: React.FC = () => {
  const [waiting, setWaiting] = useState<string[]>([]);
  const [waitingToggle, setWaitingToggle] = useState(false);
  const [code, setCode] = useState('');
  const { user } = useContext(UserContext);
  const router = useRouter();

  useEffect(() => {
    socket = io.connect(ENDPOINT, {
      forceNew: true,
      reconnectionAttempts: 'Infinity',
      transports: ['websocket'],
    });

    // Cleanup on component unmount
    return () => {
      socket.emit('waitingDisconnection');
      socket.off();
    };
  }, []);

  useEffect(() => {
    socket.on('waitingRoomData', ({ waiting }: any) => {
      if (waiting) setWaiting(waiting);
    });

    socket.on('randomCode', ({ code }: any) => {
      if (code) setCode(code);
    });
  }, []);

  useEffect(() => {
    if (!waitingToggle) {
      socket.emit('waitingDisconnection');
    } else {
      socket.emit('waiting');
    }
  }, [waitingToggle]);

  useEffect(() => {
    if (waiting.length >= 2) {
      const users = waiting.slice(0, 2);
      socket.emit('randomCode', {
        id1: users[0],
        id2: users[1],
        code: randomCodeGenerator(3),
      });

      if (users.includes(socket.id) && code !== '') {
        socket.emit('waitingDisconnection', users[0]);
        router.push(`/play?roomCode=${code}`);
      }
    }
  }, [waiting, code, router]);

  return (
    <div className="Homepage">
      <div className="center-content">
        {!user ? (
          <h1>Sign In/Register to unlock Premium features</h1>
        ) : (
          <h1>Welcome, {user.username}!</h1>
        )}

        <div className="auth-buttons">
          <GameCodeModal />
          <button
            className="waiting-button"
            onClick={() => setWaitingToggle(!waitingToggle)}
          >
            {waitingToggle ? 'Cancel Waiting' : 'Join Waiting Room'} (Queue:{' '}
            {waiting.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default PokerPage;
