# Listening Room App

A booking application for COMBO X IMMERSIA listening room time slots with optional Spotify song submission.

## Features

- **Time Slot Selection**: Choose from available 30-minute listening room slots
- **Booking Management**: Enter guest details and optionally bring friends
- **Spotify Integration**: Search and submit a song for the listening room playlist
- **Booking Confirmation**: View and manage your reservations

## Tech Stack

- **Framework**: Next.js 16
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Data Fetching**: SWR
- **Backend**: Firebase
- **Spotify API**: spotify-web-api-node

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start the booking flow.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
├── app/
│   ├── api/           # API routes for bookings, slots, and Spotify
│   ├── [id]/          # Booking management page
│   └── page.tsx       # Main booking flow
├── components/
│   └── ui/            # Reusable UI components
├── lib/
│   ├── booking-context.tsx  # Booking state management
│   ├── firebase.ts          # Firebase configuration
│   └── spotify.ts           # Spotify API integration
```

## Requirements

- Node.js 18+
- Firebase project credentials
- Spotify API credentials