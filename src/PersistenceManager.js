// PersistenceManager.js - Handle localStorage operations for game data

import { CONFIG } from './GameConfig.js';

export class PersistenceManager {
  constructor() {
    this.storageKeys = CONFIG.STORAGE_KEYS;
  }

  // --- Rotation State Management ---
  saveRotationState(targetRotationX, targetRotationY, isRotationEnabled) {
    try {
      localStorage.setItem(this.storageKeys.ROTATION_X, targetRotationX);
      localStorage.setItem(this.storageKeys.ROTATION_Y, targetRotationY);
      localStorage.setItem(this.storageKeys.ROTATION_ENABLED, isRotationEnabled);
    } catch (e) {
      console.error("Failed to save rotation state to localStorage:", e);
    }
  }

  loadRotationState() {
    try {
      const savedRotationX = localStorage.getItem(this.storageKeys.ROTATION_X);
      const savedRotationY = localStorage.getItem(this.storageKeys.ROTATION_Y);
      const savedRotationEnabled = localStorage.getItem(this.storageKeys.ROTATION_ENABLED);

      return {
        targetRotationX: savedRotationX !== null ? parseFloat(savedRotationX) : 0,
        targetRotationY: savedRotationY !== null ? parseFloat(savedRotationY) : 0,
        isRotationEnabled: savedRotationEnabled !== null ? savedRotationEnabled === 'true' : CONFIG.DEFAULTS.ROTATION_ENABLED
      };
    } catch (e) {
      console.error("Failed to load rotation state from localStorage:", e);
      return {
        targetRotationX: 0,
        targetRotationY: 0,
        isRotationEnabled: CONFIG.DEFAULTS.ROTATION_ENABLED
      };
    }
  }

  // --- High Score Management ---
  saveHighScore(score) {
    try {
      localStorage.setItem(this.storageKeys.HIGH_SCORE, score);
    } catch (e) {
      console.error("Failed to save high score to localStorage:", e);
    }
  }

  loadHighScore() {
    try {
      const savedHighScore = localStorage.getItem(this.storageKeys.HIGH_SCORE);
      return savedHighScore !== null ? parseInt(savedHighScore) : 0;
    } catch (e) {
      console.error("Failed to load high score from localStorage:", e);
      return 0;
    }
  }

  // --- Sound State Management ---
  saveSoundState(isSoundEnabled) {
    try {
      localStorage.setItem(this.storageKeys.SOUND_ENABLED, isSoundEnabled);
    } catch (e) {
      console.error("Failed to save sound state to localStorage:", e);
    }
  }

  loadSoundState() {
    try {
      const savedSoundState = localStorage.getItem(this.storageKeys.SOUND_ENABLED);
      return savedSoundState !== null ? savedSoundState === 'true' : CONFIG.DEFAULTS.SOUND_ENABLED;
    } catch (e) {
      console.error("Failed to load sound state from localStorage:", e);
      return CONFIG.DEFAULTS.SOUND_ENABLED;
    }
  }

  // --- Leaderboard Management ---
  saveLeaderboard(leaderboardData) {
    try {
      localStorage.setItem(this.storageKeys.LEADERBOARD, JSON.stringify(leaderboardData));
    } catch (e) {
      console.error("Failed to save leaderboard to localStorage:", e);
    }
  }

  loadLeaderboard() {
    try {
      const savedLeaderboard = localStorage.getItem(this.storageKeys.LEADERBOARD);
      return savedLeaderboard !== null ? JSON.parse(savedLeaderboard) : [];
    } catch (e) {
      console.error("Failed to load leaderboard from localStorage:", e);
      return [];
    }
  }

  // --- Generic Storage Methods ---
  save(key, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, stringValue);
    } catch (e) {
      console.error(`Failed to save ${key} to localStorage:`, e);
    }
  }

  load(key, defaultValue = null, parser = null) {
    try {
      const savedValue = localStorage.getItem(key);
      if (savedValue === null) {
        return defaultValue;
      }

      if (parser) {
        return parser(savedValue);
      }

      // Try to parse as JSON first, fall back to string
      try {
        return JSON.parse(savedValue);
      } catch {
        return savedValue;
      }
    } catch (e) {
      console.error(`Failed to load ${key} from localStorage:`, e);
      return defaultValue;
    }
  }

  // --- Clear Storage ---
  clearAll() {
    try {
      Object.values(this.storageKeys).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
    }
  }

  clearKey(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove ${key} from localStorage:`, e);
    }
  }

  // --- Storage Availability Check ---
  isStorageAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
}