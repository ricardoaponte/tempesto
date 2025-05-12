// audio-worklet-manager.js
// This file contains the AudioWorklet manager class for the main thread

class AudioWorkletManager {
  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.initialized = false;
    this.initializing = false;
    this.soundBuffers = {};
    this.soundMap = {};
    this.initCallbacks = [];
    this.soundLoadCallbacks = {};
    this.isSoundEnabled = true;

    // Create an audio context that won't start automatically
    // This allows us to create it before user interaction but not start it
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext({ latencyHint: 'interactive', sampleRate: 44100 });
      console.log('Created initial AudioContext in constructor with state:', this.audioContext.state);
    } catch (error) {
      console.error('Failed to create initial AudioContext:', error);
    }
  }

  // Initialize the AudioWorklet system
  async initialize() {
    if (this.initialized || this.initializing) {
      return true;
    }

    this.initializing = true;
    console.log('Starting AudioWorklet initialization');

    try {
      // Create AudioContext only if it doesn't exist yet
      if (!this.audioContext) {
        console.log('No AudioContext exists, creating a new one');
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext({ latencyHint: 'interactive', sampleRate: 44100 });
      }

      console.log('AudioContext state at initialization:', this.audioContext.state);

      // Resume the AudioContext if it's suspended (needed for some browsers)
      if (this.audioContext.state === 'suspended') {
        // We need to wait for a user gesture to resume the AudioContext
        console.log('AudioContext is suspended, attempting to resume');
        try {
          await this.audioContext.resume();
          console.log('AudioContext resumed successfully, new state:', this.audioContext.state);
        } catch (error) {
          console.error('Failed to resume AudioContext:', error);
          this.initializing = false;
          return false;
        }
      }

      // Load the audio processor worklet
      await this.audioContext.audioWorklet.addModule('./src/audio-processor.js');

      // Create the worklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, 'sound-processor');

      // Connect the node to the audio output
      this.workletNode.connect(this.audioContext.destination);

      // Set up message handling from the processor
      this.workletNode.port.onmessage = this.handleProcessorMessage.bind(this);

      // Mark as initialized
      this.initialized = true;
      this.initializing = false;

      // Call any pending initialization callbacks
      this.initCallbacks.forEach(callback => callback());
      this.initCallbacks = [];

      console.log('AudioWorklet initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioWorklet:', error);
      this.initializing = false;
      return false;
    }
  }

  // Handle messages from the processor
  handleProcessorMessage(event) {
    const data = event.data;

    switch (data.type) {
      case 'ready':
        console.log('AudioWorklet processor is ready');
        break;

      case 'soundLoaded':
        if (this.soundLoadCallbacks[data.soundId]) {
          this.soundLoadCallbacks[data.soundId]();
          delete this.soundLoadCallbacks[data.soundId];
        }
        break;

      case 'playStarted':
      case 'playStopped':
      case 'playComplete':
      case 'allSoundsStopped':
        // These events can be used for tracking sound playback status
        break;

      case 'error':
        console.error('AudioWorklet processor error:', data.message);
        break;
    }
  }

  // Load a sound file and prepare it for playback
  async loadSound(name, url) {
    if (!this.initialized) {
      await new Promise(resolve => {
        this.initCallbacks.push(resolve);
        this.initialize();
      });
    }

    try {
      // Fetch the sound file
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      // Decode the audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Convert to Float32Array for the processor
      const channelData = audioBuffer.getChannelData(0);

      // Store the sound ID
      const soundId = name;
      this.soundMap[name] = soundId;

      // Send the buffer to the processor
      return new Promise(resolve => {
        this.soundLoadCallbacks[soundId] = resolve;

        this.workletNode.port.postMessage({
          type: 'loadSound',
          soundId,
          buffer: channelData
        });
      });
    } catch (error) {
      console.error(`Failed to load sound ${name} from ${url}:`, error);
      return false;
    }
  }

  // Play a sound
  playSound(name, options = {}) {
    if (!this.initialized || !this.isSoundEnabled) {
      return -1;
    }

    const soundId = this.soundMap[name];
    if (!soundId) {
      console.error(`Sound ${name} not loaded`);
      return -1;
    }

    this.workletNode.port.postMessage({
      type: 'playSound',
      soundId,
      options
    });

    return 1; // Return a success indicator
  }

  // Stop a specific sound
  stopSound(playId) {
    if (!this.initialized || playId < 0) {
      return;
    }

    this.workletNode.port.postMessage({
      type: 'stopSound',
      playId
    });
  }

  // Stop all sounds
  stopAllSounds() {
    if (!this.initialized) {
      return;
    }

    this.workletNode.port.postMessage({
      type: 'stopAll'
    });
  }

  // Enable or disable sound
  setSoundEnabled(enabled) {
    this.isSoundEnabled = enabled;

    if (!enabled) {
      this.stopAllSounds();
    }
  }

  // Check if sound is enabled
  isSoundEnabled() {
    return this.isSoundEnabled;
  }

  // Resume audio context (useful after user interaction)
  async resumeAudioContext() {
    if (!this.audioContext) {
      // Create AudioContext if it doesn't exist yet
      try {
        console.log('Creating new AudioContext');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.error('Failed to create audio context:', error);
        return false;
      }
    }

    if (this.audioContext.state === 'suspended') {
      try {
        console.log('Resuming AudioContext after user interaction');
        await this.audioContext.resume();
        console.log('AudioContext state after resume:', this.audioContext.state);

        // If this is the first time resuming, complete the initialization
        if (!this.initialized && !this.initializing) {
          console.log('First resume - completing initialization');
          return this.initialize();
        }

        return true;
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        return false;
      }
    } else {
      console.log('AudioContext already running, state:', this.audioContext.state);
    }
    return true;
  }
}

// Create a singleton instance
window.audioWorkletManager = new AudioWorkletManager();
