# Chinese Poker Online 🃏 (13-Card Multiplayer Game)

A real-time, highly polished, and responsive multiplayer **Chinese Poker (13-Card Poker)** game built using **React, Vite, Express, and Socket.io**. Features a premium dark-neon casino aesthetic, dynamic card-slotting, instant foul alerts, a smart **Auto-Sort AI**, and local network multiplayer.

---

## 🚀 How to Run the Game

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16 or higher recommended).

### 1. Install Dependencies
Open your terminal in the project directory (`c:/Users/hp/Desktop/antist`) and run:
```bash
npm install
```

### 2. Run in Development Mode
To run with hot reloading (frontend & backend separate):

1. **Start the Backend Server**:
   ```bash
   npm run server
   ```
   This starts the Socket.io backend on **port 5000**.

2. **Start the Frontend Dev Server** (in a separate terminal):
   ```bash
   npm run dev
   ```
   This starts the Vite React application on **port 3000** (with automatic hot-reloads and API/WebSocket proxies to port 5000). Open `http://localhost:3000` in your browser.

---

## 📶 Playing with Friends (Local Circle / Internet)

The easiest way to play with friends in a local circle (on the same Wi-Fi/local network) is to build the production package and serve it on a single port:

1. **Build the Frontend**:
   ```bash
   npm run build
   ```
   This packages the React application into a static `./dist` folder.

2. **Start the Production Server**:
   ```bash
   npm run start
   ```
   The Node.js server starts on **port 5000** and serves the built web client statically.

3. **Connect and Play**:
   - Open your browser to `http://localhost:5000` to play on your own machine.
   - **For Friends on your Wi-Fi**: Find your local IP address (e.g., `192.168.1.15`). Tell your friends to connect to `http://192.168.1.15:5000` on their phones or laptops.
   - Host a game, copy the 6-digit **Room Code**, and share it in your circle!
   - **For Internet Play**: You can expose port 5000 using services like [ngrok](https://ngrok.com/) (`ngrok http 5000`) or deploy the project directly to platforms like Render, Railway, or Heroku.

---

## 🎴 Game Rules & UI Guide

1. **Room Lobby**:
   - Create a room or join one using a 6-digit code.
   - Chat with other players in real-time.
   - Once all joined players are marked **Ready**, the host can press **Start Game**.

2. **Arranging Hands**:
   - Each player gets **13 cards**.
   - You must arrange them into three rows:
     - **Back Row (5 cards)**: Must be your strongest poker hand.
     - **Middle Row (5 cards)**: Must be weaker than or equal to the Back hand.
     - **Front Row (3 cards)**: Must be your weakest hand. (Flushes & Straights do not count here).
   - **Auto-Sort AI Helper ⚡**: Click the `AUTO-SORT` button at the bottom left to instantly find the strongest valid configuration!
   - **Foul Prevention ⚠️**: If Front > Middle or Middle > Back, it is a **foul**. The game warns you and blocks submissions until you fix the order.
   - Press **Lock In Arrangement** when done.

3. **Showdown Phase**:
   - Hands are revealed side-by-side.
   - You get +1 point for each row won against an opponent, and -1 for each lost.
   - **Scoop Sweeps 👑**: Winning all 3 hands against an opponent yields a **+3 bonus points** (+6 total points).
   - If a player fouls, they automatically lose all 3 hands to all non-fouled players.
   - Leaderboard is updated dynamically. The host can press **Next Round** to start another game!
