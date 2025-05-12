// audio-processor.js
// This file contains the AudioWorkletProcessor implementation for sound processing

class SoundProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Initialize state
    this._buffers = {};
    this._playing = {};
    this._nextSoundId = 1;

    // Listen for messages from the main thread
    this.port.onmessage = this.handleMessage.bind(this);

    // Send ready message
    this.port.postMessage({ type: 'ready' });
  }

  // Handle messages from the main thread
  handleMessage(event) {
    const data = event.data;

    switch (data.type) {
      case 'loadSound':
        this._buffers[data.soundId] = data.buffer;
        this.port.postMessage({ type: 'soundLoaded', soundId: data.soundId });
        break;

      case 'playSound':
        this.playSound(data.soundId, data.options || {});
        break;

      case 'stopSound':
        this.stopSound(data.playId);
        break;

      case 'stopAll':
        this.stopAllSounds();
        break;
    }
  }

  // Start playing a sound
  playSound(soundId, options = {}) {
    if (!this._buffers[soundId]) {
      this.port.postMessage({
        type: 'error',
        message: `Sound with ID ${soundId} not found`
      });
      return;
    }

    const playId = this._nextSoundId++;
    const volume = options.volume !== undefined ? options.volume : 1.0;
    const loop = options.loop || false;

    this._playing[playId] = {
      buffer: this._buffers[soundId],
      position: 0,
      volume,
      loop
    };

    this.port.postMessage({
      type: 'playStarted',
      playId,
      soundId
    });

    return playId;
  }

  // Stop a playing sound
  stopSound(playId) {
    if (this._playing[playId]) {
      delete this._playing[playId];
      this.port.postMessage({
        type: 'playStopped',
        playId
      });
    }
  }

  // Stop all playing sounds
  stopAllSounds() {
    const playIds = Object.keys(this._playing);
    playIds.forEach(playId => {
      delete this._playing[playId];
    });

    this.port.postMessage({
      type: 'allSoundsStopped',
      count: playIds.length
    });
  }

  // Process audio
  process(inputs, outputs, parameters) {
    const output = outputs[0];

    // Clear output buffer
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      for (let i = 0; i < outputChannel.length; i++) {
        outputChannel[i] = 0;
      }
    }

    // Process all playing sounds
    const playIds = Object.keys(this._playing);

    for (const playId of playIds) {
      const sound = this._playing[playId];
      const buffer = sound.buffer;

      // Skip if no buffer data
      if (!buffer || !buffer.length) continue;

      // Mix this sound into the output
      for (let channel = 0; channel < output.length; channel++) {
        const outputChannel = output[channel];

        for (let i = 0; i < outputChannel.length; i++) {
          // Get sample from buffer (assuming mono for simplicity)
          const bufferIndex = sound.position + i;

          if (bufferIndex < buffer.length) {
            // Add sample to output, applying volume
            outputChannel[i] += buffer[bufferIndex] * sound.volume;
          }
        }
      }

      // Update position
      sound.position += output[0].length;

      // Check if sound has finished playing
      if (sound.position >= buffer.length) {
        if (sound.loop) {
          // Loop back to beginning
          sound.position = 0;
        } else {
          // Remove from playing sounds
          delete this._playing[playId];
          this.port.postMessage({
            type: 'playComplete',
            playId: parseInt(playId)
          });
        }
      }
    }

    // Return true to keep the processor alive
    return true;
  }
}

// Register the processor
registerProcessor('sound-processor', SoundProcessor);
