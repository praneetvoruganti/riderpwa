"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { generateUUID, storeRiderSession } from '../utils/auth';

const DEFAULT_OTP = '123456';

export default function LoginFlowForm() {
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [showOtpInput, setShowOtpInput] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const handleMobileSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!mobileNumber.match(/^\d{10}$/)) { // Basic 10-digit validation
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setShowOtpInput(true);
  };

  const handleOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (otp === DEFAULT_OTP) {
      setError('');
      const sessionUUID = generateUUID();
      storeRiderSession(sessionUUID);
      console.log('Login successful, session:', sessionUUID);
      router.push('/home'); // Navigate to home screen after successful login
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
      {!showOtpInput ? (
        <form onSubmit={handleMobileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px' }}>
          <h2>Login</h2>
          <p>Enter your mobile number to continue</p>
          <input
            type="tel"
            placeholder="Mobile Number (10 digits)"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            required
            style={{ padding: '10px', fontSize: '1rem', borderRadius: '5px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ padding: '10px', fontSize: '1rem', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}>
            Send OTP
          </button>
          {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px' }}>
          <h2>Enter OTP</h2>
          <p>An OTP has been sent to {mobileNumber}. (Hint: it's {DEFAULT_OTP})</p>
          <input
            type="text"
            placeholder="Enter OTP (6 digits)"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
            style={{ padding: '10px', fontSize: '1rem', borderRadius: '5px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ padding: '10px', fontSize: '1rem', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}>
            Verify OTP
          </button>
          {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
          <button type="button" onClick={() => { setShowOtpInput(false); setError(''); setOtp(''); }} style={{ padding: '8px', fontSize: '0.9rem', marginTop: '10px', backgroundColor: 'transparent', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>
            Change Mobile Number
          </button>
        </form>
      )}
    </div>
  );
}
