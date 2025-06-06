"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './styles/landing.css';

export default function YabnaLanding() {
  const router = useRouter();

  return (
    <div className="landing-container">
      {/* Top Section with Headline */}
      <section className="landing-header">
        <h1 className="landing-title">YABNA</h1>
        <p className="landing-subtitle">Flat ₹0.50. Pay later. Direct to driver.</p>
      </section>

      {/* Main Cards Section */}
      <section className="landing-cards">
        {/* Rider Card */}
        <button 
          className="landing-card rider-card" 
          onClick={() => router.push('/home')}
        >
          <div className="card-icon rider-icon">
            <span className="material-icon">person_pin_circle</span>
          </div>
          <h2 className="card-title">Ride</h2>
          <p className="card-description">May not find a cab, but if we do it's cheaper.</p>
        </button>

        {/* Driver Card */}
        <button 
          className="landing-card driver-card" 
          onClick={() => router.push('/driver')}
        >
          <div className="card-icon driver-icon">
            <span className="material-icon">local_taxi</span>
          </div>
          <h2 className="card-title">Drive</h2>
          <p className="card-description">Pick any trip, keep the fare.</p>
        </button>
      </section>

      {/* Footer with FAQ Link */}
      <section className="landing-footer">
        <Link href="#" className="faq-link">Frequently Asked Questions</Link>
      </section>
    </div>
  );
}
