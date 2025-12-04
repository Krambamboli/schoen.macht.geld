# Schön. Macht. Geld. - The Ultimate Stock Market Party Game

Welcome to the repository for "Schön. Macht. Geld.", an interactive party game where guests become publicly traded "stocks." Their market value is influenced in real-time by other guests through a simple, engaging swiping interface. This project is built as a modern web application designed to run on specific hardware setups within a party environment.

## The Concept

The game turns party guests into living assets on a speculative market.

1.  **Become a Stock:** A guest registers at a dedicated kiosk, gives themselves a nickname, and takes a live photo. They are now a "stock" on the party's stock exchange, starting with an initial value.
2.  **Influence the Market:** Other guests use touchscreen "swipe kiosks" to view the profiles of the registered stocks. Swiping right ("Like") increases a stock's value, while swiping left ("Dislike") decreases it.
3.  **Live Market Data:** Throughout the venue, large display screens show real-time market data, including a live stock ticker, a market overview, a leaderboard of the top-performing stocks, and an AI-generated news feed with satirical headlines about the market's activity.

The theme is a satirical take on finance culture, vanity, and social climbing, all within a hedonistic party setting.

---

## Application Interfaces & Hardware Targets

The application is a single Next.js project but is comprised of three distinct interfaces, each designed for a specific type of hardware:

1.  **Registration Kiosk (`/register`)**
    *   **Purpose:** Where users create their stock profile with a nickname and a live photo. It also serves as an admin panel for managing stocks.
    *   **Target Hardware:** A tablet with a front-facing camera.

2.  **Swipe Kiosk (`/swipe`)**
    *   **Purpose:** Where guests can anonymously "like" (swipe right) or "dislike" (swipe left) profiles, directly influencing their stock value.
    *   **Target Hardware:** A touchscreen device (e.g., a phone or small tablet).

3.  **Display Screens (`/display/*`)**
    *   **Purpose:** A set of live dashboards for projectors or large screens, showing market data. This is a view-only interface with no input capabilities.
    *   **Target Hardware:** Low-power devices like a **Raspberry Pi Zero 2 W** connected to screens. The client-side logic for these views must be lightweight to ensure smooth performance.

---

## Technical Stack

*   **Framework:** Next.js with App Router
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS with ShadCN UI components
*   **Database:** Firebase Firestore (used as the real-time backend)
*   **Authentication:** Firebase Anonymous Authentication (for write permissions from kiosks)
*   **Generative AI:** Google AI (Gemini) via Genkit for profile descriptions and news headlines

---

## Architecture & Contribution Guide

This project was rapidly prototyped and, while functional, has key areas for improvement. Contributors should be aware of the current architecture and its limitations.

### Current State: Direct Client-to-Database Communication

The application currently operates without a dedicated backend API layer. All three client interfaces (Registration, Swipe, Display) communicate **directly with the Firebase Firestore database** using the Firebase client-side SDK.

*   **Pros:** This architecture allows for rapid development and leverages Firestore's excellent real-time capabilities, which is perfect for the live display screens.
*   **Cons & The "Missing Piece":** As you correctly pointed out, this is not a scalable or secure long-term solution. A robust application would have a dedicated API service that sits between the clients and the database. The clients would make requests to the API (e.g., `POST /api/swipe`), and the API would handle all the business logic and database interaction.

### Opportunities for Contribution (Future Work)

The most significant area for improvement is to refactor the application to use a proper backend API, addressing the "single source of truth" concern more robustly.

1.  **Implement a Backend API:**
    *   The highest-impact change would be to create a dedicated backend service (e.g., using Node.js/Express, or Cloud Functions for Firebase).
    *   This API would expose endpoints like `POST /register`, `POST /swipe`, and `GET /stocks`.
    *   All database logic currently found in the client components (especially the transaction in `src/app/swipe/swipe-client.tsx`) should be moved into this API layer.

2.  **Refactor Clients to Use the API:**
    *   Once the API is in place, the frontend components should be updated to make `fetch` requests to the new API endpoints instead of communicating directly with Firestore.
    *   The Display clients would likely switch from direct Firestore listeners to a WebSocket connection or server-sent events (SSE) from the new backend to maintain real-time updates.

By making these changes, we can achieve better security (clients no longer need direct database write access), improved scalability, and a clearer separation of concerns between the frontend and backend.
```