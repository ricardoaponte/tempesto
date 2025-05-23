// AudioManager.js - Wrapper for AudioWorklet management

export class AudioManager {
  constructor() {
    this.workletManager = window.audioWorkletManager;
    this.isInitialized = false;
  }

  // Initialize the audio system
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      if (this.workletManager) {
        const success = await this.workletManager.initialize();
        this.isInitialized = success;
        return success;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
      return false;
    }
  }

  // Load a sound file
  async loadSound(name, url) {
    if (!this.workletManager) {
      console.warn('AudioWorkletManager not available');
      return false;
    }

    try {
      return await this.workletManager.loadSound(name, url);
    } catch (error) {
      console.error(`Failed to load sound ${name}:`, error);
      return false;
    }
  }

  // Play a sound
  playSound(name, options = {}) {
    if (!this.workletManager || !this.isSoundEnabled()) {
      return -1;
    }

    try {
      return this.workletManager.playSound(name, options);
    } catch (error) {
      console.error(`Failed to play sound ${name}:`, error);
      return -1;
    }
  }

  // Stop a specific sound
  stopSound(playId) {
    if (!this.workletManager || playId < 0) {
      return;
    }

    try {
      this.workletManager.stopSound(playId);
    } catch (error) {
      console.error(`Failed to stop sound ${playId}:`, error);
    }
  }

  // Stop all sounds
  stopAllSounds() {
    if (!this.workletManager) {
      return;
    }

    try {
      this.workletManager.stopAllSounds();
    } catch (error) {
      console.error('Failed to stop all sounds:', error);
    }
  }

  // Enable or disable sound
  setSoundEnabled(enabled) {
    if (this.workletManager) {
      this.workletManager.setSoundEnabled(enabled);
    }

    if (!enabled) {
      this.stopAllSounds();
    }
  }

  // Check if sound is enabled
  isSoundEnabled() {
    return this.workletManager ? this.workletManager.isSoundEnabled : false;
  }

  // Resume audio context after user interaction
  async resumeAudioContext() {
    if (!this.workletManager) {
      return false;
    }

    try {
      return await this.workletManager.resumeAudioContext();
    } catch (error) {
      console.error('Failed to resume audio context:', error);
      return false;
    }
  }

  // Check if audio is available
  isAudioAvailable() {
    return !!this.workletManager;
  }

  // Get audio context state
  getAudioContextState() {
    if (!this.workletManager || !this.workletManager.audioContext) {
      return 'unavailable';
    }
    return this.workletManager.audioContext.state;
  }

  // Batch load multiple sounds
  async loadSounds(soundMap) {
    const loadPromises = Object.entries(soundMap).map(([name, url]) => {
      return this.loadSound(name, url).catch(error => {
        console.error(`Failed to load sound ${name} from ${url}:`, error);
        return false;
      });
    });

    const results = await Promise.all(loadPromises);
    const successCount = results.filter(result => result === true).length;
    
    console.log(`Loaded ${successCount}/${results.length} sounds successfully`);
    return results;
  }

  // Play sound with fallback
  playSoundSafe(name, options = {}, fallbackName = null) {
    let result = this.playSound(name, options);
    
    if (result === -1 && fallbackName) {
      console.warn(`Failed to play ${name}, trying fallback ${fallbackName}`);
      result = this.playSound(fallbackName, options);
    }
    
    return result;
  }

  // Set master volume (if supported by worklet)
  setMasterVolume(volume) {
    if (this.workletManager && this.workletManager.setMasterVolume) {
      this.workletManager.setMasterVolume(Math.max(0, Math.min(1, volume)));
    }
  }

  // Get current master volume (if supported by worklet)
  getMasterVolume() {
    if (this.workletManager && this.workletManager.getMasterVolume) {
      return this.workletManager.getMasterVolume();
    }
    return 1.0; // Default volume
  }
}