"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from './utils/auth'; // Assuming auth.ts is in 'utils' directory
import Image from "next/image";

export default function MainPage() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace('/home');
    } else {
      router.replace('/login');
    }
  }, [router]);

  // Optional: Show a loading state while redirecting
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Loading...</p>
    </div>
  );
}
