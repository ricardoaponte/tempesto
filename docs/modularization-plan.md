# Orbitron Modularization Plan

## Current State Analysis

The main.js file (~40k+ lines) contains all game logic in a monolithic structure with these major sections:

### Section Breakdown (by line numbers)
1. **Global Variables** (1-101): Game state, configuration, arrays for game objects
2. **UI Elements** (102-137): DOM element references
3. **Persistence Functions** (138-197): Save/load for rotation, high score, sound state
4. **Settings & Controls** (198-701): Fullscreen, sound, mobile controls, event handlers
5. **Initialization** (702-820): Main init function and Three.js setup
6. **Lighting & Environment** (821-899): Scene lighting and background stars
7. **Web Geometry** (900-1043): Tunnel web creation (circle, polygon types)
8. **Player System** (1044-1957): Ship creation, designs, animation, movement
9. **Game Settings** (1958-2064): Configuration and settings application
10. **Game Flow** (2065-2340): Start, countdown, restart, replay functions
11. **Game Objects** (2341-2700): Projectiles, enemies, power-ups, explosions
12. **Game Logic** (2701-3377): Power-ups, game state updates, collision detection
13. **Rendering Loop** (3378-3429): Animation loop and updates
14. **Event Handlers** (3430-3559): Input handling, bombs, settings
15. **Audio Integration** (3560-3631): Audio system initialization
16. **Leaderboard** (3632-3885): Score submission and display
17. **Bootstrap** (3886+): Final initialization

## Proposed Module Structure

### Core Modules

#### 1. `GameConfig.js`
**Purpose**: Centralize all game configuration and constants
```javascript
export const CONFIG = {
  WEB: { DEPTH: 60, RADIUS: 9, NUM_LANES: 16 },
  PLAYER: { Z_POSITION: 30, LANE_CHANGE_RATE: 6 },
  ENEMIES: { START_Z: -29, END_Z: 28, SPEED: 0.08 },
  PROJECTILES: { SPEED: 0.6, MAX_SHOTS: 10 },
  POWER_UPS: { CHANCE: 0.15, DURATION: 10000 },
  COLLISION: { Z_TOLERANCE: 1.0 },
  STORAGE_KEYS: { /* ... */ }
};
```

#### 2. `GameState.js`
**Purpose**: Manage game state and transitions
```javascript
export class GameState {
  constructor() {
    this.state = 'menu';
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    // ...
  }
  
  setState(newState) { /* ... */ }
  reset() { /* ... */ }
  nextLevel() { /* ... */ }
}
```

#### 3. `Player.js`
**Purpose**: Player ship creation, movement, and animation
```javascript
export class Player {
  constructor(scene, shipType) { /* ... */ }
  createShip(type) { /* ... */ }
  update(deltaTime) { /* ... */ }
  moveToLane(laneIndex) { /* ... */ }
  animate(deltaTime) { /* ... */ }
}
```

#### 4. `EnemySystem.js`
**Purpose**: Enemy creation, behavior, and management
```javascript
export class EnemySystem {
  constructor(scene) {
    this.enemies = [];
  }
  
  spawnEnemy(laneIndex) { /* ... */ }
  updateEnemies(deltaTime) { /* ... */ }
  removeEnemy(enemy) { /* ... */ }
}
```

#### 5. `ProjectileSystem.js`
**Purpose**: Projectile creation and physics
```javascript
export class ProjectileSystem {
  constructor(scene) {
    this.projectiles = [];
  }
  
  fireProjectile(fromLane, type) { /* ... */ }
  updateProjectiles(deltaTime) { /* ... */ }
  removeProjectile(projectile) { /* ... */ }
}
```

#### 6. `PowerUpSystem.js`
**Purpose**: Power-up creation, application, and management
```javascript
export class PowerUpSystem {
  constructor(scene) {
    this.powerUps = [];
    this.activePowerUps = {};
  }
  
  spawnPowerUp(position) { /* ... */ }
  applyPowerUp(type) { /* ... */ }
  updatePowerUps(deltaTime) { /* ... */ }
}
```

#### 7. `WebGeometry.js`
**Purpose**: Tunnel web creation and management
```javascript
export class WebGeometry {
  constructor(scene) { /* ... */ }
  
  createWeb(type, customSides) { /* ... */ }
  createCircleWeb() { /* ... */ }
  createPolygonWeb(sides) { /* ... */ }
  updateWebColor(deltaTime) { /* ... */ }
}
```

#### 8. `CollisionSystem.js`
**Purpose**: Collision detection and response
```javascript
export class CollisionSystem {
  checkPlayerEnemyCollisions(player, enemies) { /* ... */ }
  checkProjectileEnemyCollisions(projectiles, enemies) { /* ... */ }
  checkPlayerPowerUpCollisions(player, powerUps) { /* ... */ }
}
```

