import React, { useState } from 'react';

interface WaitingButtonProps {
  w: string;
  size: string;
  onClose: () => void;
  onTrigger: () => void;
  queueLength: number;
}

export default function WaitingButton({
  w,
  size,
  onClose,
  onTrigger,
  queueLength,
}: WaitingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopover = () => {
    if (isOpen) {
      onClose();
    } else {
      onTrigger();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        style={{
          width: w,
          fontSize: size,
          padding: '0.5rem 1rem',
          backgroundColor: '#1d4ed8',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
        onClick={togglePopover}
      >
        Matchmaking
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'fit-content',
            backgroundColor: '#fff',
            padding: '1rem',
            borderRadius: '5px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="spinner" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
              Waiting, {queueLength} in Queue.
            </h2>
          </div>
          {queueLength === 0 && (
            <p
              style={{
                fontSize: '0.875rem',
                color: '#555',
                marginTop: '0.5rem',
              }}
            >
              Please be patient. The server can take up to 1 minute to cold
              start.
            </p>
          )}
          <button
            onClick={togglePopover}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Spinner CSS */}
      <style>{`
				.spinner {
					border: 4px solid rgba(0, 0, 0, 0.1);
					border-top: 4px solid #1d4ed8;
					border-radius: 50%;
					width: 24px;
					height: 24px;
					animation: spin 1s linear infinite;
				}
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`}</style>
    </div>
  );
}
