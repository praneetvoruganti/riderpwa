// src/app/page.tsx
// This is the main landing page for the Yabna application.
// It provides users with options to proceed as a Rider or a Driver.
"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import './styles/landing.css';

/**
 * YabnaLanding Component
 * 
 * The main landing page for the Yabna application.
 * It allows users to choose between the Rider and Driver flows.
 */
export default function YabnaLanding() {
  const router = useRouter();

  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Header Section: Contains the brand name, tagline, and a brief description */}
        {/* Top Section with Headline and Brand */}
        <section className="landing-header">
          <div className="brand-container">
            <h1 className="landing-title">Y A B N A <span className="brand-accent">.</span></h1>
            <div className="tagline-box">
              <h2 className="landing-headline">Yet Another Booking Non App</h2>
              <p className="landing-subtitle">Let's be real—we won't always find you a ride. But when we do, you pay straight to the driver (because why pay extra?).</p>
            </div>
          </div>
        </section>

        {/* Main Cards Section: Displays options for Riders and Drivers */}
        <section className="landing-cards">
          {/* Rider Card: Navigates to the rider home page */}
          <button 
            className="landing-card rider-card" 
            onClick={() => router.push('/home')} // Navigate to the rider section
            aria-label="Rider options"
          >
            <div className="card-header">
              <div className="card-icon rider-icon">
                <span className="material-icons">directions_car</span>
              </div>
              <h3 className="card-title">Ride</h3>
            </div>
            
            <div className="card-benefits">
              <div className="benefit-item">
                <span className="material-icons">payments</span>
                <div className="benefit-text">
                  <strong>Pay the driver, not us</strong>
                  <span className="benefit-subtext">(We're bad middlemen anyway)</span>
                </div>
              </div>
              <div className="benefit-item">
                <span className="material-icons">verified</span>
                <div className="benefit-text">
                  <strong>Govt-approved fares</strong>
                  <span className="benefit-subtext">(Because bargaining is exhausting)</span>
                </div>
              </div>
              <div className="benefit-item">
                <span className="material-icons">currency_rupee</span>
                <div className="benefit-text">
                  <strong>Only ₹0.50 per ride, pay us later</strong>
                  <span className="benefit-subtext">(When it hits ₹20, we'll politely remind you)</span>
                </div>
              </div>
              <div className="benefit-item">
                <span className="material-icons">language</span>
                <div className="benefit-text">
                  <strong>Zero apps needed</strong>
                  <span className="benefit-subtext">(We know your phone has enough clutter)</span>
                </div>
              </div>
            </div>
          </button>

          {/* Driver Card: Navigates to the driver home page */}
          <button 
            className="landing-card driver-card" 
            onClick={() => router.push('/driver')} // Navigate to the driver section
            aria-label="Driver options"
          >
            <div className="card-header">
              <div className="card-icon driver-icon">
                <span className="material-icons">local_taxi</span>
              </div>
              <h3 className="card-title">Drive</h3>
            </div>
            
            <div className="card-benefits">
              <div className="benefit-item">
                <span className="material-icons">account_balance_wallet</span>
                <div className="benefit-text">
                  <strong>You keep 100% of your fare</strong>
                  <span className="benefit-subtext">(We're too lazy to take percentages)</span>
                </div>
              </div>
              <div className="benefit-item">
                <span className="material-icons">visibility</span>
                <div className="benefit-text">
                  <strong>See all trips clearly</strong>
                  <span className="benefit-subtext">(No sneaky surprises)</span>
                </div>
              </div>
              <div className="benefit-item">
                <span className="material-icons">currency_rupee</span>
                <div className="benefit-text">
                  <strong>Just ₹0.50 per ride, pay later</strong>
                  <span className="benefit-subtext">(When it's worth our effort to ask)</span>
                </div>
              </div>
              <div className="benefit-item">
                <span className="material-icons">touch_app</span>
                <div className="benefit-text">
                  <strong>No algorithms, all you</strong>
                  <span className="benefit-subtext">(You probably know your routes better anyway)</span>
                </div>
              </div>
            </div>
          </button>
        </section>

        {/* Footer Section: Contains a link to the FAQ page */}
        <section className="landing-footer">
          <Link href="#" className="faq-link">
            <span className="material-icons">help_outline</span>
            <span>How it works <span className="faq-subtext">(Tap for honest answers, no corporate fluff)</span></span>
          </Link>
        </section>
      </div>
    </div>
  );
}