#### 9. `UI.js`
**Purpose**: UI updates and DOM management
```javascript
export class UI {
  constructor() {
    this.elements = { /* DOM references */ };
  }
  
  updateScore(score) { /* ... */ }
  updateLives(lives) { /* ... */ }
  showGameOver() { /* ... */ }
  showMenu() { /* ... */ }
}
```

#### 10. `InputHandler.js`
**Purpose**: Input processing and mobile controls
```javascript
export class InputHandler {
  constructor() {
    this.keyState = {};
    this.setupEventListeners();
  }
  
  setupEventListeners() { /* ... */ }
  setupMobileControls() { /* ... */ }
  isKeyPressed(key) { /* ... */ }
}
```

#### 11. `SceneManager.js`
**Purpose**: Three.js scene setup and rendering
```javascript
export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
  
  initializeScene() { /* ... */ }
  addLighting() { /* ... */ }
  createStars() { /* ... */ }
  render() { /* ... */ }
}
```

#### 12. `AudioManager.js`
**Purpose**: Audio integration wrapper
```javascript
export class AudioManager {
  constructor() {
    this.workletManager = window.audioWorkletManager;
  }
  
  async initialize() { /* ... */ }
  playSound(name, options) { /* ... */ }
  setSoundEnabled(enabled) { /* ... */ }
}
```

#### 13. `LeaderboardManager.js`
**Purpose**: Leaderboard API integration
```javascript
export class LeaderboardManager {
  async fetchLeaderboard() { /* ... */ }
  async submitScore(initials, score) { /* ... */ }
  displayLeaderboard(data) { /* ... */ }
}
```

#### 14. `PersistenceManager.js`
**Purpose**: Local storage management
```javascript
export class PersistenceManager {
  saveHighScore(score) { /* ... */ }
  loadHighScore() { /* ... */ }
  saveSoundState(enabled) { /* ... */ }
  loadSoundState() { /* ... */ }
}
```

#### 15. `Game.js`
**Purpose**: Main game orchestrator
```javascript
export class Game {
  constructor() {
    this.sceneManager = new SceneManager();
    this.gameState = new GameState();
    this.player = null;
    this.enemySystem = new EnemySystem();
    // ... other systems
  }
  
  initialize() { /* ... */ }
  startGame() { /* ... */ }
  update(deltaTime) { /* ... */ }
  render() { /* ... */ }
}
```

## Migration Strategy

### Phase 1: Extract Utilities and Constants (Low Risk)
1. Create `GameConfig.js` with all constants
2. Create `PersistenceManager.js` for localStorage functions
3. Update main.js to import and use these modules

### Phase 2: Extract Independent Systems (Medium Risk)
1. Create `AudioManager.js` wrapper
2. Create `LeaderboardManager.js`
3. Create `UI.js` for DOM manipulation
4. Create `InputHandler.js` for event handling

### Phase 3: Extract Core Game Systems (High Risk)
1. Create `SceneManager.js` for Three.js setup
2. Create `WebGeometry.js` for tunnel creation
3. Create `Player.js` for player management
4. Create `CollisionSystem.js` for collision detection

### Phase 4: Extract Complex Game Logic (Highest Risk)
1. Create `EnemySystem.js`
2. Create `ProjectileSystem.js`
3. Create `PowerUpSystem.js`
4. Create `GameState.js` for state management

### Phase 5: Final Integration (Critical)
1. Create main `Game.js` orchestrator
2. Update `index.html` to use ES6 modules
3. Refactor main.js to minimal bootstrap
4. Comprehensive testing

## Implementation Considerations

### Dependencies
- Most modules will need scene reference from SceneManager
- GameState will be shared across multiple systems
- UI updates will need game state data
- Audio and input systems are relatively independent

### Shared State Management
- Consider using event system or observer pattern for decoupling
- GameState should emit events for UI updates
- Collision system should emit events for score/life changes

### Module Loading
- Use ES6 modules with proper import/export
- Consider dynamic imports for ship designs (lazy loading)
- Maintain backward compatibility during transition

### Testing Strategy
- Start with utility modules (easiest to test)
- Create integration tests for system interactions
- Maintain functional equivalence during refactoring
- Use feature flags to toggle between old/new implementations

## Benefits of Modularization

1. **Maintainability**: Easier to locate and modify specific functionality
2. **Reusability**: Ship designs, collision detection can be reused
3. **Testing**: Individual modules can be unit tested
4. **Performance**: Potential for lazy loading and tree shaking
5. **Collaboration**: Multiple developers can work on different modules
6. **Code Quality**: Forced separation of concerns and dependency management

## Risks and Mitigation

### Risks
- Breaking existing functionality during refactor
- Performance impact from module boundaries
- Increased complexity in dependency management
- Potential circular dependencies

### Mitigation
- Incremental migration with thorough testing
- Performance benchmarking during migration
- Clear dependency graphs and interfaces
- Use dependency injection to avoid circular imports