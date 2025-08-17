import React from 'react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 9999,
      background: type === 'error' ? '#d63031' : '#00b894',
      color: '#fff',
      padding: '1rem 2rem',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontWeight: 'bold',
      minWidth: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 'bold', marginLeft: 16, cursor: 'pointer' }}>×</button>
    </div>
  );
}
