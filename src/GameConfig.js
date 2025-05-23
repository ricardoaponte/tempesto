// GameConfig.js - Centralized game configuration and constants

const WEB_DEPTH = 60;

export const CONFIG = {
  // Environment
  NUM_STARS: 200,

  // Web Configuration
  WEB: {
    DEPTH: WEB_DEPTH,
    RADIUS: 9,
    NUM_LANES: 16,
    COLOR_SPEED: 0.1,
    INITIAL_HUE: 180 // Starting with cyan (180 degrees in HSL)
  },

  // Player Configuration
  PLAYER: {
    Z_POSITION: WEB_DEPTH / 2, // WEB_DEPTH / 2
    LANE_CHANGE_RATE: 6
  },

  // Enemy Configuration
  ENEMIES: {
    START_Z: -WEB_DEPTH / 2 + 1, // -WEB_DEPTH / 2 + 1
    END_Z: WEB_DEPTH / 2 - 2,    // WEB_DEPTH / 2 - 2
    SPEED: 0.08,
    SPAWN_INTERVAL: 50,
    PER_LEVEL: 20
  },

  // Projectile Configuration
  PROJECTILES: {
    SPEED: 0.6,
    MAX_SHOTS: 10
  },

  // Power-up Configuration
  POWER_UPS: {
    CHANCE: 0.15, // 15% chance of power-up spawn per enemy kill
    DURATION: 10000 // 10 seconds
  },

  // Collision Detection
  COLLISION: {
    Z_TOLERANCE: 1.0
  },

  // Scoring
  SCORING: {
    BOMB_POINTS: 3000
  },

  // Game Flow
  GAME_FLOW: {
    COUNTDOWN_TIME: 3 // 3-second countdown
  },

  // Default Settings
  DEFAULTS: {
    DIFFICULTY: 'medium',
    SHIP_TYPE: 'classic',
    WEB_TYPE: 'circle',
    TUBE_WIDTH: 'large',
    LIVES: 3,
    SOUND_ENABLED: true,
    ROTATION_ENABLED: false
  },

  // LocalStorage Keys
  STORAGE_KEYS: {
    ROTATION_X: 'tempest3d_rotationX',
    ROTATION_Y: 'tempest3d_rotationY',
    ROTATION_ENABLED: 'tempest3d_rotationEnabled',
    HIGH_SCORE: 'tempest3d_highScore',
    SOUND_ENABLED: 'tempest3d_soundEnabled',
    LEADERBOARD: 'tempest3d_leaderboard'
  },

  // Game States
  GAME_STATES: {
    MENU: 'menu',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover',
    LEVEL_COMPLETE: 'levelcomplete'
  },

  // Ship Types
  SHIP_TYPES: {
    CLASSIC: 'classic',
    STEALTH: 'stealth',
    DESTROYER: 'destroyer',
    RACER: 'racer',
    ALIEN: 'alien',
    CRYSTAL: 'crystal'
  },

  // Web Types
  WEB_TYPES: {
    CIRCLE: 'circle',
    PENTAGON: 'pentagon',
    HEXAGON: 'hexagon',
    OCTAGON: 'octagon',
    RANDOM: 'random'
  },

  // Tube Widths
  TUBE_WIDTHS: {
    WIRE: 'wire',
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large'
  },

  // Difficulty Levels
  DIFFICULTY_LEVELS: {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
  },

  // Player Speed Settings
  PLAYER_SPEEDS: {
    SLOW: 'slow',
    NORMAL: 'normal',
    FAST: 'fast'
  },

  // Power-up Types
  POWER_UP_TYPES: {
    RAPID_FIRE: 'rapidFire',
    SUPER_PROJECTILE: 'superProjectile'
  }
};

// Computed values that depend on other config values
export const COMPUTED = {
  get LANE_ANGLE_STEP() {
    return (Math.PI * 2) / CONFIG.WEB.NUM_LANES;
  }
};

// Default game state initialization
export const INITIAL_STATE = {
  score: 0,
  highScore: 0,
  lives: CONFIG.DEFAULTS.LIVES,
  level: 1,
  enemiesKilled: 0,
  enemiesRequired: CONFIG.ENEMIES.PER_LEVEL,
  bombs: 0,
  shields: 0,
  lastBombMilestone: 0
};

// Default power-up state
export const INITIAL_POWER_UPS = {
  rapidFire: false,
  superProjectile: false
};

// Default web color state
export const INITIAL_WEB_COLOR = {
  hue: CONFIG.WEB.INITIAL_HUE
};

// Default rotation state
export const INITIAL_ROTATION = {
  targetX: 0,
  targetY: 0,
  enabled: CONFIG.DEFAULTS.ROTATION_ENABLED
};

// Utility function to get lane angle step
export function getLaneAngleStep(numLanes = CONFIG.WEB.NUM_LANES) {
  return (Math.PI * 2) / numLanes;
}

// Utility function to get player lane index for center
export function getCenterLaneIndex(numLanes = CONFIG.WEB.NUM_LANES) {
  return Math.floor(numLanes / 2);
}
