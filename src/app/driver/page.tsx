"use client";

import { useRouter } from 'next/navigation';

export default function DriverPage() {
  const router = useRouter();
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      padding: '1rem',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '24px', fontWeight: 'bold' }}>Driver App Coming Soon</h1>
        <p style={{ marginBottom: '2rem', color: '#666' }}>
          The driver interface is currently under development. Check back later!
        </p>
        <button 
          onClick={() => router.push('/')}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}
