# Schön. Macht. Geld. - The Ultimate Stock Market Party Game

This is a Next.js application that powers an interactive party game where guests become publicly traded "stocks." Their value is influenced in real-time by other guests through a Tinder-style swiping interface. The project uses Firebase for its backend, including Firestore for the database and anonymous authentication to identify users at the swipe and registration kiosks.

The application is built with Next.js, React, TypeScript, Tailwind CSS for styling, and ShadCN for UI components. It features three main interfaces:
1.  **Registration Kiosk (`/register`):** Where users create their stock profile with a nickname and a live photo.
2.  **Swipe Kiosk (`/swipe`):** Where users can anonymously "like" (swipe right) or "dislike" (swipe left) profiles, influencing their stock value.
3.  **Display Screens (`/display`):** A set of live dashboards for projectors, showing market data through a ticker, a market map, a leaderboard, and a terminal-style view.

---

## Project Architecture

The application follows a standard Next.js App Router structure. It's organized into components, pages, AI flows, Firebase services, and utility functions.

-   **Frontend:** Built with Next.js and React. Client components (`'use client'`) are used for interactive UI, especially for pages that require access to browser APIs (like the camera) or real-time data fetching.
-   **Backend:** Firebase is used as the backend-as-a-service.
    -   **Firestore:** A NoSQL database used to store all the `title` (stock) data. This includes profile information, current value, and a history of value changes. It acts as the single source of truth.
    -   **Firebase Authentication:** Anonymous authentication is used to create temporary, anonymous user accounts for the kiosks. This is necessary to satisfy security rules that require a user to be logged in for write operations.
-   **Styling:** Tailwind CSS is used for utility-first styling, customized through `tailwind.config.ts`. ShadCN UI provides the component library, with theme variables defined in `src/app/globals.css`.
-   **Generative AI:** Genkit and the Gemini API are used to generate satirical profile descriptions and news headlines. The AI flows are defined in the `src/ai/flows` directory.

---

## File Structure Overview

```
.
├── src
│   ├── ai
│   │   ├── flows/            # Genkit AI flows for generating content
│   │   └── genkit.ts         # Genkit and Google AI plugin configuration
│   ├── app
│   │   ├── (main)/           # Main application pages
│   │   ├── display/          # Layout and pages for the public display screens
│   │   ├── register/         # The registration kiosk page
│   │   ├── swipe/            # The swipe kiosk page
│   │   ├── globals.css       # Global styles and Tailwind CSS layers
│   │   └── layout.tsx        # Root layout for the application
│   ├── components
│   │   ├── ui/               # ShadCN UI components
│   │   ├── FirebaseErrorListener.tsx # Global listener for Firebase security errors
│   │   └── icons.tsx         # Custom SVG icons
│   ├── firebase
│   │   ├── firestore/        # Custom hooks for Firestore (useCollection, useDoc)
│   │   ├── client-provider.tsx # Client-side Firebase initializer
│   │   ├── config.ts         # Firebase project configuration
│   │   ├── error-emitter.ts  # Global event emitter for errors
│   │   ├── errors.ts         # Custom Firebase error classes
│   │   ├── index.ts          # Barrel file for exporting all Firebase utilities
│   │   ├── non-blocking-login.tsx  # Functions for non-blocking auth operations
│   │   ├── non-blocking-updates.tsx # Functions for non-blocking Firestore writes
│   │   └── provider.tsx      # React Context provider for Firebase services
│   ├── hooks/                # Custom React hooks (use-toast, use-mobile)
│   └── lib/                  # Library files, utilities, and type definitions
│       ├── types.ts          # TypeScript type definitions (e.g., Stock)
│       └── utils.ts          # Utility functions (e.g., cn for classnames)
├── docs
│   └── backend.json          # Defines the data schema for Firestore entities
├── public/                   # Static assets
└── firestore.rules           # Security rules for the Firestore database
```

### Key Files & Directories

-   **`src/app/layout.tsx`**: The root layout of the application. It sets up the global font, theme (`dark`), and wraps the entire app in the `FirebaseClientProvider` to make Firebase services available to all components.

-   **`src/firebase/`**: This directory is the heart of the Firebase integration.
    -   **`index.ts` & `client-provider.tsx`**: These files work together to initialize Firebase on the client-side and provide the `firestore` and `auth` instances to the rest of the app via React Context.
    -   **`firestore/use-collection.tsx`**: A crucial custom hook that subscribes to a Firestore collection in real-time. It's used by all display screens to get live market data.
    -   **`non-blocking-updates.tsx`**: Contains helper functions (`setDocumentNonBlocking`, `updateDocumentNonBlocking`) that perform Firestore write operations without `await`ing them. This improves UI responsiveness, especially on the swipe kiosk.
    -   **`errors.ts` & `error-emitter.ts`**: A system for creating and handling custom, detailed Firebase permission errors, which is invaluable for debugging security rules.

-   **`src/app/register/registration-client.tsx`**: A client component that handles the entire user registration flow. It uses `navigator.mediaDevices` to access the camera, captures a photo, calls an AI flow to generate a profile description, and finally saves the new stock to Firestore using `setDocumentNonBlocking`.

-   **`src/app/swipe/swipe-client.tsx`**: The swipe interface. It fetches a stock from Firestore, and on swipe, it uses a `runTransaction` operation to safely update the stock's value and history. This is the primary mechanism for changing market data.

-   **`src/app/display/`**: This directory contains the four main display views. All of them are client components that use the `useCollection` hook to listen for live updates from the `titles` collection in Firestore.
    -   `page.tsx` (Ticker): A scrolling marquee of stock prices.
    -   `market-map/`: A treemap visualization of the market, where size and color represent stock value and performance.
    -   `leaderboard/`: A ranked list of all stocks by performance.
    -   `terminal/`: A "Bloomberg" style terminal showing detailed data and an AI-powered news ticker.

-   **`src/ai/flows/`**: Contains the server-side logic for interacting with the Gemini model via Genkit.
    -   `generate-profile-descriptions.ts`: Defines the prompt and flow for creating witty, first-person stock descriptions.
    -   `generate-funny-news-headlines.ts`: Defines the prompt and flow for creating satirical news headlines based on a stock's performance.

-   **`firestore.rules`**: Defines the security rules for the database. It allows anyone to `read` data but restricts `create` and `update` operations to authenticated users. This is why anonymous sign-in is used on the kiosks.

---
