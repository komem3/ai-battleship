# Battleship Game

multiplayer battleship game built with React, Vite, and WebSocket for real-time communication.

## Features

- **Multiplayer Support**: 2-5 players in free-for-all mode
- **Real-time Architecture**: WebSocket for real-time game synchronization
- **Dynamic Board Sizing**: Board size changes based on player count
  - 2 players: 5x5
  - 3 players: 7x7
  - 4 players: 10x10
  - 5 players: 12x12
- **Automatic Ship Placement**: Ships are automatically placed at game start
- **Real-time Combat**: Turn-based attacks with live updates
- **Action History**: Complete game log with timestamps
- **Victory Conditions**: Last player standing or highest ship count when turn limit reached

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the WebSocket signaling server:

```bash
npm run server
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## How to Play

1. **Create a Room**: Enter your name and click "ルームを作成" to create a new game room
2. **Join a Room**: Enter your name and a room code, then click "ルームに参加" to join an existing room
3. **Start Game**: Host can start the game when 2 or more players have joined
4. **Play**: Take turns clicking on board coordinates to attack other players' ships
5. **Win**: Be the last player with ships remaining, or have the most ships when the turn limit is reached

## Game Rules

- Each player has 5 ships of different sizes (Carrier, Battleship, Cruiser, Submarine, Destroyer)
- Ships are placed automatically on a shared board
- Players can only see their own ships
- One attack per turn
- If ships overlap, all overlapping ships take damage
- Game ends when only one player has ships remaining or turn limit is reached

## Technical Architecture

- **Frontend**: React with Vite and Tailwind CSS
- **Real-time Communication**: WebSocket for multiplayer synchronization
- **Signaling**: WebSocket server for connection establishment
- **State Management**: Custom React hooks for game state

## Development

The project uses:

- React 19 with hooks
- Vite for build tooling
- Tailwind CSS for styling
- WebSocket for real-time communication
- WebSocket for signaling

Run `npm run lint` to check code quality.
