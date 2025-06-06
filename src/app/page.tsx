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
        <h1 className="landing-title">Y A B N A <span className="brand-accent">.</span></h1>

        <h2 className="landing-headline">Yet Another Booking Non App</h2>
        <p className="landing-subtitle">We might not find you a ride every time. But when we do, you pay directly to the driver—no markup.</p>
      </section>

      {/* Main Cards Section */}
      <section className="landing-cards">
        {/* Rider Card */}
        <button 
          className="landing-card rider-card" 
          onClick={() => router.push('/home')}
          aria-label="Rider options"
        >
          <div className="card-icon rider-icon">
            <span className="material-icon">person_pin_circle</span>
          </div>
          <h3 className="card-title">Ride</h3>
          
          <div className="card-benefits">
            <div className="benefit-item">
              <span className="material-icon">payments</span>
              <span>Direct payment to driver</span>
            </div>
            <div className="benefit-item">
              <span className="material-icon">verified</span>
              <span>Government mandated fares only</span>
            </div>
            <div className="benefit-item">
              <span className="material-icon">currency_rupee</span>
              <span>Only ₹0.50 per ride, pay later</span>
            </div>
            <div className="benefit-item">
              <span className="material-icon">language</span>
              <span>No app installation needed</span>
            </div>
          </div>
        </button>

        {/* Driver Card */}
        <button 
          className="landing-card driver-card" 
          onClick={() => router.push('/driver')}
          aria-label="Driver options"
        >
          <div className="card-icon driver-icon">
            <span className="material-icon">local_taxi</span>
          </div>
          <h3 className="card-title">Drive</h3>
          
          <div className="card-benefits">
            <div className="benefit-item">
              <span className="material-icon">account_balance_wallet</span>
              <span>Keep your full fare</span>
            </div>
            <div className="benefit-item">
              <span className="material-icon">visibility</span>
              <span>Full trip transparency</span>
            </div>
            <div className="benefit-item">
              <span className="material-icon">currency_rupee</span>
              <span>Flat ₹0.50 fee, pay later</span>
            </div>
            <div className="benefit-item">
              <span className="material-icon">touch_app</span>
              <span>Instant control, no algorithms</span>
            </div>
          </div>
        </button>
      </section>

      {/* Footer with FAQ Link */}
      <section className="landing-footer">
        <Link href="#" className="faq-link">How it works</Link>
      </section>
    </div>
  );
}
