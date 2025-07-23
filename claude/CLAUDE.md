# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multiplayer battleship game application with the following key features:
- Multiplayer support (2-5 players) in free-for-all mode
- Shared board where all players place ships (only own ships visible to each player)
- **WebRTC P2P communication** for real-time game synchronization with WebSocket signaling
- Dynamic board sizing based on player count (2p: 5x5, 3p: 7x7, 4p: 10x10, 5p: 12x12)
- Turn-based combat with single coordinate attacks per turn
- Action history tracking for all game events
- Automatic ship placement at game start
- Real-time game statistics and player status
- P2P connection status visualization in lobby

## Technology Stack

- **Frontend**: React 19.1.0 + Vite 7.0.0 + Tailwind CSS 4.1.11
- **Communication**: WebRTC P2P (game data) + WebSocket (ws 8.18.3) (signaling only)
- **Language**: JavaScript (JSX for React components)
- **Build Tool**: Vite with React plugin
- **Styling**: Tailwind CSS with Vite integration
- **Code Quality**: ESLint with React-specific rules

## Development Guidelines

### Project Structure
The project is organized as follows:

```
/
├── .gitignore               # Root gitignore (environment files)
├── CLAUDE.md               # This file - project guidance
├── spec.md                 # Project specification
└── battleship-game/        # Main application directory
    ├── .gitignore          # Application-specific gitignore
    ├── README.md           # Application documentation
    ├── package.json        # Dependencies and scripts
    ├── package-lock.json   # Dependency lock file
    ├── vite.config.js      # Vite configuration
    ├── eslint.config.js    # ESLint configuration
    ├── index.html          # Application entry HTML
    ├── server.js           # WebSocket server for multiplayer
    ├── public/             # Static assets
    │   └── vite.svg        # Vite logo
    └── src/                # Application source code
        ├── main.jsx        # React application entry point
        ├── App.jsx         # Main application component
        ├── App.css         # Application-specific styles
        ├── index.css       # Global styles and Tailwind imports
        ├── assets/         # Application assets
        │   └── react.svg   # React logo
        ├── components/     # React components
        │   ├── ActionHistory.jsx  # Game action history display
        │   ├── GameBoard.jsx      # Main game board component
        │   ├── GameStats.jsx      # Game statistics display
        │   └── Lobby.jsx          # Room creation/joining interface
        ├── hooks/          # Custom React hooks
        │   ├── useGameState.js    # Game state management
        │   ├── useWebSocket.js    # WebSocket connectivity (legacy)
        │   └── useWebRTC.js       # WebRTC P2P communication
        └── utils/          # Utility functions
            └── shipPlacement.js   # Ship placement algorithms
```

### Key Architecture Decisions
- **Communication**: WebRTC P2P for game data + WebSocket for signaling only
- **State Management**: Custom React hooks for game state and P2P connectivity
- **Real-time Sync**: All game actions synchronized through WebRTC DataChannels
- **P2P Architecture**: Host-based mesh network for multiplayer synchronization
- **Shared Board**: Multiple players can place ships on same board, overlapping ships all take damage when attacked
- **Styling**: Tailwind CSS with Vite integration for modern CSS workflow
- **Dependencies**: Minimal dependency footprint focusing on core functionality

### Current Implementation Status
- ✅ Complete lobby system with room creation/joining
- ✅ **WebRTC P2P communication** for real-time multiplayer game synchronization
- ✅ **WebSocket signaling server** for WebRTC connection establishment
- ✅ **P2P connection status visualization** in lobby interface
- ✅ Dynamic board sizing based on player count (corrected: 2p:5x5, 3p:7x7, 4p:10x10, 5p:12x12)
- ✅ Automatic ship placement system
- ✅ Turn-based combat system with P2P synchronization
- ✅ Action history tracking with timestamps
- ✅ Game statistics display
- ✅ Responsive UI with Tailwind CSS
- ✅ Modern React 19 with hooks-based architecture

### Testing Strategy
- No test framework currently implemented
- Focus areas should be: game logic, WebRTC P2P synchronization, UI components, and ship placement algorithms
- Recommended: Add Jest + React Testing Library for comprehensive testing
- Consider testing WebRTC connections, P2P game state synchronization, and signaling server functionality

### Development Process
- Modern JavaScript (ES modules) with JSX for React components
- Tailwind CSS 4.x with Vite integration for styling
- ESLint configured with React-specific rules and hooks validation
- Hot module replacement via Vite for fast development
- Node.js WebSocket server for WebRTC signaling (not game data)
- WebRTC P2P for low-latency game communication

## Game Rules Summary

- **Players**: 2-5 players in free-for-all mode
- **Victory Conditions**: Last player with ships remaining OR highest ship count when turn limit reached
- **Ship Placement**: Automatic placement at game start on shared board
- **Combat**: One attack per turn targeting single coordinate
- **Damage**: All overlapping ships at attacked coordinate take damage
- **Turn Order**: Sequential turn-based gameplay
- **History**: Complete action log with timestamps for all game events
- **UI Focus**: Clear visual feedback and ease of use

## Commands

All commands should be run from the `battleship-game/` directory:

### Development
- **Dev server**: `npm run dev` - Starts the Vite development server (default: http://localhost:5173)
- **Signaling server**: `npm run server` - Starts the WebSocket signaling server on port 8080 (required for WebRTC P2P connection establishment)

### Production
- **Build**: `npm run build` - Builds the application for production
- **Preview**: `npm run preview` - Preview the production build locally

### Code Quality
- **Lint**: `npm run lint` - Run ESLint to check code quality and React best practices

### Testing
- **Test**: No test framework currently configured
- **Recommended**: Add Jest + React Testing Library + WebRTC/WebSocket testing utilities

### Development Workflow
1. Navigate to `battleship-game/` directory
2. Install dependencies: `npm install` (if first time)
3. Start signaling server: `npm run server` (keep running in one terminal)
4. Start development server: `npm run dev` (in another terminal)
5. Open browser to displayed URL (typically http://localhost:5173)
6. Create or join rooms to test WebRTC P2P multiplayer functionality
7. Monitor WebRTC connection status in lobby interface
8. Run linting before commits: `npm run lint`

### Environment Setup
- Node.js required for signaling server and build tools
- No additional environment variables needed
- .env files are gitignored at root level for future configuration needs
- Modern browser with WebRTC support required

## Important Notes
- The WebSocket signaling server must be running for WebRTC connection establishment
- Game state is synchronized in real-time via WebRTC P2P connections
- Ship placement is automatic - no manual placement interface currently
- All game logic happens client-side with WebRTC P2P synchronization
- WebSocket is used only for signaling, not for game data transmission
- The application uses modern React patterns (hooks, functional components)
- WebRTC provides low-latency, direct peer-to-peer communication