// Sound Worker
// This worker handles sound processing to prevent UI lag

let sounds = {};
let initialized = false;

// Handle messages from the main thread
self.onmessage = function(e) {
  const data = e.data;

  switch (data.command) {
    case 'init':
      initSounds(data.soundPaths);
      break;
    case 'play':
      playSound(data.sound);
      break;
    case 'setVolume':
      setVolume(data.volume);
      break;
    default:
      console.error('Unknown command:', data.command);
  }
};

// Initialize sounds
function initSounds(soundPaths) {
  // We'll use fetch to load the sound files
  const soundPromises = Object.keys(soundPaths).map(key => {
    return fetch(soundPaths[key])
      .then(response => response.arrayBuffer())
      .then(buffer => {
        // Store the raw audio data
        sounds[key] = buffer;
        return { key, status: 'loaded' };
      })
      .catch(error => {
        console.error(`Error loading sound ${key}:`, error);
        return { key, status: 'error', error };
      });
  });

  // Wait for all sounds to load
  Promise.all(soundPromises)
    .then(results => {
      initialized = true;
      self.postMessage({ type: 'init', status: 'complete', results });
    })
    .catch(error => {
      console.error('Error initializing sounds:', error);
      self.postMessage({ type: 'init', status: 'error', error });
    });
}

// Play a sound
function playSound(soundKey) {
  if (!initialized) {
    self.postMessage({ type: 'play', status: 'error', error: 'Sounds not initialized' });
    return;
  }

  if (!sounds[soundKey]) {
    self.postMessage({ type: 'play', status: 'error', error: `Sound ${soundKey} not found` });
    return;
  }

  // Send the sound data back to the main thread for playback
  self.postMessage({
    type: 'play',
    status: 'ready',
    sound: soundKey,
    buffer: sounds[soundKey]
  });
}

// Set volume for all sounds
function setVolume(volume) {
  // Volume control will be handled in the main thread
  self.postMessage({ type: 'setVolume', status: 'acknowledged', volume });
}

// Log that the worker is ready
self.postMessage({ type: 'status', status: 'ready' });
