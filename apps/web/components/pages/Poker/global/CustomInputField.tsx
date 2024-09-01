import React from 'react';

interface CustomInputFieldProps {
  type: string;
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  touched?: boolean;
}

export default function CustomInputField({
  type,
  label,
  name,
  value,
  onChange,
  error,
  touched,
}: CustomInputFieldProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={name}
        style={{ display: 'block', marginBottom: '0.5rem' }}
      >
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: `1px solid ${error && touched ? 'red' : '#ccc'}`,
          borderRadius: '4px',
        }}
      />
      {error && touched && (
        <div
          style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
