# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orbitron is a 3D tunnel shooter game built with vanilla JavaScript and Three.js. The game features a player ship moving through a rotating tunnel web, shooting at enemies and collecting power-ups. It includes a leaderboard system hosted on Cloudflare Pages with KV storage.

## Architecture

### Core Structure
- **index.html**: Main game interface with UI elements, menus, and game controls
- **src/main.js**: Primary game logic (~40k+ lines) containing all game mechanics, Three.js rendering, physics, and state management
- **src/audio-worklet-manager.js**: Audio system using Web Audio API with AudioWorklet for low-latency sound processing
- **src/audio-processor.js**: AudioWorklet processor for real-time audio processing
- **functions/api/leaderboard.js**: Cloudflare Pages Function for leaderboard API with anti-cheat measures

### Game Systems
- **3D Rendering**: Three.js-based tunnel web system with procedural geometry
- **Game States**: Menu, countdown, playing, paused, gameover, levelcomplete
- **Player System**: Lane-based movement with configurable ship types and speeds
- **Enemy System**: Dynamic emoji-based enemies with pulsating effects and variable behaviors
- **Power-up System**: Object-based management for rapid fire and super projectile abilities
- **Audio System**: AudioWorklet-based sound processing with multiple audio assets
- **Leaderboard**: Global scoring system with rate limiting and validation

### Key Variables and Configuration
- Game uses lane-based movement system (16 lanes by default)
- Fixed Z-position system for depth management
- Power-up duration: 10 seconds
- Collision detection with Z-tolerance system
- Configurable difficulty levels affecting enemy speed and spawn rates

## Development Commands

### Local Development
- **Start local server**: Use any static file server (e.g., `python3 -m http.server 8000` or `npx serve`)
- **No build process**: Game runs directly in browser with vanilla JS and CDN Three.js

### Audio Development
- Audio files located in `assets/sounds/`
- AudioWorklet requires HTTPS or localhost for security
- Sound system initializes on first user interaction

### Leaderboard Development
- API endpoint: Cloudflare Pages Function at `/functions/api/leaderboard.js`
- Requires LEADERBOARD_KV namespace binding in Cloudflare Dashboard
- Local testing requires Cloudflare Wrangler for KV simulation

## Code Patterns

### Global State Management
The game uses extensive global variables in main.js for game state. Key patterns:
- Game objects stored in arrays: `enemies[]`, `projectiles[]`, `powerUps[]`, `explosions[]`
- State flags: `gameState`, `isPaused`, `isSoundEnabled`
- Configuration objects: `activePowerUps{}`, `keyState{}`

### Audio System
Uses AudioWorklet for low-latency audio processing:
- Main thread: `AudioWorkletManager` class handles loading and playback
- Worker thread: `audio-processor.js` handles real-time audio processing
- Message passing between main thread and AudioWorklet

### Three.js Integration
- Scene graph with procedural tunnel web geometry
- Custom materials and shaders for visual effects
- Animation loop integrated with game logic updates

## Important Notes

### Performance Considerations
- Large monolithic main.js file (~40k+ lines) - consider modularization for major changes
- Object pooling used for frequently created/destroyed game objects
- RequestAnimationFrame-based game loop with delta time calculations

### Browser Compatibility
- Requires modern browser with Web Audio API and AudioWorklet support
- Uses ES6+ features throughout codebase
- Three.js r128 loaded from CDN

### Security
- Leaderboard includes anti-cheat measures (score limits, rate limiting)
- No sensitive data stored client-side
- CORS headers configured for API access