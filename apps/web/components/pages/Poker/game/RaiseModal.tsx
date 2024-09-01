import React, { useState } from 'react';

interface RaiseModalProps {
  minRaise: number;
  maxRaise: number;
  raiseHandler: (raise: number) => void;
  isDisabled: boolean;
}

const RaiseModal: React.FC<RaiseModalProps> = ({
  minRaise,
  maxRaise,
  raiseHandler,
  isDisabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [raise, setRaise] = useState(Math.round(10 * (minRaise + 10)) / 10);
  const [errors, setErrors] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleModal = () => setIsOpen(!isOpen);

  const validateRaise = (value: number) => {
    if (isNaN(value)) {
      setErrors('Invalid Amount');
      return false;
    }
    if (value >= maxRaise) {
      setErrors(`Not enough chips, remaining: ${maxRaise}`);
      return false;
    }
    if (value <= minRaise) {
      setErrors(`Has to be more than ${minRaise}`);
      return false;
    }
    setErrors(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateRaise(raise)) {
      setIsSubmitting(true);
      raiseHandler(raise);
      setIsSubmitting(false);
      toggleModal();
    }
  };

  return (
    <>
      <button
        onClick={toggleModal}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#000',
          color: '#fff',
          border: '2px solid black',
          borderRadius: '5px',
          cursor: 'pointer',
          width: '10rem',
        }}
        disabled={isDisabled}
      >
        Raise
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              width: '20rem',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <button
              onClick={toggleModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem',
              }}
            >
              &times;
            </button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Raise</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="number"
                  value={raise}
                  onChange={(e) => setRaise(parseFloat(e.target.value))}
                  style={{
                    padding: '0.5rem',
                    width: '70%',
                    fontSize: '1rem',
                    borderRadius: '5px',
                    border: '1px solid #ccc',
                  }}
                />
              </div>
              {errors && (
                <p style={{ color: 'red', fontSize: '0.875rem' }}>{errors}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || isDisabled}
                  style={{
                    backgroundColor: '#1877F2',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Raising...' : 'Raise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default RaiseModal;
