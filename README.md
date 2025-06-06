# RiderPWA - Ride-Hailing Progressive Web Application

RiderPWA is a modern, user-friendly progressive web application for ride-hailing services. It provides a streamlined interface for users to request rides, select vehicle types, and manage payments.

## Features

- **Location-Based Services**: Set pickup and destination locations using map selection or current location
- **Permission Management**: Mobile-friendly permission toggles for location and notifications
- **Vehicle Selection**: Choose from multiple vehicle types with price estimates
- **Driver Matching**: Connect with available drivers in real-time
- **Ride Tracking**: View driver information, ETA, and trip details
- **Promise2Pay**: Flexible payment options for multiple rides
- **Responsive Design**: Works across mobile and desktop devices

## UI/UX Guidelines

This application follows strict UI/UX guidelines for an optimal mobile experience:

1. **Hierarchy Ranking**:
   - Rank 1 (Top 65%): Primary inputs and actions
   - Rank 2 (Lower portion): Secondary information
   - Rank 3: Collapsed or hidden elements

2. **Text Simplification**:
   - Labels: Direct, action-oriented, ≤3 words
   - Help/Error text: Brief, ≤2 lines, truncated when needed
   - Buttons: Self-explanatory with minimal text

3. **Touch Optimization**:
   - Primary CTAs: ≥48dp
   - Secondary controls: ≥40dp
   - Inline controls: ≥36dp

4. **Adaptive Layout**:
   - Compresses UI elements on smaller viewports
   - Maintains minimum 20dp spacing between rank levels

## Getting Started

To run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

- `src/app/home/page.tsx`: Main application component with all views
- `src/app/components/PermissionToggles.tsx`: Component for managing location and notification permissions
- `src/app/styles/permissionToggles.css`: Styles for the permission toggles component

## Permission Management

The application includes a mobile-friendly permission management system with the following features:

- **Always-visible toggles** for both location and notification permissions
- **Real-time permission state tracking** reflecting browser permission status
- **App-level enable/disable control** separate from browser permissions
- **Visual feedback** with toggle state indicating both permission status and enabled state
- **Accessibility support** with proper ARIA labels and touch targets
- **Unobtrusive design** that maintains visibility without interfering with core workflows

Permission toggles dynamically adapt to the UI context:
- Reduced opacity when app is in selection mode or menus are open
- Label visibility changes based on viewport size (icon-only on mobile)
- Proper spacing and alignment with all other UI elements
- `src/app/globals.css`: Global styles and UI components

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org) (React)
- **Maps**: Leaflet for interactive maps
- **UI Components**: Custom-built components with Material icons
- **Styling**: CSS with responsive design patterns

## Development Notes

- The application uses simulated data for demonstration purposes
- Location services require permission from the user
- The UI is optimized for mobile-first experiences with a focus on touch interactions

## Deployment

Deploy using Vercel or any static site hosting:

```bash
npm run build
```

The build output in the `.next` directory can be deployed to any static hosting service.
