import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/router';

interface GameCodeModalProps {
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

const GameCodeModal: React.FC<GameCodeModalProps> = (props) => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  // Validate room code input
  const validateRoomCode = (room: string) => {
    if (room.length !== 3) {
      return 'Room code must be exactly 3 characters long.';
    }
    return '';
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRoomCode(event.target.value.toUpperCase());
    setError(validateRoomCode(event.target.value));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateRoomCode(roomCode);
    if (validationError) {
      setError(validationError);
    } else {
      router.push(`/play?roomCode=${roomCode}`);
    }
  };

  const handleModalOpen = () => {
    setIsOpen(true);
  };

  const handleModalClose = () => {
    setIsOpen(false);
    setRoomCode('');
    setError('');
  };

  return (
    <>
      <button {...props.buttonProps} onClick={handleModalOpen}>
        Room Code
      </button>
      {isOpen && (
        <div className="modal">
          <div className="modal-overlay" onClick={handleModalClose} />
          <div className="modal-content">
            <button className="close-button" onClick={handleModalClose}>
              &times;
            </button>
            <form onSubmit={handleSubmit} className="form">
              <label htmlFor="room">Room Code</label>
              <input
                type="text"
                id="room"
                name="room"
                value={roomCode}
                onChange={handleChange}
                maxLength={3}
                className="input-field"
              />
              {error && <p className="error-text">{error}</p>}
              <button
                type="submit"
                disabled={!!error || roomCode.length !== 3}
                className="submit-button"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GameCodeModal;
