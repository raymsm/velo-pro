# RideFlow: Pro Bike Companion

RideFlow is a comprehensive progressive web application designed for bike enthusiasts. It helps riders track their journeys, manage expenses, monitor fuel economy, and navigate using real-time maps.

## Features

-   **Dashboard:** View your latest ride statistics, career totals, and fuel efficiency trends.
-   **Active Ride Tracking:** Real-time location tracking with speed, distance, and duration monitoring.
-   **Navigation:** Search for destinations and calculate routes with waypoint support.
-   **Fuel & Expense Logs:** Track fuel consumption, maintenance costs, and other bike-related expenses.
-   **Ride History:** Review past rides with detailed stats and interactive maps.
-   **AI Voice Assistant:** Get hands-free assistance and ride insights using Gemini AI.
-   **Offline Maps:** Basic support for offline map viewing to save data on the road.

## Tech Stack

-   **Frontend:** React 19, Tailwind CSS, Lucide React, Framer Motion.
-   **Backend:** Express (Server-side API proxy).
-   **Database:** Firebase Firestore.
-   **Auth:** Firebase Authentication (Google Cloud).
-   **Maps:** Leaflet & OpenStreetMap.
-   **AI:** Google Gemini API.

## Getting Started

### Prerequisites

-   Node.js (v18+)
-   Firebase Account

### Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your environment variables:
    -   Copy `.env.example` to `.env`.
    -   Add your `GEMINI_API_KEY`.
4.  Configure Firebase:
    -   Create a Firebase project and enable Firestore and Authentication.
    -   Add your Firebase config to `firebase-applet-config.json`.
5.  Run the development server:
    ```bash
    npm run dev
    ```

## Scripts

-   `npm run dev`: Starts the development server using `tsx`.
-   `npm run build`: Builds the client and server for production.
-   `npm run start`: Starts the production server.
-   `npm run lint`: Runs TypeScript type checking.

## License

MIT
