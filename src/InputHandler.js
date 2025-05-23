// InputHandler.js - Handle keyboard, mouse, and touch input

import { CONFIG } from './GameConfig.js';

export class InputHandler {
  constructor() {
    this.keyState = {};
    this.isMobile = this.detectMobile();
    this.callbacks = {
      fire: null,
      bomb: null,
      pause: null,
      move: null
    };
    
    this.setupEventListeners();
  }

  // Detect if device is mobile
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 800 && window.innerHeight <= 600);
  }

  // Set up all event listeners
  setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Mobile controls
    if (this.isMobile) {
      this.setupMobileControls();
    }
  }

  // Keyboard down handler
  onKeyDown(event) {
    this.keyState[event.key] = true;

    // Handle firing
    if (event.key === ' ' && this.callbacks.fire) {
      this.callbacks.fire();
    }

    // Handle bomb activation
    if (event.key.toLowerCase() === 'b' && this.callbacks.bomb) {
      this.callbacks.bomb();
    }

    // Toggle pause
    if ((event.key === 'p' || event.key === 'Enter') && this.callbacks.pause) {
      this.callbacks.pause();
    }

    // Prevent scrolling for game keys
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'b', 'B'].includes(event.key)) {
      event.preventDefault();
    }
  }

  // Keyboard up handler
  onKeyUp(event) {
    this.keyState[event.key] = false;
  }

  // Window resize handler
  onWindowResize(camera, renderer) {
    if (camera && renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // Check if key is currently pressed
  isKeyPressed(key) {
    return !!this.keyState[key];
  }

  // Check movement input
  getMovementInput() {
    let direction = 0;
    
    if (this.isKeyPressed('ArrowLeft')) {
      direction = -1;
    } else if (this.isKeyPressed('ArrowRight')) {
      direction = 1;
    }
    
    return direction;
  }

  // Set callback functions
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Set individual callback
  setCallback(type, callback) {
    if (this.callbacks.hasOwnProperty(type)) {
      this.callbacks[type] = callback;
    }
  }

  // Setup mobile controls
  setupMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    
    if (!mobileControls) {
      console.warn('Mobile controls element not found');
      return;
    }

    // Show mobile controls
    mobileControls.style.display = 'flex';

    // Update instructions modal for mobile
    this.updateInstructionsForMobile();

    // Get control buttons
    const buttons = {
      left: document.getElementById('left-button'),
      right: document.getElementById('right-button'),
      fire: document.getElementById('fire-button'),
      bomb: document.getElementById('bomb-button')
    };

    // Set up touch events for each button
    this.setupMobileButton(buttons.left, 'ArrowRight'); // Note: reversed for tunnel perspective
    this.setupMobileButton(buttons.right, 'ArrowLeft'); // Note: reversed for tunnel perspective
    
    // Fire button
    if (buttons.fire) {
      buttons.fire.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.callbacks.fire) {
          this.callbacks.fire();
        }
      });
    }

    // Bomb button
    if (buttons.bomb) {
      buttons.bomb.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.callbacks.bomb) {
          this.callbacks.bomb();
        }
      });
    }

    // Set up swipe gestures
    this.setupSwipeGestures(mobileControls);
  }

  // Setup individual mobile button
  setupMobileButton(button, keyCode) {
    if (!button) return;

    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.keyState[keyCode] = true;
      button.classList.add('active');
    });

    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.keyState[keyCode] = false;
      button.classList.remove('active');
    });

    button.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.keyState[keyCode] = false;
      button.classList.remove('active');
    });
  }

  // Setup swipe gestures
  setupSwipeGestures(container) {
    let startX = 0;
    let startY = 0;
    let isSwipePending = false;

    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwipePending = true;
      }
    });

    container.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Prevent scrolling
    });

    container.addEventListener('touchend', (e) => {
      if (!isSwipePending) return;
      
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      
      // Check if it's a horizontal swipe (and not vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // Swipe right - move left in tunnel perspective
          this.simulateKeyPress('ArrowLeft', 200);
        } else {
          // Swipe left - move right in tunnel perspective
          this.simulateKeyPress('ArrowRight', 200);
        }
      }
      
      isSwipePending = false;
    });
  }

  // Simulate key press for specified duration
  simulateKeyPress(key, duration = 200) {
    this.keyState[key] = true;
    
    setTimeout(() => {
      this.keyState[key] = false;
    }, duration);
  }

  // Update instructions modal for mobile
  updateInstructionsForMobile() {
    const instructionsModal = document.getElementById('instructions-modal');
    if (!instructionsModal) return;

    instructionsModal.innerHTML = `
      <h2>INSTRUCTIONS</h2>
      <p>TOUCH: LEFT BUTTON MOVES RIGHT, RIGHT BUTTON MOVES LEFT</p>
      <p>SWIPE: LEFT TO MOVE RIGHT, RIGHT TO MOVE LEFT</p>
      <p>FIRE BUTTON: SHOOT | BOMB BUTTON: 💣</p>
      <p>PAUSE BUTTON: PAUSE | ROTATE BUTTON: TOGGLE ROTATION</p>
      <p>DRAG: ROTATE TUNNEL</p>
      <button id="close-instructions-button">CLOSE</button>
    `;

    // Re-add event listener for close button
    const closeButton = document.getElementById('close-instructions-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        instructionsModal.style.display = 'none';
        if (this.callbacks.pause) {
          this.callbacks.pause(); // Unpause
        }
      });
    }
  }

  // Show/hide mobile controls
  showMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.style.display = 'flex';
    }
  }

  hideMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.style.display = 'none';
    }
  }

  // Check if device is mobile
  isMobileDevice() {
    return this.isMobile;
  }

  // Clear all key states
  clearKeyStates() {
    this.keyState = {};
  }

  // Get current key state
  getKeyState() {
    return { ...this.keyState };
  }

  // Cleanup event listeners
  cleanup() {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }

  // Add mouse controls for tunnel rotation
  setupMouseControls(webMesh, saveRotationCallback) {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    document.addEventListener('mousedown', (event) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    document.addEventListener('mousemove', (event) => {
      if (!isDragging || !webMesh) return;

      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };

      // Update rotation
      webMesh.rotation.x += deltaMove.y * 0.01;
      webMesh.rotation.y += deltaMove.x * 0.01;

      previousMousePosition = { x: event.clientX, y: event.clientY };

      // Save rotation state with debouncing
      if (saveRotationCallback) {
        clearTimeout(this.saveRotationTimer);
        this.saveRotationTimer = setTimeout(() => {
          saveRotationCallback(webMesh.rotation.x, webMesh.rotation.y);
        }, 500);
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Click to toggle rotation
    document.addEventListener('click', (event) => {
      // Only toggle if not dragging and not clicking on UI elements
      if (!isDragging && !event.target.closest('button, select, input')) {
        // Toggle rotation callback could be added here
      }
    });
  }
}