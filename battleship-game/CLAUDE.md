# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multiplayer battleship game application with the following key features:
- Multiplayer support (2-5 players) in free-for-all mode
- Shared board where all players place ships (only own ships visible to each player)
- WebSocket-based real-time multiplayer synchronization
- WebRTC infrastructure present for future P2P implementation
- Dynamic board sizing based on player count (2p: 10x10, 3p: 12x12, 4p: 15x15, 5p: 20x20)
- Turn-based combat with single coordinate attacks per turn
- Action history tracking for all game events
- Automatic ship placement at game start
- Real-time game statistics and player status

## Technology Stack

- **Frontend**: React 19.1.0 + Vite 7.0.0 + Tailwind CSS 4.1.11
- **Communication**: WebSocket (ws 8.18.3) for real-time multiplayer, Simple-peer 9.11.1 for WebRTC infrastructure
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
        │   └── useWebRTC.js       # WebSocket/WebRTC connectivity
        └── utils/          # Utility functions
            └── shipPlacement.js   # Ship placement algorithms
```

### Key Architecture Decisions
- **Communication**: Currently using WebSocket for all real-time game synchronization
- **WebRTC**: Infrastructure present but not actively used (ready for future P2P implementation)
- **State Management**: Custom React hooks for game state and connectivity
- **Real-time Sync**: All game actions synchronized through WebSocket server
- **Shared Board**: Multiple players can place ships on same board, overlapping ships all take damage when attacked
- **Styling**: Tailwind CSS with Vite integration for modern CSS workflow
- **Dependencies**: Minimal dependency footprint focusing on core functionality

### Current Implementation Status
- ✅ Complete lobby system with room creation/joining
- ✅ Real-time multiplayer game synchronization via WebSocket
- ✅ Dynamic board sizing based on player count
- ✅ Automatic ship placement system
- ✅ Turn-based combat system
- ✅ Action history tracking with timestamps
- ✅ Game statistics display
- ✅ WebSocket server for multiplayer signaling
- ✅ Responsive UI with Tailwind CSS
- ✅ Modern React 19 with hooks-based architecture

### Testing Strategy
- No test framework currently implemented
- Focus areas should be: game logic, multiplayer synchronization, UI components, and ship placement algorithms
- Recommended: Add Jest + React Testing Library for comprehensive testing
- Consider testing WebSocket connections and game state synchronization

### Development Process
- Modern JavaScript (ES modules) with JSX for React components
- Tailwind CSS 4.x with Vite integration for styling
- ESLint configured with React-specific rules and hooks validation
- Hot module replacement via Vite for fast development
- Node.js WebSocket server for multiplayer functionality

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
- **WebSocket server**: `npm run server` - Starts the WebSocket server on port 8080 (required for multiplayer)

### Production
- **Build**: `npm run build` - Builds the application for production
- **Preview**: `npm run preview` - Preview the production build locally

### Code Quality
- **Lint**: `npm run lint` - Run ESLint to check code quality and React best practices

### Testing
- **Test**: No test framework currently configured
- **Recommended**: Add Jest + React Testing Library + WebSocket testing utilities

### Development Workflow
1. Navigate to `battleship-game/` directory
2. Install dependencies: `npm install` (if first time)
3. Start WebSocket server: `npm run server` (keep running in one terminal)
4. Start development server: `npm run dev` (in another terminal)
5. Open browser to displayed URL (typically http://localhost:5173)
6. Create or join rooms to test multiplayer functionality
7. Run linting before commits: `npm run lint`

### Environment Setup
- Node.js required for WebSocket server and build tools
- No additional environment variables needed
- .env files are gitignored at root level for future configuration needs

## Important Notes
- The WebSocket server must be running for multiplayer functionality
- Game state is synchronized in real-time across all connected players
- Ship placement is automatic - no manual placement interface currently
- All game logic happens client-side with WebSocket synchronization
- The application uses modern React patterns (hooks, functional components)