// --- Imports ---
import { CONFIG, COMPUTED, INITIAL_STATE, INITIAL_POWER_UPS, INITIAL_WEB_COLOR, INITIAL_ROTATION, getLaneAngleStep, getCenterLaneIndex } from './GameConfig.js';
import { PersistenceManager } from './PersistenceManager.js';
import { AudioManager } from './AudioManager.js';
import { LeaderboardManager } from './LeaderboardManager.js';
import { UI } from './UI.js';
import { InputHandler } from './InputHandler.js';

// --- Global Variables ---
let scene, camera, renderer;
let webMesh;
let player;
const projectiles = [];
const enemies = [];
const powerUps = [];
const explosions = [];
const stars = [];
// Initialize managers
const persistenceManager = new PersistenceManager();
const audioManager = new AudioManager();
const leaderboardManager = new LeaderboardManager();
const ui = new UI();
const inputHandler = new InputHandler();

// Game state variables
let difficulty = CONFIG.DEFAULTS.DIFFICULTY;
let shipType = CONFIG.DEFAULTS.SHIP_TYPE;
let webType = CONFIG.DEFAULTS.WEB_TYPE;
let tubeWidth = CONFIG.DEFAULTS.TUBE_WIDTH;

// Web color variables
let webColorHue = INITIAL_WEB_COLOR.hue;

// Mouse tracking variables
let targetRotationX = INITIAL_ROTATION.targetX;
let targetRotationY = INITIAL_ROTATION.targetY;
let isRotationEnabled = INITIAL_ROTATION.enabled;

// Debounce timer for saving rotation state
let saveRotationTimer = null;

// Game State
let gameState = CONFIG.GAME_STATES.MENU;
let isPaused = false;
let countdownTime = CONFIG.GAME_FLOW.COUNTDOWN_TIME;
let countdownStartTime = 0;

// Sound State
let isSoundEnabled = CONFIG.DEFAULTS.SOUND_ENABLED;

// Web Configuration (dynamic values)
let NUM_LANES = CONFIG.WEB.NUM_LANES;
let LANE_ANGLE_STEP = COMPUTED.LANE_ANGLE_STEP;

// Configurable Settings
let playerLaneChangeRate = CONFIG.PLAYER.LANE_CHANGE_RATE;
let currentEnemySpeed = CONFIG.ENEMIES.SPEED;
let originalEnemySpeed = CONFIG.ENEMIES.SPEED;
let currentEnemySpawnInterval = CONFIG.ENEMIES.SPAWN_INTERVAL;
let enemiesPerLevel = CONFIG.ENEMIES.PER_LEVEL;

// Game stats (use INITIAL_STATE)
let score = INITIAL_STATE.score;
let highScore = INITIAL_STATE.highScore;
let lives = INITIAL_STATE.lives;
let level = INITIAL_STATE.level;
let enemiesKilled = INITIAL_STATE.enemiesKilled;
let enemiesRequired = INITIAL_STATE.enemiesRequired;
let bombs = INITIAL_STATE.bombs;
let shields = INITIAL_STATE.shields;
let lastBombMilestone = INITIAL_STATE.lastBombMilestone;

// Leaderboard variables are now managed by LeaderboardManager
let enemySpawnTimer = 0;
let playerCurrentLaneIndex = getCenterLaneIndex();
let lastLaneChangeFrame = 0;

// Track active power-ups with an object
let activePowerUps = { ...INITIAL_POWER_UPS };
let powerUpTimer = 0;
let lastFrameTime = 0;

// UI elements are now managed by the UI class

// --- Input Callbacks Setup ---
function setupInputCallbacks() {
    inputHandler.setCallbacks({
        fire: () => {
            if (gameState === CONFIG.GAME_STATES.PLAYING) {
                createProjectile(activePowerUps.superProjectile);
            }
        },
        bomb: () => {
            if (gameState === CONFIG.GAME_STATES.PLAYING && !isPaused) {
                activateBomb();
            }
        },
        pause: () => {
            if (gameState === CONFIG.GAME_STATES.PLAYING) {
                const instructionsModal = ui.getElement('instructionsModal');
                const isInstructionsVisible = instructionsModal && instructionsModal.style.display === 'block';

                if (!isInstructionsVisible) {
                    isPaused = !isPaused;
                    if (isPaused) {
                        ui.showPauseScreen();
                        ui.showMenu();
                    } else {
                        ui.hidePauseScreen();
                        ui.hideScreen('menu');
                        applyGameSettings();
                    }
                    ui.updateStartButtonText(gameState);
                }
            }
        }
    });
}


// --- Persistence Functions (using PersistenceManager) ---
function saveRotationState() {
    persistenceManager.saveRotationState(targetRotationX, targetRotationY, isRotationEnabled);
}

function saveHighScore() {
    persistenceManager.saveHighScore(highScore);
}

function loadHighScore() {
    highScore = persistenceManager.loadHighScore();
    updateHighScoreUI();
}

function saveSoundState() {
    persistenceManager.saveSoundState(isSoundEnabled);
}

function loadSoundState() {
    isSoundEnabled = persistenceManager.loadSoundState();

    // Initialize AudioWorklet manager's sound enabled state
    if (window.audioWorkletManager) {
        window.audioWorkletManager.setSoundEnabled(isSoundEnabled);
    }

    updateSoundToggleButton();
}

function loadRotationState() {
    const rotationState = persistenceManager.loadRotationState();
    targetRotationX = rotationState.targetRotationX;
    targetRotationY = rotationState.targetRotationY;
    isRotationEnabled = rotationState.isRotationEnabled;
}

// --- Fullscreen Toggle ---
let isFullscreen = false;

function toggleFullscreen() {
    if (!document.fullscreenElement &&
        !document.mozFullScreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {
        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
        isFullscreen = true;
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        isFullscreen = false;
    }

    updateFullscreenToggleButton();
}

function updateFullscreenToggleButton() {
    ui.updateFullscreenToggleButton(isFullscreen);

    // Legacy compatibility - keeping some direct DOM access
    const fullscreenToggleButton = document.getElementById('fullscreen-toggle');
    if (fullscreenToggleButton) {
        fullscreenToggleButton.textContent = isFullscreen ? 'ON' : 'OFF';
        if (isFullscreen) {
            fullscreenToggleButton.classList.remove('off');
        } else {
            fullscreenToggleButton.classList.add('off');
        }
    }

    // Update in-game fullscreen toggle button
    const gameFullscreenToggleButton = document.getElementById('game-fullscreen-toggle');
    if (gameFullscreenToggleButton) {
        gameFullscreenToggleButton.textContent = isFullscreen ? 'ON' : 'OFF';
        if (isFullscreen) {
            gameFullscreenToggleButton.classList.remove('off');
        } else {
            gameFullscreenToggleButton.classList.add('off');
        }
    }
}

// --- Toggle Sound ---
function toggleSound() {
    isSoundEnabled = !isSoundEnabled;

    // Update AudioWorklet manager's sound enabled state
    if (window.audioWorkletManager) {
        window.audioWorkletManager.setSoundEnabled(isSoundEnabled);
    }

    updateSoundToggleButton();
    saveSoundState();
}

// --- Update Start Button Text ---
function updateStartButtonText() {
    ui.updateStartButtonText(gameState);
}

// --- Update Sound Toggle Buttons ---
function updateSoundToggleButton() {
    ui.updateSoundToggleButton(isSoundEnabled);

    // Legacy compatibility - keeping some direct DOM access
    const soundToggleButton = document.getElementById('sound-toggle');
    if (soundToggleButton) {
        soundToggleButton.textContent = isSoundEnabled ? 'ON' : 'OFF';
        if (isSoundEnabled) {
            soundToggleButton.classList.remove('off');
        } else {
            soundToggleButton.classList.add('off');
        }
    }

    // Update in-game sound toggle button
    const gameSoundToggleButton = document.getElementById('game-sound-toggle');
    if (gameSoundToggleButton) {
        gameSoundToggleButton.textContent = isSoundEnabled ? 'ON' : 'OFF';
        if (isSoundEnabled) {
            gameSoundToggleButton.classList.remove('off');
        } else {
            gameSoundToggleButton.classList.add('off');
        }
    }
}

// --- Mobile Controls Setup ---
function setupMobileControls() {
    // Check if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 800 && window.innerHeight <= 600);

    // Get mobile controls container
    const mobileControls = document.getElementById('mobile-controls');

    // Show mobile controls if on mobile device and if the element exists
    if (isMobile && mobileControls) {
        mobileControls.style.display = 'flex';

        // Update instructions modal for mobile
        const instructionsModal = document.getElementById('instructions-modal');
        if (instructionsModal) {
            // Update the content of the instructions modal for mobile
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
            const closeInstructionsButton = document.getElementById('close-instructions-button');
            if (closeInstructionsButton) {
                closeInstructionsButton.addEventListener('click', function () {
                    instructionsModal.style.display = 'none';
                    isPaused = false;
                });
            }
        }

        // Get control buttons
        const leftButton = document.getElementById('left-button');
        const rightButton = document.getElementById('right-button');
        const fireButton = document.getElementById('fire-button');
        const bombButton = document.getElementById('bomb-button');
        const pauseButton = document.getElementById('pause-button');
        const rotateButton = document.getElementById('rotate-button');
        const pauseScreen = document.getElementById('pause-screen');
        const menuElement = document.getElementById('menu');

        // Touch event handlers for directional buttons
        if (leftButton) {
            leftButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                inputHandler.keyState['ArrowRight'] = true;
            });

            leftButton.addEventListener('touchend', function (e) {
                e.preventDefault();
                inputHandler.keyState['ArrowRight'] = false;
            });
        }

        if (rightButton) {
            rightButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                inputHandler.keyState['ArrowLeft'] = true;
            });

            rightButton.addEventListener('touchend', function (e) {
                e.preventDefault();
                inputHandler.keyState['ArrowLeft'] = false;
            });
        }

        // Fire button
        if (fireButton) {
            fireButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                inputHandler.keyState[' '] = true;
                if (gameState === 'playing') {
                    createProjectile(activePowerUps.superProjectile);
                }
            });

            fireButton.addEventListener('touchend', function (e) {
                e.preventDefault();
                inputHandler.keyState[' '] = false;
            });
        }

        // Bomb button
        if (bombButton) {
            bombButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                if (gameState === 'playing' && !isPaused) {
                    activateBomb();
                }
            });
        }

        // Pause button
        if (pauseButton && pauseScreen && menuElement) {
            pauseButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                if (gameState === 'playing') {
                    // Check if instructions modal is visible
                    const instructionsModal = document.getElementById('instructions-modal');
                    const isInstructionsVisible = instructionsModal && instructionsModal.style.display === 'block';

                    // Only toggle pause if instructions are not visible
                    if (!isInstructionsVisible) {
                        isPaused = !isPaused;
                        if (isPaused) {
                            ui.showPauseScreen();
                            ui.showMenu();
                        } else {
                            ui.hidePauseScreen();
                            ui.hideScreen('menu');
                        }
                        updateStartButtonText();

                        if (!isPaused) {
                            // Apply settings when resuming
                            applyGameSettings();
                        }
                    }
                }
            });
        }

        // Rotation button
        if (rotateButton) {
            rotateButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                // Toggle rotation enabled flag
                isRotationEnabled = !isRotationEnabled;

                // Visual feedback - change button text
                rotateButton.innerHTML = isRotationEnabled ? "ROTATE ON" : "ROTATE OFF";

                // Save rotation state to localStorage
                saveRotationState();
            });
        }

        // Variables for touch rotation and swipe detection
        let lastTouchX = 0;
        let lastTouchY = 0;
        let touchStartTime = 0;
        let lastTapTime = 0;
        let touchStartX = 0;
        let isSwiping = false;
        const SWIPE_THRESHOLD = 50; // Minimum distance for a swipe

        // Touch events for tunnel rotation and swipe detection
        if (renderer && renderer.domElement) {
            renderer.domElement.addEventListener('touchstart', function (e) {
                e.preventDefault();
                const touch = e.touches[0];
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
                touchStartX = touch.clientX; // Store initial X position for swipe detection
                touchStartTime = Date.now();
                isSwiping = false; // Reset swipe state

                // Check for double tap (toggle pause)
                const currentTime = Date.now();
                if (currentTime - lastTapTime < 300) { // 300ms between taps
                    // Only toggle pause if game is playing and instructions are not visible
                    if (gameState === 'playing') {
                        const instructionsModal = document.getElementById('instructions-modal');
                        const isInstructionsVisible = instructionsModal && instructionsModal.style.display === 'block';

                        if (!isInstructionsVisible) {
                            isPaused = !isPaused;
                            if (isPaused) {
                                ui.showPauseScreen();
                                ui.showMenu();
                            } else {
                                ui.hidePauseScreen();
                                ui.hideScreen('menu');
                            }
                            updateStartButtonText();

                            if (!isPaused) {
                                // Apply settings when resuming
                                applyGameSettings();
                            }
                        }
                    }
                    e.preventDefault(); // Prevent zoom
                }
                lastTapTime = currentTime;
            });

            renderer.domElement.addEventListener('touchmove', function (e) {
                e.preventDefault();
                const touch = e.touches[0];
                const touchX = touch.clientX;
                const touchY = touch.clientY;

                // Calculate delta movement
                const deltaX = touchX - lastTouchX;
                const deltaY = touchY - lastTouchY;

                // Check for horizontal swipe
                const swipeDistance = touchX - touchStartX;

                // If we're playing and the swipe is significant
                if (gameState === 'playing' && !isPaused && Math.abs(swipeDistance) > SWIPE_THRESHOLD && !isSwiping) {
                    isSwiping = true; // Mark that we've detected a swipe

                    // Determine swipe direction and trigger movement
                    if (swipeDistance < 0) {
                        // Swipe left - move right (inverted)
                        inputHandler.keyState['ArrowRight'] = true;
                        setTimeout(() => {
                            inputHandler.keyState['ArrowRight'] = false;
                        }, 100);
                    } else {
                        // Swipe right - move left (inverted)
                        inputHandler.keyState['ArrowLeft'] = true;
                        setTimeout(() => {
                            inputHandler.keyState['ArrowLeft'] = false;
                        }, 100);
                    }
                }

                // Handle rotation if enabled
                if (isRotationEnabled && gameState === 'playing') {
                    // Update target rotation based on touch movement
                    targetRotationY += deltaX * 0.005;
                    targetRotationX += deltaY * 0.005;

                    // Debounced save of rotation state
                    if (saveRotationTimer) {
                        clearTimeout(saveRotationTimer);
                    }
                    saveRotationTimer = setTimeout(() => {
                        saveRotationState();
                        saveRotationTimer = null;
                    }, 500);
                }

                // Update last touch position
                lastTouchX = touchX;
                lastTouchY = touchY;
            });

            renderer.domElement.addEventListener('touchend', function () {
                // Reset swipe state
                isSwiping = false;
            });
        }
    }
}

// Sound effects object using AudioWorklet
const sounds = {
    fire: null,
    explode: null,
    powerUp: null,
    bomb: null,
    initialized: false,
    soundPaths: {
        fire: 'assets/sounds/laser6quick-47339.mp3',
        explode: 'assets/sounds/explosion-8-bit-14-314686.wav',
        powerUp: 'assets/sounds/collect-points-190037.mp3',
        bomb: 'assets/sounds/blast-37988.mp3',
        baseHit: 'assets/sounds/hit-sound-effect-12445.mp3'
    },

    // Initialize all sounds
    init: async function () {
        // Check if AudioWorkletManager is available, with retry
        if (!window.audioWorkletManager) {
            console.log('AudioWorkletManager not available yet, waiting...');
            // Wait for AudioWorkletManager to be available (up to 5 seconds)
            await this.waitForAudioWorkletManager(5000);
        }

        // Try to initialize with AudioWorkletManager
        if (window.audioWorkletManager) {
            try {
                // Load all sounds
                const loadPromises = [];

                for (const [name, path] of Object.entries(this.soundPaths)) {
                    loadPromises.push(
                      window.audioWorkletManager.loadSound(name, path)
                        .catch(err => console.error(`Failed to load sound ${name}:`, err))
                    );
                }

                // Wait for all sounds to load
                await Promise.all(loadPromises);
                this.initialized = true;
            } catch (error) {
                console.error('Failed to initialize sounds:', error);
            }
        } else {
            console.error('AudioWorkletManager not available after waiting');
        }
    },

    // Helper function to wait for AudioWorkletManager to be available
    waitForAudioWorkletManager: function (timeout) {
        return new Promise(resolve => {
            const startTime = Date.now();
            const checkInterval = 100; // Check every 100ms

            const checkForManager = () => {
                if (window.audioWorkletManager) {
                    resolve(true);
                    return;
                }

                const elapsedTime = Date.now() - startTime;
                if (elapsedTime >= timeout) {
                    console.error(`Timeout waiting for AudioWorkletManager after ${timeout}ms`);
                    resolve(false);
                    return;
                }

                setTimeout(checkForManager, checkInterval);
            };

            checkForManager();
        });
    },

    // Initialize audio context after user interaction
    initializeAudio: async function () {
        if (!this.initialized) {
            // Check if AudioWorkletManager is available, with retry
            if (!window.audioWorkletManager) {
                console.log('AudioWorkletManager not available yet for initialization, waiting...');
                // Wait for AudioWorkletManager to be available (up to 5 seconds)
                await this.waitForAudioWorkletManager(5000);
            }

            if (window.audioWorkletManager) {
                try {
                    // Initialize the AudioWorklet manager
                    await window.audioWorkletManager.initialize();

                    // Load all sounds
                    await this.init();

                } catch (error) {
                    console.error('Failed to initialize audio system:', error);
                }
            } else {
                console.error('AudioWorkletManager not available after waiting');
            }
        }
    },

    // Play a sound with error handling
    play: async function (sound) {
        // If sounds are disabled, don't play anything
        if (!isSoundEnabled) {
            return;
        }

        // If not initialized, try to initialize first
        if (!this.initialized) {
            await this.initializeAudio();
            return; // Don't try to play until initialized
        }

        // Check if AudioWorkletManager is available
        if (!window.audioWorkletManager) {
            console.log('AudioWorkletManager not available for playing sound, waiting...');
            const available = await this.waitForAudioWorkletManager(2000);
            if (!available) {
                console.error('Could not play sound - AudioWorkletManager not available');
                return;
            }
        }

        if (window.audioWorkletManager && this.soundPaths[sound]) {
            try {
                // Resume audio context if needed
                const resumed = await window.audioWorkletManager.resumeAudioContext();

                if (!resumed) {
                    console.log('Audio context could not be resumed, not playing sound');
                    return;
                }

                // Verify the context is running
                if (window.audioWorkletManager.audioContext.state !== 'running') {
                    console.warn('Audio context is not running after resume, state:',
                      window.audioWorkletManager.audioContext.state);
                }

                // Play the sound
                const result = window.audioWorkletManager.playSound(sound, {volume: 0.5});
            } catch (e) {
                console.error("Exception when trying to play sound:", e);
                this.initialized = false;
            }
        } else {
            console.warn('Cannot play sound, either AudioWorkletManager is not available or sound path is not defined');
            console.log('AudioWorkletManager available:', !!window.audioWorkletManager);
            console.log('Sound path available:', !!this.soundPaths[sound]);
        }
    }
};

// --- Initialization Function ---
async function init() {
    // Load persistent state
    loadHighScore();
    loadRotationState();
    loadSoundState();

    // Load leaderboard (async)
    await leaderboardManager.loadLeaderboard();

    // Initialize audio manager
    await audioManager.initialize();

    // Initialize sounds
    sounds.init();

    // Setup input callbacks
    setupInputCallbacks();

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera setup
    camera = new THREE.PerspectiveCamera(
      90,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, .6, CONFIG.WEB.DEPTH / 2 + 15);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add lighting to enhance 3D effects
    addLighting();

    // Create background stars
    createStars();

    // Create the initial web - it will be recreated with startGame
    createWeb(webType);

    // Create player
    createPlayer();
    player.visible = false;

    // Initial state: show menu, hide game UI/game over
    ui.hideScreen('ui');

    const levelIndicatorElement = document.getElementById('level-indicator');
    if (levelIndicatorElement) levelIndicatorElement.style.display = 'none';

    ui.hideScreen('gameOverScreen');
    // We don't need to hide the level complete screen anymore as it's not shown
    // if (levelCompleteScreen) levelCompleteScreen.style.display = 'none';
    ui.showScreen('menu');

    const instructionsButton = document.getElementById('instructions-button');
    const instructionsModal = document.getElementById('instructions-modal');
    const closeInstructionsButton = document.getElementById('close-instructions-button');

    // Add event listener for instructions button
    if (instructionsButton && instructionsModal && closeInstructionsButton) {
        instructionsButton.addEventListener('click', function () {
            instructionsModal.style.display = 'block';
            isPaused = true;
        });

        closeInstructionsButton.addEventListener('click', function () {
            instructionsModal.style.display = 'none';
            isPaused = false;
        });
    }

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('click', onMouseClick);

    // Button listeners
    ui.addClickListener('startButton', startGame);
    console.log('startButton listener set.')
    ui.addClickListener('restartButton', restartGame);
    ui.addClickListener('replayButton', replayGame);
    // We don't need the next level button anymore as levels continue automatically
    // if (nextLevelButton) nextLevelButton.addEventListener('click', nextLevel);

    // Ship selection listeners - works during gameplay to change ship on the fly
    ui.addChangeListener('shipSelect', function () {
        const selectedShip = ui.getSelectedValues().shipType;
        // Update the in-game selector to match
        ui.setSelectedValues({ shipType: selectedShip });
        changeShipType(selectedShip);
    });

    // In-game ship selector (if it exists)
    const gameShipSelect = ui.getElement('gameShipSelect');
    if (gameShipSelect) {
        gameShipSelect.addEventListener('change', function () {
            // Update the menu selector to match
            ui.setSelectedValues({ shipType: gameShipSelect.value });
            changeShipType(gameShipSelect.value);
        });
    }

    // Sound toggle buttons listeners
    const soundToggleButton = document.getElementById('sound-toggle');
    const gameSoundToggleButton = document.getElementById('game-sound-toggle');

    if (soundToggleButton) soundToggleButton.addEventListener('click', toggleSound);
    if (gameSoundToggleButton) gameSoundToggleButton.addEventListener('click', toggleSound);

    // Leaderboard button listeners
    ui.addClickListener('showLeaderboardButton', showLeaderboard);
    ui.addClickListener('closeLeaderboardButton', hideLeaderboard);
    ui.addClickListener('submitScore', handleScoreSubmit);


    // Start the animation loop
    lastFrameTime = performance.now();
    animate();
}

// --- Add scene lighting ---
function addLighting() {
    // Add ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x202020);
    scene.add(ambientLight);

    // Add directional light for shadows and depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 20, 10);
    scene.add(directionalLight);

    // Add point light at camera position for dynamic lighting
    const pointLight = new THREE.PointLight(0x0088ff, 0.8, 50);
    pointLight.position.copy(camera.position);
    scene.add(pointLight);
}

// --- Create Background Stars ---
function createStars() {
    // Clear any existing stars
    for (let i = stars.length - 1; i >= 0; i--) {
        scene.remove(stars[i]);
        stars.splice(i, 1);
    }

    // Create new stars
    for (let i = 0; i < CONFIG.NUM_STARS; i++) {
        // Random star size
        const size = Math.random() * 0.15 + 0.05;

        // Create star geometry and material
        const starGeometry = new THREE.SphereGeometry(size, 4, 4);

        // Random star color (mostly white/blue with occasional yellow/red)
        let starColor;
        const colorRand = Math.random();
        if (colorRand > 0.9) {
            // Yellow/gold stars (10%)
            starColor = new THREE.Color(0xffffaa);
        } else if (colorRand > 0.8) {
            // Red/orange stars (10%)
            starColor = new THREE.Color(0xffaa88);
        } else if (colorRand > 0.6) {
            // Blue stars (20%)
            starColor = new THREE.Color(0xaaddff);
        } else {
            // White/blue-white stars (60%)
            starColor = new THREE.Color(0xeeffff);
        }

        const starMaterial = new THREE.MeshBasicMaterial({
            color: starColor,
            transparent: true,
            opacity: Math.random() * 0.5 + 0.5
        });

        const star = new THREE.Mesh(starGeometry, starMaterial);

        // Random position in a large sphere around the scene
        const radius = 100 + Math.random() * 100; // Between 100-200 units from center
        const theta = Math.random() * Math.PI * 2; // Random angle around y-axis
        const phi = Math.random() * Math.PI; // Random angle from top to bottom

        star.position.x = radius * Math.sin(phi) * Math.cos(theta);
        star.position.y = radius * Math.sin(phi) * Math.sin(theta);
        star.position.z = radius * Math.cos(phi);

        // Add random movement speed for animation
        star.userData = {
            rotationSpeed: (Math.random() - 0.5) * 0.001,
            twinkleSpeed: Math.random() * 0.01 + 0.005,
            twinklePhase: Math.random() * Math.PI * 2
        };

        scene.add(star);
        stars.push(star);
    }
}

// --- Create Web Geometry based on selected type ---
function createWeb(type, customSides) {
    // Remove existing web if any
    if (webMesh) {
        scene.remove(webMesh);
    }

    let shape;
    webType = type;

    switch (type) {
        case 'pentagon':
            NUM_LANES = 5; // 5 sides
            shape = createPolygonWeb(NUM_LANES);
            break;
        case 'hexagon':
            NUM_LANES = 6; // 6 sides
            shape = createPolygonWeb(NUM_LANES);
            break;
        case 'octagon':
            NUM_LANES = 8; // 8 sides
            shape = createPolygonWeb(NUM_LANES);
            break;
        case 'random':
            // Create a random polygon between 5 and 8 sides
            NUM_LANES = Math.floor(Math.random() * 4) + 5; // 5 to 8 sides
            shape = createPolygonWeb(NUM_LANES);
            break;
        case 'custom':
            // Create a custom polygon with the specified number of sides
            NUM_LANES = customSides;
            shape = createPolygonWeb(NUM_LANES);
            break;
        case 'circle':
        default:
            // Circle-like polygon with 10 sides
            NUM_LANES = 10;
            shape = createPolygonWeb(NUM_LANES);
            break;
    }

    // Update LANE_ANGLE_STEP based on NUM_LANES
    LANE_ANGLE_STEP = (Math.PI * 2) / NUM_LANES;

    const extrudeSettings = {
        steps: 1,
        depth: CONFIG.WEB.DEPTH,
        bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -CONFIG.WEB.DEPTH / 2);

    // Create enhanced wireframe with tube-like effect
    const edges = new THREE.EdgesGeometry(geometry);

    // Create a group to hold all tube segments
    webMesh = new THREE.Group();

    // Get the positions from the edges geometry
    const positions = edges.attributes.position.array;

    // Create tube segments for each edge
    for (let i = 0; i < positions.length; i += 6) {
        // Each edge has two vertices (start and end)
        const startPoint = new THREE.Vector3(
          positions[i], positions[i + 1], positions[i + 2]
        );
        const endPoint = new THREE.Vector3(
          positions[i + 3], positions[i + 4], positions[i + 5]
        );

        // Create a path for the tube
        const path = new THREE.CatmullRomCurve3([startPoint, endPoint]);

        // Create tube geometry with radius proportional to web size and selected width
        let tubeRadiusMultiplier;
        switch (tubeWidth) {
            case 'wire':
                tubeRadiusMultiplier = 0.0005;
                break; // 0.5% of web radius
            case 'small':
                tubeRadiusMultiplier = 0.001;
                break; // 1% of web radius
            case 'medium':
                tubeRadiusMultiplier = 0.002;
                break; // 2% of web radius (default)
            case 'large':
                tubeRadiusMultiplier = 0.009;
                break; // 4% of web radius
            default:
                tubeRadiusMultiplier = 0.02; // Default to medium
        }
        const tubeRadius = CONFIG.WEB.RADIUS * tubeRadiusMultiplier;
        const tubeGeometry = new THREE.TubeGeometry(
          path,
          1,              // tubularSegments
          tubeRadius,     // radius
          8,              // radialSegments
          false           // closed
        );

        // Create material with glow effect
        // Use current color from our color-changing mechanism
        const color = new THREE.Color().setHSL(webColorHue / 360, 1, 0.5);
        const emissiveColor = new THREE.Color().setHSL(webColorHue / 360, 1, 0.3);

        const tubeMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: emissiveColor,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8,
            shininess: 30
        });

        // Create mesh and add to group
        const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        webMesh.add(tubeMesh);
    }

    // Apply saved rotation values if available, otherwise use neutral position
    if (targetRotationX !== 0 || targetRotationY !== 0) {
        webMesh.rotation.x = targetRotationX;
        webMesh.rotation.y = targetRotationY;
    } else {
        webMesh.rotation.x = 0;
        webMesh.rotation.y = 0;
    }

    scene.add(webMesh);
}

// Helper functions to create different web shapes
function createPolygonWeb(sides) {
    const shape = new THREE.Shape();
    shape.moveTo(CONFIG.WEB.RADIUS, 0);
    for (let i = 1; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        shape.lineTo(CONFIG.WEB.RADIUS * Math.cos(angle), CONFIG.WEB.RADIUS * Math.sin(angle));
    }
    return shape;
}

// --- Create Player with enhanced visuals ---
function createPlayer() {
    // Remove existing player if any
    if (player) {
        scene.remove(player);
        // Proper disposal (optional for this example, but good practice)
        player.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    player = new THREE.Group();

    // Common material options
    const materialOptions = {
        shininess: 10, // Low shininess for a less glossy, more plastic/painted look
        flatShading: true // Crucial for the retro, low-poly aesthetic
    };

    // Create ship based on selected type
    switch (shipType) {
        case 'classic':
            createClassicShip(materialOptions);
            break;
        case 'stealth':
            createStealthShip(materialOptions);
            break;
        case 'destroyer':
            createDestroyerShip(materialOptions);
            break;
        case 'racer':
            createRacerShip(materialOptions);
            break;
        case 'alien':
            createAlienShip(materialOptions);
            break;
        case 'crystal':
            createCrystalShip(materialOptions);
            break;
        default:
            createClassicShip(materialOptions);
    }

    // Add player to scene
    scene.add(player);
}

// --- Classic Ship Design ---
function createClassicShip() {
    // Remove existing player if any
    if (player) {
        scene.remove(player);
        player.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    player = new THREE.Group();
    player.castShadow = true; // Player group casts shadow
    player.receiveShadow = true; // Player group can receive shadow


    // --- PBR Materials (Contrast Adjustments) ---
    const primaryMetalColor = 0xa8b8c5; // Slightly lighter primary metal
    const secondaryMetalColor = 0x55606A;
    const accentEmissiveColor = 0x00d0ff; // Brighter emissive blue
    const engineGlowColor = 0xffb820;   // Brighter engine glow
    const cockpitGlassColor = 0x152545;
    const panelLineColor = 0x181d22;
    const decalColor = 0xffdd33;     // Brighter decal

    const mainMetalMaterial = new THREE.MeshStandardMaterial({
        color: primaryMetalColor, metalness: 0.05, roughness: 0.30, // Slightly more reflective/less rough
        envMapIntensity: 1.0 // Maximize environment reflection for contrast
    });
    const darkMetalMaterial = new THREE.MeshStandardMaterial({
        color: secondaryMetalColor, metalness: 0.05, roughness: 0.50,
        envMapIntensity: 0.9
    });
    const accentEmissiveMaterial = new THREE.MeshStandardMaterial({
        color: accentEmissiveColor, emissive: accentEmissiveColor, emissiveIntensity: 3.5, // Significantly brighter
        metalness: 0.2, roughness: 0.4,
    });
    const cockpitGlassMaterial = new THREE.MeshStandardMaterial({
        color: cockpitGlassColor, metalness: 0.1, roughness: 0.05, transparent: true, // More reflective glass
        opacity: 0.20, emissive: 0x336699, emissiveIntensity: 0.8 // Brighter internal glow
    });
    const engineGlowMaterial = new THREE.MeshStandardMaterial({
        color: engineGlowColor, emissive: engineGlowColor, emissiveIntensity: 3.5, // Much brighter
        metalness: 0.0, roughness: 0.8,
    });
    const engineInternalMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a, metalness: 0.9, roughness: 0.6 // Slightly lighter internals
    });
    const panelLineMaterial = new THREE.MeshStandardMaterial({
        color: panelLineColor, metalness: 0.4, roughness: 0.8 // Less reflective to stay dark
    });
    const decalMaterial = new THREE.MeshStandardMaterial({
        color: decalColor, metalness: 0.3, roughness: 0.5, emissive: decalColor, emissiveIntensity: 0.4 // Brighter decal
    });
    const navLightRedMat = new THREE.MeshStandardMaterial({
        emissive: 0xff0000,
        emissiveIntensity: 5.0,
        color: 0xff0000
    }); // Brighter nav lights
    const navLightGreenMat = new THREE.MeshStandardMaterial({
        emissive: 0x00ff00,
        emissiveIntensity: 5.0,
        color: 0x00ff00
    });


    // --- Main Fuselage ---
    const fuselageRadius = 0.45;
    const fuselageLength = 2.2;

    const fuselageCylinderGeo = new THREE.CylinderGeometry(fuselageRadius, fuselageRadius * 0.75, fuselageLength, 32, 4);
    const fuselageCylinder = new THREE.Mesh(fuselageCylinderGeo, mainMetalMaterial);
    fuselageCylinder.rotation.x = Math.PI / 2;
    fuselageCylinder.castShadow = true;
    fuselageCylinder.receiveShadow = true;
    player.add(fuselageCylinder);

    const noseConeGeo = new THREE.ConeGeometry(fuselageRadius, fuselageLength * 0.3, 32);
    const noseCone = new THREE.Mesh(noseConeGeo, mainMetalMaterial);
    noseCone.position.z = -fuselageLength / 2 - (fuselageLength * 0.3) / 2 + 0.01;
    noseCone.rotation.x = Math.PI / 2;
    noseCone.castShadow = true;
    noseCone.receiveShadow = true;
    player.add(noseCone);

    const tailSectionGeo = new THREE.CylinderGeometry(fuselageRadius * 0.75, fuselageRadius * 0.6, fuselageLength * 0.2, 32);
    const tailSection = new THREE.Mesh(tailSectionGeo, darkMetalMaterial);
    tailSection.rotation.x = Math.PI / 2;
    tailSection.position.z = fuselageLength / 2 + (fuselageLength * 0.2) / 2 - 0.01;
    tailSection.castShadow = true;
    tailSection.receiveShadow = true;
    player.add(tailSection);

    // Fuselage Panel Lines
    const panelLineDepth = 0.01;
    const panelLineThickness = 0.015;
    for (let i = 0; i < 5; i++) {
        const zPos = -fuselageLength / 2 + (i * fuselageLength / 4.5) + fuselageLength * 0.05;
        const currentRadius = fuselageRadius * (1 - 0.25 * Math.abs(zPos) / (fuselageLength / 2));
        const panelLineGeo = new THREE.TorusGeometry(currentRadius + panelLineDepth, panelLineThickness, 8, 64);
        const panelLine = new THREE.Mesh(panelLineGeo, panelLineMaterial);
        panelLine.position.z = zPos;
        panelLine.rotation.x = Math.PI / 2;
        player.add(panelLine);
    }
    for (let i = 0; i < 4; i++) {
        const panelLineGeo = new THREE.BoxGeometry(panelLineThickness, panelLineThickness, fuselageLength * 0.9);
        const panelLine = new THREE.Mesh(panelLineGeo, panelLineMaterial);
        const angle = (i / 4) * Math.PI * 2;
        panelLine.position.set(
          Math.cos(angle) * (fuselageRadius * 0.9 + panelLineDepth),
          Math.sin(angle) * (fuselageRadius * 0.9 + panelLineDepth),
          0
        );
        panelLine.lookAt(0, 0, 0);
        panelLine.rotation.z += Math.PI / 2;
        player.add(panelLine);
    }

    const dorsalSpineBaseGeo = new THREE.BoxGeometry(0.2, 0.15, fuselageLength * 0.8);
    const dorsalSpineBase = new THREE.Mesh(dorsalSpineBaseGeo, darkMetalMaterial);
    dorsalSpineBase.position.set(0, fuselageRadius * 0.8, -0.1);
    dorsalSpineBase.castShadow = true;
    player.add(dorsalSpineBase);

    const dorsalAntennaMountGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.1, 8);
    const dorsalAntennaMount = new THREE.Mesh(dorsalAntennaMountGeo, mainMetalMaterial);
    dorsalAntennaMount.position.y = 0.075;
    dorsalAntennaMount.position.z = -fuselageLength * 0.2;
    dorsalSpineBase.add(dorsalAntennaMount);


    // --- Cockpit ---
    const cockpitBaseGeo = new THREE.CylinderGeometry(fuselageRadius * 0.7, fuselageRadius * 0.8, 0.2, 24);
    const cockpitBase = new THREE.Mesh(cockpitBaseGeo, darkMetalMaterial);
    cockpitBase.rotation.x = Math.PI / 2;
    cockpitBase.position.set(0, fuselageRadius * 0.3, -fuselageLength * 0.28);
    cockpitBase.castShadow = true;
    player.add(cockpitBase);

    const cockpitCanopyGeo = new THREE.SphereGeometry(fuselageRadius * 0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 1.8);
    const cockpitCanopy = new THREE.Mesh(cockpitCanopyGeo, cockpitGlassMaterial);
    cockpitCanopy.scale.set(1, 0.8, 1.3);
    cockpitCanopy.position.set(0, 0.15, 0.05);
    cockpitCanopy.rotation.x = -Math.PI / 30;
    cockpitBase.add(cockpitCanopy);

    const frameThickness = 0.03;
    const canopyFrameGeo = new THREE.TorusGeometry(fuselageRadius * 0.6 * 1.3 - frameThickness, frameThickness, 8, 32);
    const canopyFrame = new THREE.Mesh(canopyFrameGeo, darkMetalMaterial);
    canopyFrame.scale.y = (0.8 / 1.3);
    canopyFrame.rotation.x = Math.PI / 2;
    cockpitCanopy.add(canopyFrame);

    const cockpitSeatGeo = new THREE.BoxGeometry(0.2, 0.3, 0.15);
    const cockpitSeatMat = new THREE.MeshStandardMaterial({color: 0x222222, roughness: 0.8});
    const cockpitSeat = new THREE.Mesh(cockpitSeatGeo, cockpitSeatMat);
    cockpitSeat.position.set(0, -0.1, -0.1);
    cockpitCanopy.add(cockpitSeat);
    const cockpitConsoleGeo = new THREE.BoxGeometry(0.25, 0.1, 0.2);
    const cockpitConsole = new THREE.Mesh(cockpitConsoleGeo, cockpitSeatMat);
    cockpitConsole.position.set(0, -0.05, 0.15);
    cockpitConsole.rotation.x = Math.PI / 6;
    cockpitCanopy.add(cockpitConsole);


    // --- Wings ---
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.1);
    wingShape.lineTo(0.3, 0.2);
    wingShape.bezierCurveTo(1.0, 0.3, 1.5, 0.1, 2.0, 0.0);
    wingShape.lineTo(1.8, -0.2);
    wingShape.bezierCurveTo(1.2, -0.25, 0.5, -0.1, 0.1, -0.15);
    wingShape.closePath();
    const extrudeSettings = {
        steps: 1, depth: 0.07, bevelEnabled: true,
        bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2
    };
    const wingGeometry = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

    function createWing(isLeft) {
        const wingGroup = new THREE.Group();
        const wing = new THREE.Mesh(wingGeometry, mainMetalMaterial);
        wing.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
        if (!isLeft) wing.scale.x = -1;
        wing.castShadow = true;
        wing.receiveShadow = true;
        wingGroup.add(wing);

        const aileronWidth = 0.8;
        const aileronDepth = 0.2;
        const aileronGeo = new THREE.BoxGeometry(aileronWidth, extrudeSettings.depth * 0.9, aileronDepth);
        const aileron = new THREE.Mesh(aileronGeo, darkMetalMaterial);
        aileron.position.set(isLeft ? 1.4 : -1.4, 0, -0.1);
        aileron.castShadow = true;
        wingGroup.add(aileron);

        const pylonGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.3, 12);
        const pylon = new THREE.Mesh(pylonGeo, darkMetalMaterial);
        pylon.rotation.z = Math.PI / 2;
        pylon.position.set(isLeft ? 1.9 : -1.9, 0, 0.15);
        pylon.castShadow = true;
        wingGroup.add(pylon);

        const navLightGeo = new THREE.SphereGeometry(0.035, 8, 8); // Slightly larger nav lights
        const navLight = new THREE.Mesh(navLightGeo, isLeft ? navLightRedMat : navLightGreenMat);
        navLight.position.set(0, 0, 0.15 + 0.035); // Adjusted for size
        pylon.add(navLight);

        const decalShape = new THREE.Shape();
        decalShape.moveTo(-0.2, 0);
        decalShape.lineTo(0.2, 0);
        decalShape.lineTo(0.1, 0.1);
        decalShape.lineTo(-0.1, 0.1);
        decalShape.closePath();
        const decalExtrudeSettings = {depth: 0.005, bevelEnabled: false};
        const decalGeo = new THREE.ExtrudeGeometry(decalShape, decalExtrudeSettings);
        const wingDecal = new THREE.Mesh(decalGeo, decalMaterial);
        wingDecal.position.set(isLeft ? 0.8 : -0.8, extrudeSettings.depth / 2 + 0.003, 0.05);
        wingDecal.rotation.x = -Math.PI / 2;
        wingGroup.add(wingDecal);

        wingGroup.position.set(isLeft ? -fuselageRadius * 0.6 : fuselageRadius * 0.6, 0, -fuselageLength * 0.05);
        wingGroup.rotation.z = isLeft ? Math.PI / 20 : -Math.PI / 20;
        return wingGroup;
    }

    player.add(createWing(true));
    player.add(createWing(false));


    // --- Engines ---
    function createEngine(offsetX, offsetY, offsetZ) {
        const engineGroup = new THREE.Group();
        const nacelleGeo = new THREE.CylinderGeometry(0.3, 0.25, 1.0, 24);
        const nacelle = new THREE.Mesh(nacelleGeo, darkMetalMaterial);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        nacelle.receiveShadow = true;
        engineGroup.add(nacelle);

        const intakeShape = new THREE.Shape();
        intakeShape.moveTo(0.3, 0.1);
        intakeShape.absarc(0, 0, 0.3, Math.PI * 0.1, Math.PI * -0.1, true);
        intakeShape.lineTo(0.25, -0.05);
        intakeShape.absarc(0, 0, 0.25, Math.PI * -0.08, Math.PI * 0.08, false);
        const intakeExtrudeSettings = {depth: 0.15, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01};
        const intakeGeo = new THREE.ExtrudeGeometry(intakeShape, intakeExtrudeSettings);
        const intake = new THREE.Mesh(intakeGeo, mainMetalMaterial);
        intake.position.z = -0.5 - 0.075;
        intake.rotation.y = Math.PI / 2;
        intake.castShadow = true;
        engineGroup.add(intake);

        const nozzleBaseGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.2, 24);
        const nozzleBase = new THREE.Mesh(nozzleBaseGeo, engineInternalMaterial);
        nozzleBase.rotation.x = Math.PI / 2;
        nozzleBase.position.z = 0.5;
        nozzleBase.castShadow = true;
        engineGroup.add(nozzleBase);

        for (let i = 0; i < 6; i++) {
            const petalGeo = new THREE.BoxGeometry(0.03, 0.15, 0.2);
            const petal = new THREE.Mesh(petalGeo, darkMetalMaterial);
            const angle = (i / 6) * Math.PI * 2;
            petal.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0.05);
            petal.lookAt(0, 0, 0.05);
            petal.rotation.z += Math.PI / 2;
            nozzleBase.add(petal);
        }
        const glowCoreGeo = new THREE.SphereGeometry(0.16, 16, 8); // Slightly larger glow
        const glowCore = new THREE.Mesh(glowCoreGeo, engineGlowMaterial);
        glowCore.position.z = 0.05;
        nozzleBase.add(glowCore);
        engineGroup.userData.glowCore = glowCore;

        const outerGlowGeo = new THREE.SphereGeometry(0.30, 16, 8); // Slightly larger outer glow
        const outerGlowMat = new THREE.MeshBasicMaterial({
            color: engineGlowColor,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending
        }); // Slightly more opaque
        const outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
        outerGlow.position.z = 0.1;
        nozzleBase.add(outerGlow);
        engineGroup.userData.outerGlow = outerGlow;

        const pipeGeo = new THREE.TorusGeometry(0.28, 0.015, 8, 32, Math.PI);
        const pipe1 = new THREE.Mesh(pipeGeo, darkMetalMaterial);
        pipe1.rotation.x = Math.PI / 2;
        pipe1.rotation.z = Math.PI / 4;
        pipe1.position.z = -0.2;
        engineGroup.add(pipe1);
        const heatSinkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.4);
        for (let i = 0; i < 3; i++) {
            const heatSink = new THREE.Mesh(heatSinkGeo, mainMetalMaterial);
            heatSink.position.set((i - 1) * 0.07, 0.28, 0);
            heatSink.castShadow = true;
            engineGroup.add(heatSink);
        }
        engineGroup.position.set(offsetX, offsetY, offsetZ);
        return engineGroup;
    }

    player.add(createEngine(-fuselageRadius * 1.4, -fuselageRadius * 0.2, fuselageLength * 0.3));
    player.add(createEngine(fuselageRadius * 1.4, -fuselageRadius * 0.2, fuselageLength * 0.3));


    // --- Ventral Area & Radiators ---
    const ventralPlateGeo = new THREE.BoxGeometry(fuselageRadius * 1.2, 0.05, fuselageLength * 0.5);
    const ventralPlate = new THREE.Mesh(ventralPlateGeo, darkMetalMaterial);
    ventralPlate.position.set(0, -fuselageRadius - 0.025, 0);
    ventralPlate.castShadow = true;
    ventralPlate.receiveShadow = true;
    player.add(ventralPlate);

    const radiatorPanelGeo = new THREE.BoxGeometry(0.2, 0.03, 0.6);
    for (let i = 0; i < 2; i++) {
        const radiator = new THREE.Mesh(radiatorPanelGeo, mainMetalMaterial);
        radiator.position.set((i === 0 ? -1 : 1) * (fuselageRadius * 0.3), -0.04, 0.1);
        radiator.castShadow = true;
        ventralPlate.add(radiator);

        for (let j = 0; j < 5; j++) {
            const grillLineGeo = new THREE.BoxGeometry(0.18, 0.005, 0.01);
            const grillLine = new THREE.Mesh(grillLineGeo, panelLineMaterial);
            grillLine.position.set(0, 0.016, (j - 2) * 0.1);
            radiator.add(grillLine);
        }
    }

    // --- Additional Emissive Details / Small Sensors ---
    const sensorBumpGeo = new THREE.SphereGeometry(0.03, 12, 8); // Slightly larger sensors
    const positions = [
        {x: 0, y: fuselageRadius * 0.9, z: -fuselageLength * 0.45},
        {x: fuselageRadius * 0.5, y: 0, z: -fuselageLength * 0.3},
        {x: -fuselageRadius * 0.5, y: 0, z: -fuselageLength * 0.3}
    ];
    positions.forEach(pos => {
        const sensor = new THREE.Mesh(sensorBumpGeo, accentEmissiveMaterial); // Use brighter emissive
        sensor.position.set(pos.x, pos.y, pos.z);
        player.add(sensor);
    });

    // player.rotation.y = Math.PI; // Optional: Face away from default camera
    scene.add(player);
}

// --- Stealth Ship Design ---
function createStealthShip(materialOptions) {
    const bodyMat = new THREE.MeshPhongMaterial({
        color: 0x1A1A2A, ...materialOptions,
        emissive: 0x330066,
        emissiveIntensity: 0.4,
        shininess: 50
    });
    const wingMat = new THREE.MeshPhongMaterial({color: 0x101020, ...materialOptions});
    const cockpitMat = new THREE.MeshPhongMaterial({
        color: 0x7F00FF,
        emissive: 0x5000A0,
        emissiveIntensity: 0.8, ...materialOptions
    });

    // Main body - angular wedge
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0, 0.8); // Tip
    bodyShape.lineTo(-0.4, -0.5);
    bodyShape.lineTo(-0.2, -0.7); // Notch
    bodyShape.lineTo(0.2, -0.7);  // Notch
    bodyShape.lineTo(0.4, -0.5);
    bodyShape.closePath();
    const extrudeSettings = {depth: 0.15, bevelEnabled: false};
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    const mainBody = new THREE.Mesh(bodyGeo, bodyMat);
    mainBody.rotation.x = Math.PI / 2;
    player.add(mainBody);

    // Swept wings
    const wingGeo = new THREE.BoxGeometry(1.8, 0.08, 0.4); // Long, thin
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-0.7, 0, -0.1);
    leftWing.rotation.y = Math.PI / 6; // Swept back
    player.add(leftWing);
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0.7, 0, -0.1);
    rightWing.rotation.y = -Math.PI / 6; // Swept back
    player.add(rightWing);

    // Cockpit - small slit
    const cockpitGeo = new THREE.BoxGeometry(0.2, 0.05, 0.3);
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.12, 0.3);
    player.add(cockpit);

    // Engine glow (subtle)
    const engineGlowGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);
    const engineGlowMat = new THREE.MeshBasicMaterial({color: 0xAA00FF, transparent: true, opacity: 0.6});
    const engineGlow1 = new THREE.Mesh(engineGlowGeo, engineGlowMat);
    engineGlow1.position.set(-0.15, 0, -0.65);
    engineGlow1.rotation.x = Math.PI / 2;
    player.add(engineGlow1);
    const engineGlow2 = new THREE.Mesh(engineGlowGeo, engineGlowMat);
    engineGlow2.position.set(0.15, 0, -0.65);
    engineGlow2.rotation.x = Math.PI / 2;
    player.add(engineGlow2);
}

// --- Destroyer Ship Design ---
function createDestroyerShip(materialOptions) {
    const bodyMat = new THREE.MeshPhongMaterial({color: 0x404050, ...materialOptions, metalness: 0.6, roughness: 0.4});
    const armorMat = new THREE.MeshPhongMaterial({color: 0x303040, ...materialOptions});
    const weaponMat = new THREE.MeshPhongMaterial({
        color: 0xFF4500,
        emissive: 0xDD3000,
        emissiveIntensity: 0.5, ...materialOptions
    }); // Orange-Red

    // Main Hull - Boxy
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.5, 1.8);
    const mainBody = new THREE.Mesh(bodyGeo, bodyMat);
    player.add(mainBody);

    // Side Armor/Weapon Pods
    const sidePodGeo = new THREE.BoxGeometry(0.4, 0.6, 1.0);
    const leftPod = new THREE.Mesh(sidePodGeo, armorMat);
    leftPod.position.set(-0.7, 0, 0.2);
    player.add(leftPod);
    const rightPod = new THREE.Mesh(sidePodGeo, armorMat);
    rightPod.position.set(0.7, 0, 0.2);
    player.add(rightPod);

    // Cannons
    const cannonGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const cannon1 = new THREE.Mesh(cannonGeo, weaponMat);
    cannon1.position.set(-0.7, 0.1, 0.8); // On left pod, forward
    cannon1.rotation.x = Math.PI / 2;
    player.add(cannon1);
    const cannon2 = new THREE.Mesh(cannonGeo, weaponMat);
    cannon2.position.set(0.7, 0.1, 0.8);  // On right pod, forward
    cannon2.rotation.x = Math.PI / 2;
    player.add(cannon2);

    // Bridge
    const bridgeGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
    const bridge = new THREE.Mesh(bridgeGeo, bodyMat); // Use body material
    bridge.position.set(0, 0.35, -0.2); // On top, slightly back
    player.add(bridge);

    // Engines (large, blocky)
    const engineGeo = new THREE.BoxGeometry(0.3, 0.3, 0.4);
    const engineMat = new THREE.MeshPhongMaterial({color: 0xFF8C00, emissive: 0xFF4500, emissiveIntensity: 0.7});
    const engine1 = new THREE.Mesh(engineGeo, engineMat);
    engine1.position.set(-0.3, -0.1, -1.0);
    player.add(engine1);
    const engine2 = new THREE.Mesh(engineGeo, engineMat);
    engine2.position.set(0.3, -0.1, -1.0);
    player.add(engine2);
}

// --- Racer Ship Design ---
function createRacerShip() {
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x0077FF, // Bright Blue
        metalness: 0.6,
        roughness: 0.2, // Shiny
        flatShading: false // Smooth for racer
    });
    const accentMat = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Gold/Yellow
        metalness: 0.8,
        roughness: 0.3,
        flatShading: false
    });
    const cockpitMat = new THREE.MeshStandardMaterial({
        color: 0x101020, // Dark tinted glass
        metalness: 0.1,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7,
        flatShading: false
    });
    const engineGlowMat = new THREE.MeshStandardMaterial({
        color: 0xFF8C00, // Bright Orange
        emissive: 0xFF8C00,
        emissiveIntensity: 3,
        flatShading: true // Can be faceted for effect
    });

    // Main Fuselage (long and sleek)
    const fuselageGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.5, 16); // Narrow front, wider back, long
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
    fuselage.rotation.x = Math.PI / 2;
    player.add(fuselage);

    // Cockpit (bubble canopy)
    const cockpitGeo = new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); // Half sphere
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.15, 0.6); // Forward on fuselage
    cockpit.scale.z = 1.5; // Stretch it back
    player.add(cockpit);

    // Side Intakes / Wings
    const intakeShape = new THREE.Shape();
    intakeShape.moveTo(0, 0);
    intakeShape.lineTo(0.4, 0.1); // Angled forward
    intakeShape.lineTo(0.3, 0.3);
    intakeShape.lineTo(-0.2, 0.2);
    intakeShape.closePath();
    const extrudeSettings = {depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.01, bevelSegments: 1};
    const intakeGeo = new THREE.ExtrudeGeometry(intakeShape, extrudeSettings);

    const leftIntake = new THREE.Mesh(intakeGeo, accentMat);
    leftIntake.position.set(-0.2, 0, 0.2); // Side of fuselage
    leftIntake.rotation.y = -Math.PI / 12; // Slight outward angle
    leftIntake.rotation.z = -Math.PI / 18; // Slight downward angle
    player.add(leftIntake);

    const rightIntake = new THREE.Mesh(intakeGeo, accentMat);
    rightIntake.position.set(0.2, 0, 0.2);
    rightIntake.rotation.y = Math.PI / 12;
    rightIntake.rotation.z = Math.PI / 18; // Mirrored angle
    rightIntake.scale.x = -1; // Mirror geometry
    player.add(rightIntake);


    // Tail Fins
    const tailFinGeo = new THREE.BoxGeometry(0.05, 0.4, 0.6); // Thin, tall, long
    const topFin = new THREE.Mesh(tailFinGeo, accentMat);
    topFin.position.set(0, 0.3, -0.8); // On top, rear
    player.add(topFin);

    const bottomFin = new THREE.Mesh(tailFinGeo, accentMat);
    bottomFin.scale.set(0.8, 0.8, 0.8); // Slightly smaller
    bottomFin.position.set(0, -0.25, -0.7);
    player.add(bottomFin);


    // Engine Nozzles (prominent)
    const nozzleGeo = new THREE.CylinderGeometry(0.15, 0.1, 0.3, 12);
    const leftNozzle = new THREE.Mesh(nozzleGeo, bodyMat);
    leftNozzle.position.set(-0.15, 0, -1.2); // Back of fuselage
    leftNozzle.rotation.x = Math.PI / 2;
    player.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(nozzleGeo, bodyMat);
    rightNozzle.position.set(0.15, 0, -1.2);
    rightNozzle.rotation.x = Math.PI / 2;
    player.add(rightNozzle);

    // Engine Glow
    const engineGlowCoreGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const leftEngineGlow = new THREE.Mesh(engineGlowCoreGeo, engineGlowMat);
    leftEngineGlow.position.set(-0.15, 0, -1.3); // Inside nozzle
    player.add(leftEngineGlow);
    const rightEngineGlow = new THREE.Mesh(engineGlowCoreGeo, engineGlowMat);
    rightEngineGlow.position.set(0.15, 0, -1.3);
    player.add(rightEngineGlow);
}

// --- Alien Ship Design ---
function createAlienShip() {
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x33AA33, // Organic Green
        metalness: 0.2,
        roughness: 0.7,
        emissive: 0x115511,
        emissiveIntensity: 0.5,
        flatShading: false // More organic, less faceted
    });
    const accentMat = new THREE.MeshStandardMaterial({
        color: 0xAA33AA, // Pulsing Purple
        metalness: 0.1,
        roughness: 0.5,
        emissive: 0x551155,
        emissiveIntensity: 1.5,
        flatShading: false
    });
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xFFFF00, // Glowing Yellow
        emissive: 0xFFFF00,
        emissiveIntensity: 2,
        flatShading: true
    });

    // Main Body (Saucer-like, slightly irregular)
    const bodyGeo = new THREE.SphereGeometry(0.6, 16, 12);
    bodyGeo.scale(1, 0.4, 0.9); // Flatten and slightly stretch
    const mainBody = new THREE.Mesh(bodyGeo, bodyMat);
    player.add(mainBody);

    // Central "Eye" or Dome
    const eyeGeo = new THREE.SphereGeometry(0.2, 12, 8);
    const centralEye = new THREE.Mesh(eyeGeo, eyeMat);
    centralEye.position.set(0, 0.15, 0.1); // Slightly raised on top
    player.add(centralEye);

    // Tentacle-like Appendages
    const tentacleCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.1, -0.1, 0.2),
        new THREE.Vector3(-0.1, -0.2, 0.4),
        new THREE.Vector3(0.05, -0.1, 0.6)
    ]);
    const tentacleGeo = new THREE.TubeGeometry(tentacleCurve, 8, 0.05, 6, false); // Thinner tentacles

    for (let i = 0; i < 5; i++) { // 5 tentacles
        const tentacle = new THREE.Mesh(tentacleGeo, accentMat);
        const angle = (i / 5) * Math.PI * 2 + (Math.PI / 5); // Offset start
        const radius = 0.45;
        tentacle.position.set(Math.cos(angle) * radius, -0.1, Math.sin(angle) * radius);
        tentacle.rotation.y = -angle + Math.PI / 2;
        tentacle.rotation.x = Math.random() * 0.2 - 0.1; // Slight random pitch
        player.add(tentacle);
    }

    // Underside Pulsing Orbs
    const orbGeo = new THREE.SphereGeometry(0.08, 8, 6);
    for (let i = 0; i < 6; i++) {
        const orb = new THREE.Mesh(orbGeo, accentMat);
        const angle = (i / 6) * Math.PI * 2;
        const radius = 0.35;
        orb.position.set(Math.cos(angle) * radius, -0.15, Math.sin(angle) * radius * 0.8); // Slightly elliptical placement
        // Add to player, will make them pulse in update loop if desired
        player.add(orb);
        // Example: player.userData.pulsingOrbs = player.userData.pulsingOrbs || []; player.userData.pulsingOrbs.push(orb);
    }
    player.rotation.y = Math.PI; // Face forward
}

// --- Crystal Ship Design ---
function createCrystalShip() {
    const crystalBodyMat = new THREE.MeshPhongMaterial({ // Phong for sharp highlights
        color: 0x87CEFA, // Light Sky Blue
        specular: 0xFFFFFF,
        shininess: 80,
        transparent: true,
        opacity: 0.75,
        flatShading: true,
        // side: THREE.DoubleSide // If some crystals are thin
    });
    const crystalCoreMat = new THREE.MeshPhongMaterial({
        color: 0xFFC0CB, // Pink
        emissive: 0xFF69B4, // Hot Pink emissive
        emissiveIntensity: 1.5,
        shininess: 50,
        transparent: true,
        opacity: 0.85,
        flatShading: true
    });
    const crystalAccentMat = new THREE.MeshPhongMaterial({
        color: 0xE0FFFF, // Light Cyan
        specular: 0xFFFFFF,
        shininess: 90,
        transparent: true,
        opacity: 0.7,
        flatShading: true
    });


    // Central Core Crystal
    const coreGeo = new THREE.OctahedronGeometry(0.3, 0); // Simple octahedron for core
    const coreCrystal = new THREE.Mesh(coreGeo, crystalCoreMat);
    coreCrystal.position.y = 0.1;
    player.add(coreCrystal);

    // Main Crystalline Structures (larger shards around core)
    const numMainShards = 5;
    for (let i = 0; i < numMainShards; i++) {
        const shardHeight = Math.random() * 0.5 + 0.4; // 0.4 to 0.9
        const shardRadius = Math.random() * 0.15 + 0.1; // 0.1 to 0.25
        const shardGeo = new THREE.ConeGeometry(shardRadius, shardHeight, Math.floor(Math.random() * 3) + 4, 1); // 4-6 sides, 1 height segment for sharpness

        const shard = new THREE.Mesh(shardGeo, crystalBodyMat);

        const angle = (i / numMainShards) * Math.PI * 2;
        const radius = 0.35;
        shard.position.set(
          Math.cos(angle) * radius,
          0.1, // Base of shards around core's y
          Math.sin(angle) * radius
        );
        // Point shards outwards and slightly upwards/downwards
        shard.lookAt(new THREE.Vector3(Math.cos(angle) * radius * 2, Math.random() * 0.4 - 0.2, Math.sin(angle) * radius * 2));
        shard.rotation.x += Math.PI / 2; // Correct cone orientation after lookAt

        player.add(shard);
    }

    // Smaller Accent Crystals
    const numAccentShards = 8;
    for (let i = 0; i < numAccentShards; i++) {
        const shardSize = Math.random() * 0.15 + 0.05; // 0.05 to 0.2
        // Use Tetrahedron for very sharp small crystals
        const shardGeo = new THREE.TetrahedronGeometry(shardSize, 0);
        const shard = new THREE.Mesh(shardGeo, crystalAccentMat);

        // Scatter them around the main cluster
        shard.position.set(
          (Math.random() - 0.5), // Wider spread
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5)
        );
        shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        player.add(shard);
    }
    player.scale.set(0.9, 0.9, 0.9); // Slightly smaller overall for crystal ship
}

// --- Animate Player Ship ---
function animatePlayerShip(deltaTime) {
    if (!player) return;

    // Initialize animation properties if not already set
    if (!player.userData.animationProps) {
        player.userData.animationProps = {
            bobPhase: Math.random() * Math.PI * 2, // Random starting phase
            rotationPhase: Math.random() * Math.PI * 2,
            pulsePhase: Math.random() * Math.PI * 2,
            tentaclePhases: [] // For alien ship tentacles
        };

        // If it's an alien ship, initialize tentacle phases
        if (shipType === 'alien') {
            // Find tentacles in the player's children
            player.children.forEach(child => {
                // Tentacles are typically tube geometries
                if (child.geometry && child.geometry.type === 'TubeGeometry') {
                    player.userData.animationProps.tentaclePhases.push({
                        object: child,
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.02 + Math.random() * 0.03 // Random speed
                    });
                }
            });
        }

        // If it's a crystal ship, find all crystal shards
        if (shipType === 'crystal') {
            player.userData.crystalShards = [];
            player.children.forEach(child => {
                // Crystal shards are typically cone or tetrahedron geometries
                if (child.geometry &&
                  (child.geometry.type === 'ConeGeometry' ||
                    child.geometry.type === 'TetrahedronGeometry')) {
                    player.userData.crystalShards.push({
                        object: child,
                        originalScale: child.scale.clone(),
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.02 + Math.random() * 0.03 // Random speed
                    });
                }
            });
        }
    }

    const props = player.userData.animationProps;

    // Common animation: gentle bobbing motion
    const bobAmount = 0.03;
    const bobSpeed = 0.001 * deltaTime;
    props.bobPhase += bobSpeed;
    const bobOffset = Math.sin(props.bobPhase) * bobAmount;

    // Store original position
    const originalY = player.position.y;

    // Apply bob effect
    player.position.y += bobOffset;

    // Ship-specific animations
    switch (shipType) {
        case 'alien':
            // Animate tentacles
            if (props.tentaclePhases && props.tentaclePhases.length > 0) {
                props.tentaclePhases.forEach(tentacle => {
                    tentacle.phase += tentacle.speed * (deltaTime / 16);
                    const rotationAmount = Math.sin(tentacle.phase) * 0.2;
                    tentacle.object.rotation.x = rotationAmount;
                    tentacle.object.rotation.z = rotationAmount * 0.5;
                });
            }

            // Pulse the central eye
            player.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    if (child.material.color.r > 0.9 && child.material.color.g > 0.9) { // Yellow eye
                        const pulseIntensity = 1.5 + Math.sin(props.pulsePhase) * 0.5;
                        child.material.emissiveIntensity = pulseIntensity;
                    }
                }
            });
            props.pulsePhase += 0.03 * (deltaTime / 16);
            break;

        case 'crystal':
            // Animate crystal shards - subtle rotation and pulsing
            if (player.userData.crystalShards) {
                player.userData.crystalShards.forEach(shard => {
                    shard.phase += shard.speed * (deltaTime / 16);

                    // Subtle rotation
                    shard.object.rotation.x += 0.001 * deltaTime;
                    shard.object.rotation.y += 0.0015 * deltaTime;

                    // Subtle pulsing scale
                    const pulseScale = 1 + Math.sin(shard.phase) * 0.1;
                    shard.object.scale.set(
                      shard.originalScale.x * pulseScale,
                      shard.originalScale.y * pulseScale,
                      shard.originalScale.z * pulseScale
                    );
                });
            }

            // Pulse the core crystal
            player.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    if (child.material.color.r > 0.9 && child.material.color.g < 0.3) { // Pink core
                        const pulseIntensity = 1.5 + Math.sin(props.pulsePhase) * 0.5;
                        child.material.emissiveIntensity = pulseIntensity;
                    }
                }
            });
            props.pulsePhase += 0.02 * (deltaTime / 16);
            break;

        case 'classic':
        case 'stealth':
        case 'destroyer':
        case 'racer':
            // For other ships, animate engine glow and any emissive parts
            player.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    // Check if it's an engine or emissive part (based on color)
                    const isEngine = child.material.emissive.r > 0.7 && child.material.emissive.g > 0.3 && child.material.emissive.b < 0.3;
                    const isEmissive = child.material.emissiveIntensity > 0;

                    if (isEngine || isEmissive) {
                        const pulseIntensity = child.material.emissiveIntensity * 0.7 +
                          (Math.sin(props.pulsePhase) * 0.3 + 0.3) * child.material.emissiveIntensity;
                        child.material.emissiveIntensity = pulseIntensity;
                    }
                }
            });
            props.pulsePhase += 0.04 * (deltaTime / 16);
            break;
    }

    // Reset the position after applying the bob effect
    // This ensures we don't accumulate position changes
    player.position.y = originalY;
}

// --- Update Player Position ---
function updatePlayerPosition() {
    // Calculate position based on current lane and web type
    let x, y;
    let angle;

    // For circle or random polygon
    angle = playerCurrentLaneIndex * LANE_ANGLE_STEP;
    x = CONFIG.WEB.RADIUS * Math.cos(angle);
    y = CONFIG.WEB.RADIUS * Math.sin(angle);

    // Create a position vector
    const position = new THREE.Vector3(x, y, CONFIG.PLAYER.Z_POSITION);

    // Apply tunnel rotation to player position
    if (webMesh) {
        // Create a rotation matrix from the web's rotation
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(new THREE.Euler(
          webMesh.rotation.x,
          webMesh.rotation.y,
          0 // Don't apply z rotation as it's just for visual effect
        ));

        // Apply rotation to position
        position.applyMatrix4(rotationMatrix);
    }

    // Update player position
    player.position.copy(position);

    // Update player rotation to face inward and account for tunnel rotation
    player.rotation.z = angle + Math.PI / 2;

    // Apply tunnel rotation to player orientation
    if (webMesh) {
        player.rotation.x = webMesh.rotation.x;
        player.rotation.y = webMesh.rotation.y;
    } else {
        player.rotation.x = 0;
        player.rotation.y = 0;
    }
}

// --- Set Game Settings ---
function setGameSettings(speed, difficultyParam, web, width, lives) {
    // Player Speed
    switch (speed) {
        case 'slow':
            playerLaneChangeRate = 10;
            break;
        case 'normal':
            playerLaneChangeRate = 6;
            break;
        case 'fast':
            playerLaneChangeRate = 3;
            break;
        default:
            playerLaneChangeRate = 6;
    }

    // Store the difficulty in the global variable
    difficulty = difficultyParam;

    // Difficulty
    switch (difficultyParam) {
        case 'easy':
            currentEnemySpeed = 0.1;
            originalEnemySpeed = 0.1;
            currentEnemySpawnInterval = 80;
            enemiesPerLevel = 15;
            break;
        case 'medium':
            currentEnemySpeed = 0.2;
            originalEnemySpeed = 0.2;
            currentEnemySpawnInterval = 50;
            enemiesPerLevel = 20;
            break;
        case 'hard':
            currentEnemySpeed = 0.3;
            originalEnemySpeed = 0.3;
            currentEnemySpawnInterval = 30;
            enemiesPerLevel = 25;
            break;
        default:
            currentEnemySpeed = 0.08;
            originalEnemySpeed = 0.08;
            currentEnemySpawnInterval = 50;
            enemiesPerLevel = 20;
    }

    // Web Type
    webType = web;

    // Tube Width
    tubeWidth = width;

    // Lives
    // Convert to integer and ensure it's within the valid range
    const livesValue = parseInt(lives);
    if (!isNaN(livesValue) && livesValue >= 3 && livesValue <= 1000) {
        // We don't set the lives variable here, it will be set in startGame
        // This is just to validate the input
    }

}

// --- Start Game Function ---
async function startGame() {
    // If the game is paused, resume it
    if (gameState === 'playing' && isPaused) {
        isPaused = false;
        ui.hideScreen('pauseScreen');
        ui.hideScreen('menu');
        updateStartButtonText();
        return;
    }

    // Otherwise, don't start a new game if already playing or in countdown
    if (gameState === 'playing' || gameState === 'countdown') return;

    console.log('Starting game, initializing audio...');

    // Initialize audio after user interaction (non-blocking)
    sounds.initializeAudio().then(() => {
        console.log('Audio initialization completed');
    }).catch(error => {
        console.error('Audio initialization failed:', error);
    });

    // Get selected settings
    const selectedValues = ui.getSelectedValues();
    const selectedSpeed = selectedValues.speed;
    const selectedDifficulty = selectedValues.difficulty;
    const selectedWebType = selectedValues.webType;
    const selectedTubeWidth = selectedValues.tubeWidth;
    const selectedLives = selectedValues.lives;
    // Update global ship type
    shipType = selectedValues.shipType;

    // Sync the in-game ship selector with the menu selection
    const gameShipSelect = ui.getElement('gameShipSelect');
    if (gameShipSelect) {
        gameShipSelect.value = shipType;
    }

    setGameSettings(selectedValues.speed, selectedValues.difficulty, selectedValues.webType, selectedValues.tubeWidth, selectedValues.lives);

    // Always start with a pentagon (5 sides) at level 1, regardless of user selection
    createWeb('pentagon');

    // Create player with selected ship type
    createPlayer();

    // Reset game state
    score = 0;
    lives = parseInt(selectedLives);
    level = 1;
    enemiesKilled = 0;
    enemiesRequired = enemiesPerLevel;
    enemySpawnTimer = 0;
    playerCurrentLaneIndex = Math.floor(NUM_LANES / 2);
    lastLaneChangeFrame = 0;
    // Reset power-ups
    activePowerUps.rapidFire = false;
    activePowerUps.superProjectile = false;
    powerUpTimer = 0;

    // Reset leaderboard state
    leaderboardManager.resetHighScoreStatus();

    // Hide leaderboard elements
    const leaderboardContainer = ui.getElement('leaderboardContainer');
    if (leaderboardContainer) {
        leaderboardContainer.style.display = 'none';
    }
    const highScoreForm = ui.getElement('highScoreForm');
    if (highScoreForm) {
        highScoreForm.style.display = 'none';
    }
    bombs = 0; // Reset bombs to 0
    shields = 0; // Reset shields to 0
    lastBombMilestone = 0; // Reset last bomb milestone


    // Load saved rotation state or use defaults
    //loadRotationState();

    // Clear existing game objects
    clearGameObjects();

    // Update player
    updatePlayerPosition();

    // Update UI
    updateScoreUI();
    updateHighScoreUI();
    updateLivesUI();
    updateLevelUI();
    updateBombsUI();
    updateShieldsUI();

    ui.showScreen('ui');
    document.getElementById('level-indicator').style.display = 'block';
    ui.hideScreen('gameOverScreen');
    // We don't need to hide the level complete screen anymore as it's not shown
    // levelCompleteScreen.style.display = 'none';
    ui.hideScreen('menu');

    // Mobile device detection and touch controls setup
    setupMobileControls();

    // Start countdown instead of going directly to playing
    startCountdown();
}

// --- Start Countdown Function ---
function startCountdown() {
    // Set game state to countdown
    gameState = 'countdown';
    isPaused = false;
    player.visible = true;

    // Initialize countdown
    countdownTime = 3;
    countdownStartTime = performance.now();

    // Show initial countdown
    showCountdown(countdownTime);
}

// --- Show Countdown Function ---
function showCountdown(number) {
    // Create a div for the countdown
    const countdownDiv = document.createElement('div');
    countdownDiv.id = 'countdown-display';
    countdownDiv.textContent = number;
    countdownDiv.style.position = 'absolute';
    countdownDiv.style.top = '50%';
    countdownDiv.style.left = '50%';
    countdownDiv.style.transform = 'translate(-50%, -50%)';
    countdownDiv.style.color = '#00ffff';
    countdownDiv.style.textShadow = '0 0 10px #00ffff';
    countdownDiv.style.fontSize = '6em';
    countdownDiv.style.fontFamily = "Orbitron, sans-serif";
    countdownDiv.style.zIndex = '1000';
    countdownDiv.style.pointerEvents = 'none';

    // Remove any existing countdown display
    const existingCountdown = document.getElementById('countdown-display');
    if (existingCountdown) {
        document.body.removeChild(existingCountdown);
    }

    // Add to document
    document.body.appendChild(countdownDiv);

    // Animate the countdown number
    countdownDiv.style.transition = 'transform 0.5s, opacity 0.5s';
    setTimeout(() => {
        countdownDiv.style.transform = 'translate(-50%, -50%) scale(1.5)';
        countdownDiv.style.opacity = '0';
    }, 10);
}

// --- Update Countdown Function ---
function updateCountdown() {
    if (gameState !== 'countdown') return;

    const currentTime = performance.now();
    const elapsedTime = (currentTime - countdownStartTime) / 1000; // Convert to seconds
    const remainingTime = Math.ceil(3 - elapsedTime);

    // If the countdown number has changed, show the new number
    if (remainingTime !== countdownTime && remainingTime > 0) {
        countdownTime = remainingTime;
        showCountdown(countdownTime);
    }

    // When countdown reaches 0, start the game
    if (remainingTime <= 0) {
        // Remove countdown display
        const countdownDiv = document.getElementById('countdown-display');
        if (countdownDiv) {
            document.body.removeChild(countdownDiv);
        }

        // Show "GO!" message
        showMessage("GO!", 0x00ffff);

        // Start the game
        gameState = 'playing';
    }
}

// --- Reset for Next Level ---
async function nextLevel() {
    if (gameState !== 'levelcomplete') return;

    // Initialize audio after user interaction
    await sounds.initializeAudio();

    // Increase level
    level++;

    // Add 1 life for completing a level
    lives++;
    updateLivesUI();

    // Increase difficulty
    currentEnemySpeed += 0.001;
    originalEnemySpeed += 0.001; // Also update original speed for acceleration feature
    currentEnemySpawnInterval = Math.max(currentEnemySpawnInterval - 5, 20);

    // Scale number of enemies based on difficulty level and current level
    let difficultyMultiplier;
    switch (difficulty) {
        case 'easy':
            difficultyMultiplier = 1.0;
            break;
        case 'medium':
            difficultyMultiplier = 1.5;
            break;
        case 'hard':
            difficultyMultiplier = 2.0;
            break;
        default:
            difficultyMultiplier = 1.5;
    }

    // Calculate enemies required based on base amount, level, and difficulty
    enemiesRequired = Math.min(Math.floor(enemiesPerLevel + (level * 5 * difficultyMultiplier)), 100);

    // Reset level-specific variables
    enemiesKilled = 0;
    enemySpawnTimer = 0;

    // Save current rotation state before transitioning to next level
    saveRotationState();

    // Add a new side on each new level
    const sides = level + 4; // level 1: 5 sides, level 2: 6 sides, etc.

    // Create a custom web with the calculated number of sides
    createWeb('custom', sides);

    // Reset player position after new web creation
    playerCurrentLaneIndex = Math.floor(NUM_LANES / 2);
    updatePlayerPosition();

    // Clear objects from previous level
    clearGameObjects();

    // Update UI
    updateLevelUI();
    updateBombsUI();

    // We don't need to hide the level complete screen anymore as it's not shown
    // levelCompleteScreen.style.display = 'none';

    // Resume game
    gameState = 'playing';
    player.visible = true;
}

// --- Restart Game Function ---
async function restartGame() {
    // Initialize audio after user interaction
    await sounds.initializeAudio();

    gameState = 'menu';
    ui.hideScreen('gameOverScreen');
    ui.showScreen('menu');
    ui.hideScreen('ui');
    document.getElementById('level-indicator').style.display = 'none';

    player.visible = false;
    clearGameObjects();
}

// --- Replay Game Function ---
async function replayGame() {
    // Initialize audio after user interaction
    await sounds.initializeAudio();

    // Hide game over screen
    ui.hideScreen('gameOverScreen');

    // Start a new game directly
    startGame();
}

// --- Clear all game objects ---
function clearGameObjects() {
    // Remove all enemies
    enemies.forEach(enemy => scene.remove(enemy));
    enemies.length = 0;

    // Remove all projectiles
    projectiles.forEach(p => scene.remove(p));
    projectiles.length = 0;

    // Remove all power-ups
    powerUps.forEach(p => scene.remove(p));
    powerUps.length = 0;

    // Remove all explosions
    explosions.forEach(e => scene.remove(e));
    explosions.length = 0;
}

// --- Create Standard Projectile ---
function createProjectile(isSuperProjectile = false) {
    if (gameState !== 'playing' || isPaused) return;

    // Limit standard projectiles (unless a power-up is active)
    if (!isSuperProjectile && !activePowerUps.rapidFire && !activePowerUps.superProjectile && projectiles.length > CONFIG.PROJECTILES.MAX_SHOTS) return;

    const projectileGeometry = new THREE.BoxGeometry(0.3, 0.3, 2);

    // Different appearance for super projectiles
    const projectileMaterial = isSuperProjectile ?
      new THREE.MeshPhongMaterial({
          color: 0xff00ff,
          emissive: 0x880088,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8
      }) :
      new THREE.MeshPhongMaterial({
          color: 0xffff00,
          emissive: 0x888800,
          emissiveIntensity: 0.3
      });

    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);

    // Position at player
    projectile.position.copy(player.position);
    projectile.position.z -= 1.5;

    // Copy player's rotation to align with tunnel rotation
    projectile.rotation.copy(player.rotation);

    // Store projectile properties
    projectile.laneIndex = playerCurrentLaneIndex;
    projectile.isSuper = isSuperProjectile;

    // Store direction vector for movement (accounting for tunnel rotation)
    const direction = new THREE.Vector3(0, 0, -1);
    if (webMesh) {
        // Create a rotation matrix from the web's rotation
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(new THREE.Euler(
          webMesh.rotation.x,
          webMesh.rotation.y,
          0 // Don't apply z rotation as it's just for visual effect
        ));

        // Apply rotation to direction
        direction.applyMatrix4(rotationMatrix);
    }
    projectile.direction = direction.normalize();

    scene.add(projectile);
    projectiles.push(projectile);

    // Play sound
    sounds.play('fire');
}

// --- Create Enemy ---
function createEnemy(enemyType = 'regular') {
    if (gameState !== 'playing' || isPaused) return;

    let initialScale = 1.0;
    let points = 100;
    let emoji = '👾'; // Default emoji (alien monster)

    // Arrays of emojis for each enemy type
    const regularEmojis = ['👾', '🛸', '🚀'];
    const specialEmojis = ['👹', '👺', '👻', '🌞'];
    const slowEmojis = ['🐢', '🐌', '🦥'];
    const bomberEmojis = ['💣'];

    switch (enemyType) {
        case 'special':
            // Special enemy (red)
            emoji = specialEmojis[Math.floor(Math.random() * specialEmojis.length)];
            initialScale = 1.2;
            points = 200;
            break;
        case 'slow':
            // Very slow enemy (blue)
            emoji = slowEmojis[Math.floor(Math.random() * slowEmojis.length)];
            points = 150;
            break;
        case 'bomber':
            // Bomb-dropping enemy (orange)
            emoji = bomberEmojis[Math.floor(Math.random() * bomberEmojis.length)];
            points = 300;
            break;
        default:
            // Regular enemy (green)
            emoji = regularEmojis[Math.floor(Math.random() * regularEmojis.length)];
            break;
    }

    // Create a canvas to render the emoji
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.font = '100px Arial';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(emoji, 0, 0);

    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Create a sprite material with the emoji texture
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });

    // Create the sprite
    const enemy = new THREE.Sprite(material);
    enemy.scale.set(3, 3, 1);

    // Store the enemy type and points
    enemy.enemyType = enemyType;
    enemy.points = points;

    // Set random rotation speeds for the enemy
    enemy.rotationSpeedX = (Math.random() - 0.5) * 0.1;
    enemy.rotationSpeedY = (Math.random() - 0.5) * 0.1;
    enemy.rotationSpeedZ = (Math.random() - 0.5) * 0.1;

    // Random lane
    const laneIndex = Math.floor(Math.random() * NUM_LANES);

    // Position depends on web type
    let x, y;
    let angle;

    angle = laneIndex * LANE_ANGLE_STEP;
    x = CONFIG.WEB.RADIUS * Math.cos(angle);
    y = CONFIG.WEB.RADIUS * Math.sin(angle);

    // Create a position vector
    const position = new THREE.Vector3(x, y, CONFIG.ENEMIES.START_Z);

    // Apply tunnel rotation to enemy position
    if (webMesh) {
        // Create a rotation matrix from the web's rotation
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(new THREE.Euler(
          webMesh.rotation.x,
          webMesh.rotation.y,
          0 // Don't apply z rotation as it's just for visual effect
        ));

        // Apply rotation to position
        position.applyMatrix4(rotationMatrix);
    }

    // Set enemy position
    enemy.position.copy(position);

    // Rotate enemy to face roughly towards the center
    enemy.rotation.z = angle;

    // Apply tunnel rotation to enemy orientation
    if (webMesh) {
        enemy.rotation.x = webMesh.rotation.x;
        enemy.rotation.y = webMesh.rotation.y;
    }

    // Add pulsating animation
    enemy.initialScale = initialScale;
    enemy.pulsePhase = Math.random() * Math.PI * 2; // Random starting phase

    // Store enemy properties
    enemy.laneIndex = laneIndex;
    enemy.enemyType = enemyType;
    enemy.points = points;

    // Store direction vector for movement (accounting for tunnel rotation)
    const direction = new THREE.Vector3(0, 0, 1);
    if (webMesh) {
        // Create a rotation matrix from the web's rotation
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(new THREE.Euler(
          webMesh.rotation.x,
          webMesh.rotation.y,
          0 // Don't apply z rotation as it's just for visual effect
        ));

        // Apply rotation to direction
        direction.applyMatrix4(rotationMatrix);
    }
    enemy.direction = direction.normalize();

    scene.add(enemy);
    enemies.push(enemy);

    return enemy;
}

// --- Create Power-Up ---
function createPowerUp(position) {
    const powerTypes = ['rapidFire', 'extraLife', 'superProjectile', 'shield'];
    const powerType = powerTypes[Math.floor(Math.random() * powerTypes.length)];

    // Emojis for each power-up type
    let emoji;
    switch (powerType) {
        case 'rapidFire':
            emoji = '🔥';
            break;
        case 'extraLife':
            emoji = '❤️';
            break;
        case 'superProjectile':
            emoji = '💥';
            break;
        case 'shield':
            emoji = '🛡️';
            break;
        default:
            emoji = '🎁'; // Default gift box
    }

    // Create a canvas to render the emoji
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.font = '100px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(emoji, 64, 64);

    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Create a sprite material with the emoji texture
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });

    // Create the sprite
    const powerUp = new THREE.Sprite(material);
    powerUp.scale.set(2, 2, 1);

    // Position at enemy death location (passed in as argument)
    powerUp.position.copy(position);

    // Apply tunnel rotation to power-up orientation
    if (webMesh) {
        powerUp.rotation.x = webMesh.rotation.x;
        powerUp.rotation.y = webMesh.rotation.y;
    }

    // Store power-up properties
    powerUp.powerType = powerType;
    powerUp.rotationSpeed = powerType === 'shield' ? 0.08 : 0.05; // Faster rotation for shield

    // Set random rotation speeds for the power-up
    powerUp.rotationSpeedX = (Math.random() - 0.5) * 0.04;
    powerUp.rotationSpeedY = (Math.random() - 0.5) * 0.04;
    powerUp.rotationSpeedZ = (Math.random() - 0.5) * 0.04;

    // Store direction vector for movement (accounting for tunnel rotation)
    const direction = new THREE.Vector3(0, 0, 1);
    if (webMesh) {
        // Create a rotation matrix from the web's rotation
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(new THREE.Euler(
          webMesh.rotation.x,
          webMesh.rotation.y,
          0 // Don't apply z rotation as it's just for visual effect
        ));

        // Apply rotation to direction
        direction.applyMatrix4(rotationMatrix);
    }
    powerUp.direction = direction.normalize();

    scene.add(powerUp);
    powerUps.push(powerUp);

    return powerUp;
}

// --- Create Explosion Effect ---
function createExplosion(position, color, sound = 'explode') {
    const particleCount = 15;
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);

    // Create particles
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.2, 6, 6);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: color || 0xffaa00,
            emissive: color || 0xffaa00,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
        });

        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        // Random position within explosion radius
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = Math.random() * 0.5;

        particle.position.set(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );

        // Random velocity
        particle.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        );

        // Lifespan in milliseconds
        particle.life = 500;
        particle.maxLife = 500;

        explosionGroup.add(particle);
    }

    // Add to scene
    scene.add(explosionGroup);
    explosions.push(explosionGroup);

    // Play explosion sound
    sounds.play(sound);

    return explosionGroup;
}

// --- Apply Power-Up ---
function applyPowerUp(powerType) {
    // Handle shield as a countable resource, not a power-up
    if (powerType === 'shield') {
        // Increment shield count
        shields++;
        updateShieldsUI();

        // Play power-up sound
        sounds.play('powerUp');
        return;
    }

    // Apply power-up effect
    switch (powerType) {
        case 'rapidFire':
            // Clear any existing rapidFire timer
            if (activePowerUps.rapidFire) {
                clearTimeout(activePowerUps.rapidFireTimer);
            }

            // Set rapidFire to active
            activePowerUps.rapidFire = true;

            // Set timer to clear rapidFire after duration
            const rapidFireDuration = 5000; // 5 seconds
            activePowerUps.rapidFireTimer = setTimeout(() => {
                activePowerUps.rapidFire = false;
            }, rapidFireDuration);
            break;

        case 'extraLife':
            lives++;
            updateLivesUI();
            break;

        case 'superProjectile':
            // Clear any existing superProjectile timer
            if (activePowerUps.superProjectile) {
                clearTimeout(activePowerUps.superProjectileTimer);
            }

            // Set superProjectile to active
            activePowerUps.superProjectile = true;

            // Set timer to clear superProjectile after duration
            activePowerUps.superProjectileTimer = setTimeout(() => {
                activePowerUps.superProjectile = false;
            }, CONFIG.POWER_UPS.DURATION);
            break;
    }

    // Play power-up sound
    sounds.play('powerUp');
}

// --- Update Web Color ---
function updateWebColor(deltaTime) {
    if (!webMesh) return;

    // Update the hue value
    webColorHue = (webColorHue + CONFIG.WEB.COLOR_SPEED * deltaTime) % 360;

    // Convert HSL to hex color
    const color = new THREE.Color().setHSL(webColorHue / 360, 1, 0.5);
    const emissiveColor = new THREE.Color().setHSL(webColorHue / 360, 1, 0.3);

    // Update all tube segments in the web
    webMesh.children.forEach(tube => {
        if (tube.material) {
            tube.material.color.copy(color);
            tube.material.emissive.copy(emissiveColor);
        }
    });
}

// --- Update Game State (per frame) ---
function update(deltaTime) {
    if (gameState !== 'playing' || isPaused) {
        return;
    }

    // Handle acceleration with up arrow key
    if (inputHandler.isKeyPressed('ArrowUp')) {
        // Accelerate enemies and powerups
        currentEnemySpeed = originalEnemySpeed * 10; // Double the speed when up arrow is pressed
    } else {
        // Return to original speed when up arrow is released
        currentEnemySpeed = originalEnemySpeed;
    }

    // Update web color
    updateWebColor(deltaTime);

    const currentFrame = renderer.info.render.frame;


    // --- Update player position to account for tunnel rotation ---
    if (webMesh) {
        updatePlayerPosition();
    }

    // Animate player ship
    animatePlayerShip(deltaTime);

    // --- Player Movement ---
    let laneChangeAttempt = false;
    let newLaneIndex = playerCurrentLaneIndex;

    const movementDirection = inputHandler.getMovementInput();
    if (movementDirection !== 0) {
        if (movementDirection < 0) {
            newLaneIndex = (playerCurrentLaneIndex + 1) % NUM_LANES;
        } else {
            newLaneIndex = (playerCurrentLaneIndex - 1 + NUM_LANES) % NUM_LANES;
        }
        laneChangeAttempt = true;
    }

    if (laneChangeAttempt && currentFrame >= lastLaneChangeFrame + playerLaneChangeRate) {
        playerCurrentLaneIndex = newLaneIndex;
        updatePlayerPosition();
        lastLaneChangeFrame = currentFrame;
    }

    // Handle automatic firing for rapid fire power-up
    if (activePowerUps.rapidFire && currentFrame % 12 === 0) {
        createProjectile(activePowerUps.superProjectile);
    }

    // --- Update Projectiles ---
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];

        // Move projectile along its direction vector (accounting for tunnel rotation)
        if (projectile.direction) {
            projectile.position.x += projectile.direction.x * CONFIG.PROJECTILES.SPEED;
            projectile.position.y += projectile.direction.y * CONFIG.PROJECTILES.SPEED;
            projectile.position.z += projectile.direction.z * CONFIG.PROJECTILES.SPEED;
        } else {
            // Fallback for projectiles created before this update
            projectile.position.z -= CONFIG.PROJECTILES.SPEED;
        }

        // Super projectiles have a trailing effect
        if (projectile.isSuper && Math.random() > 0.5) {
            const trailGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                transparent: true,
                opacity: 0.5
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.position.copy(projectile.position);
            scene.add(trail);

            // Fade out trail
            setTimeout(() => {
                scene.remove(trail);
                trail.geometry.dispose();
                trail.material.dispose();
            }, 500);
        }

        // Remove projectile if offscreen
        if (projectile.position.z < CONFIG.ENEMIES.START_Z - 5) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
        }
    }

    // --- Update Enemies ---
    enemySpawnTimer++;

    // Spawn enemies until we've reached the level's required number
    if (enemySpawnTimer >= currentEnemySpawnInterval && enemies.length < enemiesRequired - enemiesKilled) {
        // Determine enemy type to spawn
        const randomValue = Math.random();
        let enemyType;

        if (randomValue < 0.05) {
            // 5% chance for slow enemy
            enemyType = 'slow';
        } else if (randomValue < 0.10) {
            // 5% chance for bomber enemy
            enemyType = 'bomber';
        } else if (randomValue < 0.20) {
            // 10% chance for special enemy
            enemyType = 'special';
        } else {
            // 80% chance for regular enemy
            enemyType = 'regular';
        }

        createEnemy(enemyType);
        enemySpawnTimer = 0;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Move enemy along its direction vector (accounting for tunnel rotation)
        let speedMultiplier;

        // Set speed multiplier based on enemy type
        switch (enemy.enemyType) {
            case 'special':
                speedMultiplier = 1.5; // Special enemies are faster
                break;
            case 'slow':
                speedMultiplier = 0.3; // Slow enemies are very slow
                break;
            case 'bomber':
                speedMultiplier = 0.8; // Bomber enemies are slightly slower
                break;
            default:
                speedMultiplier = 1.0; // Regular enemies have normal speed
        }

        const speed = currentEnemySpeed * speedMultiplier;

        if (enemy.direction) {
            enemy.position.x += enemy.direction.x * speed;
            enemy.position.y += enemy.direction.y * speed;
            enemy.position.z += enemy.direction.z * speed;
        } else {
            // Fallback for enemies created before this update
            enemy.position.z += speed;
        }

        // Pulsating animation
        const pulseScale = enemy.initialScale + Math.sin(enemy.pulsePhase) * 0.1;
        enemy.pulsePhase += 0.05;
        // Apply pulsating effect while maintaining the larger sprite scale (3x3)
        const scaleFactor = 3 * pulseScale / enemy.initialScale;
        enemy.scale.set(scaleFactor, scaleFactor, 1);

        // Apply rotation to all enemies using their individual rotation speeds
        enemy.rotation.x += enemy.rotationSpeedX;
        enemy.rotation.y += enemy.rotationSpeedY;
        enemy.rotation.z += enemy.rotationSpeedZ;

        // Check if enemy reached the player's end
        if (enemy.position.z > CONFIG.ENEMIES.END_Z) {
            // Player loses a life if no shields available
            if (shields <= 0) {
                loseLife();
            } else {
                // Shield absorbs one hit
                shields--;
                updateShieldsUI();

                // Visual effect for shield hit
                createExplosion(enemy.position, 0x0088ff, 'baseHit');
            }

            scene.remove(enemy);
            enemies.splice(i, 1);

            if (gameState !== 'playing') return;
        }
    }

    // --- Update Power-Ups ---
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];

        // Move power-up towards player along its direction vector (accounting for tunnel rotation)
        const speed = currentEnemySpeed * 1.5; // Increased from 0.5 to 1.5 to make power-ups three times faster
        if (powerUp.direction) {
            powerUp.position.x += powerUp.direction.x * speed;
            powerUp.position.y += powerUp.direction.y * speed;
            powerUp.position.z += powerUp.direction.z * speed;
        } else {
            // Fallback for power-ups created before this update
            powerUp.position.z += speed;
        }

        // Rotate power-up using individual rotation speeds
        powerUp.rotation.x += powerUp.rotationSpeedX;
        powerUp.rotation.y += powerUp.rotationSpeedY;
        powerUp.rotation.z += powerUp.rotationSpeedZ;

        // Pulsate size while maintaining the sprite scale (2x2)
        const pulseScale = 1 + 0.1 * Math.sin(performance.now() * 0.005);
        powerUp.scale.set(2 * pulseScale, 2 * pulseScale, 1);

        // Check if power-up is collected
        if (powerUp.position.z > CONFIG.PLAYER.Z_POSITION - 1 &&
          Math.abs(powerUp.position.x - player.position.x) < 2 &&
          Math.abs(powerUp.position.y - player.position.y) < 2) {

            // Collect power-up
            applyPowerUp(powerUp.powerType);

            // Remove power-up
            scene.remove(powerUp);
            powerUps.splice(i, 1);
        }

        // Remove if past player
        if (powerUp.position.z > CONFIG.PLAYER.Z_POSITION + 5) {
            scene.remove(powerUp);
            powerUps.splice(i, 1);
        }
    }

    // --- Update Explosions ---
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        let removeExplosion = true;

        // Update each particle
        explosion.children.forEach(particle => {
            particle.position.add(particle.velocity);
            particle.life -= deltaTime;

            // Fade out particle
            if (particle.life > 0) {
                particle.material.opacity = particle.life / particle.maxLife;
                removeExplosion = false;
            } else {
                particle.material.opacity = 0;
            }
        });

        // Remove explosion if all particles are dead
        if (removeExplosion) {
            // Clean up all particles
            explosion.children.forEach(particle => {
                particle.geometry.dispose();
                particle.material.dispose();
            });
            scene.remove(explosion);
            explosions.splice(i, 1);
        }
    }

    // --- Collision Detection (Projectile vs Enemy) ---
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        let projectileHit = false;

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];

            // Check if in same lane and close enough on Z axis
            if (projectile.laneIndex === enemy.laneIndex &&
              Math.abs(projectile.position.z - enemy.position.z) < CONFIG.COLLISION.Z_TOLERANCE) {

                // Collision detected!
                const hitPoints = enemy.points;
                addScore(hitPoints);
                enemiesKilled++;

                // Get enemy color for explosion effect
                let explosionColor;
                switch (enemy.enemyType) {
                    case 'special':
                        explosionColor = 0xff0000; // Red
                        break;
                    case 'slow':
                        explosionColor = 0x0000ff; // Blue
                        break;
                    case 'bomber':
                        explosionColor = 0xff8800; // Orange
                        break;
                    default:
                        explosionColor = 0x00ff00; // Green
                }

                // Create explosion effect
                createExplosion(enemy.position, explosionColor);


                // Special behavior for bomber enemy
                if (enemy.enemyType === 'bomber') {
                    // Directly add a bomb to the player's inventory without creating a prop
                    bombs++;
                    updateBombsUI();

                    // Show message
                    showMessage("💣 ACQUIRED!", 0xff8800);

                    // Play power-up sound
                    sounds.play('powerUp');

                    // Create explosion effect for visual feedback
                    createExplosion(enemy.position, 0xff8800);
                }
                // Normal chance to spawn power-up for other enemy types
                else if (Math.random() < CONFIG.POWER_UPS.CHANCE || enemy.enemyType === 'special') {
                    createPowerUp(enemy.position);
                }

                // Remove enemy
                scene.remove(enemy);
                enemies.splice(j, 1);

                // Super projectiles can pass through enemies
                if (!projectile.isSuper) {
                    // Remove projectile
                    scene.remove(projectile);
                    projectiles.splice(i, 1);
                    projectileHit = true;
                }

                // Check if level is complete
                if (enemiesKilled >= enemiesRequired) {
                    completedLevel();
                }

                // Break inner loop if projectile was destroyed
                if (projectileHit) break;
            }
        }
    }
}

// --- Game Over Logic ---
function loseLife() {
    if (gameState !== 'playing') return;

    lives--;
    updateLivesUI();

    // Visual indication
    createExplosion(player.position, 0xff0000, 'baseHit');

    // Make player flash
    let flashCount = 0;
    const flashInterval = setInterval(() => {
        player.visible = !player.visible;
        flashCount++;
        if (flashCount >= 6) {
            clearInterval(flashInterval);
            player.visible = true;
        }
    }, 200);

    if (lives <= 0) {
        endGame();
    }
}

function endGame() {
    if (gameState !== 'playing') return;

    // Save rotation state before ending the game
    saveRotationState();

    gameState = 'gameover';

    // Update final score display using UI class
    const finalScoreUI = ui.getElement('finalScore');
    const finalHighScoreUI = ui.getElement('finalHighScore');
    if (finalScoreUI) finalScoreUI.textContent = 'FINAL SCORE: ' + score.toLocaleString();
    if (finalHighScoreUI) finalHighScoreUI.textContent = 'HIGH SCORE: ' + highScore.toLocaleString();

    // Check if player's score qualifies for the leaderboard
    const isLeaderboardScore = leaderboardManager.checkHighScore(score);

    // Show high score form if it's a new high score
    const highScoreForm = ui.getElement('highScoreForm');
    if (highScoreForm) {
        highScoreForm.style.display = isLeaderboardScore ? 'block' : 'none';

        if (isLeaderboardScore) {
            // Focus on the input field and select any existing text
            setTimeout(() => {
                ui.focusPlayerInitials();
            }, 300);
        }
    }

    // Update and display the leaderboard
    const leaderboardHTML = leaderboardManager.generateLeaderboardHTML();
    ui.updateLeaderboard(leaderboardHTML, false);
    const leaderboardContainer = ui.getElement('leaderboardContainer');
    if (leaderboardContainer) {
        leaderboardContainer.style.display = 'block';
    }

    // Show game over screen
    ui.showScreen('gameOverScreen');
    ui.hideScreen('ui');
    document.getElementById('level-indicator').style.display = 'none';

    // Clear game objects
    clearGameObjects();

    // Hide player
    player.visible = false;

    // Play game over sound
    sounds.play('explode');

    // Clear power-up timers
    if (activePowerUps.rapidFire) {
        clearTimeout(activePowerUps.rapidFireTimer);
        activePowerUps.rapidFire = false;
    }
    if (activePowerUps.superProjectile) {
        clearTimeout(activePowerUps.superProjectileTimer);
        activePowerUps.superProjectile = false;
    }


}


// --- Level Complete Logic ---
function completedLevel() {
    if (gameState !== 'playing') return;

    // Save rotation state before completing the level
    saveRotationState();

    gameState = 'levelcomplete';

    // Bonus points for completing level
    const levelBonus = level * 500;
    addScore(levelBonus);

    // Play level complete sound
    // sounds.levelComplete.play();

    // Clear power-up timers
    if (activePowerUps.rapidFire) {
        clearTimeout(activePowerUps.rapidFireTimer);
        activePowerUps.rapidFire = false;
    }
    if (activePowerUps.superProjectile) {
        clearTimeout(activePowerUps.superProjectileTimer);
        activePowerUps.superProjectile = false;
    }

    // Show level up message
    showMessage("LEVEL " + level + " COMPLETE!", 0x00ffff);

    // Automatically continue to next level after a short delay
    setTimeout(nextLevel, 2000);
}

// --- UI Updates ---
function addScore(points) {
    score += points;
    updateScoreUI();

    // Update high score if current score is higher
    if (score > highScore) {
        highScore = score;
        updateHighScoreUI();
        saveHighScore();
    }

    // Check for bomb reward milestone (every 1000 points)
    const currentMilestone = Math.floor(score / CONFIG.SCORING.BOMB_POINTS);
    if (currentMilestone > lastBombMilestone) {
        // Award a new bomb for each milestone passed
        const newBombs = currentMilestone - lastBombMilestone;

        // Add bombs, but don't exceed the maximum of 30
        bombs = Math.min(bombs + newBombs, 30);

        // Award a shield for every 2 bomb milestones (every 2000 points)
        if (currentMilestone % 2 === 0 && currentMilestone > 0) {
            // Add a shield, but don't exceed the maximum of 5
            shields = Math.min(shields + 1, 5);
            updateShieldsUI();

            // Visual feedback for getting a new shield
            showMessage("NEW 🛡️ ACQUIRED!", 0x00ffff);
        }

        // Update the last milestone
        lastBombMilestone = currentMilestone;

        // Update the bombs UI
        updateBombsUI();

        // Visual feedback for getting a new bomb
        const message = newBombs === 1 ? "NEW 💣 ACQUIRED!" : newBombs + " NEW 💣 ACQUIRED!";
        showMessage(message, 0xffff00);
    }
}

// Helper function to show temporary messages
function showMessage(text, color) {
    // Create a div for the message
    const messageDiv = document.createElement('div');
    messageDiv.textContent = text;
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.color = '#' + color.toString();
    messageDiv.style.textShadow = '0 0 10px #' + color.toString();
    messageDiv.style.fontSize = '2em';
    messageDiv.style.fontFamily = "Orbitron, sans-serif";
    messageDiv.style.zIndex = '1000';
    messageDiv.style.pointerEvents = 'none';

    // Add to document
    document.body.appendChild(messageDiv);

    // Fade out and float up after 2 seconds
    setTimeout(() => {
        messageDiv.style.transition = 'opacity 1s, transform 1s';
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translate(-50%, -150%)'; // Move upward while fading
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 1000);
    }, 1000);
}

function updateScoreUI() {
    ui.updateScore(score);
}

function updateHighScoreUI() {
    ui.updateHighScore(highScore);
}

function updateLivesUI() {
    ui.updateLives(lives);
}

function updateLevelUI() {
    ui.updateLevel(level);
}

function updateBombsUI() {
    ui.updateBombs(bombs);
}

function updateShieldsUI() {
    ui.updateShields(shields);
}

let fpsValues = [];
let lastFpsUpdateTime = 0;
let currentFps = 0;
const FPS_UPDATE_INTERVAL = 500; // Update FPS display every 500ms
const FPS_SAMPLE_SIZE = 20; // Number of frames to average

// Add this function to calculate and update FPS
function updateFPS(currentTime) {
    if (!lastFrameTime) {
        lastFrameTime = currentTime;
        return;
    }

    // Calculate time difference since last frame
    const deltaTime = currentTime - lastFrameTime;

    // Calculate instantaneous FPS
    const instantFps = 1000 / deltaTime;

    // Add to rolling average
    fpsValues.push(instantFps);

    // Keep only the last N values
    if (fpsValues.length > FPS_SAMPLE_SIZE) {
        fpsValues.shift();
    }

    // Update the displayed FPS value every X milliseconds
    if (currentTime - lastFpsUpdateTime > FPS_UPDATE_INTERVAL) {
        // Calculate average FPS
        currentFps = Math.round(
          fpsValues.reduce((sum, value) => sum + value, 0) / fpsValues.length
        );

        // Update UI if you have an FPS display element
        const fpsDisplay = document.getElementById('fps-display');
        if (fpsDisplay) {
            fpsDisplay.textContent = `FPS: ${currentFps}`;
        }

        lastFpsUpdateTime = currentTime;
    }
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Calculate delta time
    const currentTime = performance.now();
    // Calculate and update FPS
    updateFPS(currentTime);
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    // Always update stars animation, even when paused or in menu
    updateStars(deltaTime);

    // Update game state
    if (!isPaused) {
        // Handle countdown state
        if (gameState === 'countdown') {
            updateCountdown();
        }
        // Handle playing state
        else if (gameState === 'playing') {
            update(deltaTime);
        }
    }

    // Render
    renderer.render(scene, camera);
}

// --- Update Stars Animation ---
function updateStars(deltaTime) {
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Rotate stars slowly for subtle movement
        star.rotation.y += star.userData.rotationSpeed * deltaTime;
        star.rotation.x += star.userData.rotationSpeed * 0.7 * deltaTime;

        // Make stars twinkle by changing opacity
        star.material.opacity = Math.sin(star.userData.twinklePhase) * 0.3 + 0.7;
        star.userData.twinklePhase += star.userData.twinkleSpeed * deltaTime;

        // Slowly rotate all stars around the center for a subtle space movement effect
        const rotationSpeed = 0.00005 * deltaTime;
        const currentX = star.position.x;
        const currentZ = star.position.z;
        star.position.x = currentX * Math.cos(rotationSpeed) - currentZ * Math.sin(rotationSpeed);
        star.position.z = currentZ * Math.cos(rotationSpeed) + currentX * Math.sin(rotationSpeed);
    }
}

// --- Event Handlers ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    inputHandler.keyState[event.key] = true;

    // Handle firing
    if (gameState === 'playing' && event.key === ' ') {
        // Create super projectile if power-up is active
        createProjectile(activePowerUps.superProjectile);
    }

    // Handle bomb activation
    if (gameState === 'playing' && !isPaused && event.key.toLowerCase() === 'b') {
        activateBomb();
    }

    // Toggle pause
    if (gameState === 'playing' && (event.key === 'p' || event.key === 'Enter')) {
        // Check if instructions modal is visible
        const instructionsModal = document.getElementById('instructions-modal');
        const isInstructionsVisible = instructionsModal && instructionsModal.style.display === 'block';

        // Only toggle pause if instructions are not visible
        if (!isInstructionsVisible) {
            isPaused = !isPaused;
            if (isPaused) {
                ui.showPauseScreen();
                ui.showMenu();
            } else {
                ui.hidePauseScreen();
                ui.hideScreen('menu');
            }
            updateStartButtonText();

            if (!isPaused) {
                // Apply settings when resuming
                applyGameSettings();
            }
        }
    }

    // Prevent scrolling when pressing space, arrow keys, or Enter
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'b', 'B'].includes(event.key)) {
        event.preventDefault();
    }
}

function onKeyUp(event) {
    inputHandler.keyState[event.key] = false;
}

function onMouseClick() {
    // Allow toggling rotation if game is playing, even when paused
    if (gameState === 'playing') {
        // Toggle rotation enabled flag
        isRotationEnabled = !isRotationEnabled;

        // Save rotation state to localStorage
        saveRotationState();
    }
}

// --- Bomb Activation Function ---
function activateBomb() {
    // Check if there are bombs available
    if (bombs <= 0) return;

    // Decrease bomb count
    bombs--;
    updateBombsUI();

    sounds.play('bomb');

    // Create a large explosion effect at the center of the web
    const centerExplosion = createExplosion(new THREE.Vector3(0, 0, 0), 0xff0000);
    centerExplosion.scale.set(3, 3, 3); // Make the explosion larger

    // Track total points from destroyed enemies
    let totalPoints = 0;

    // Destroy all visible enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Add points for each enemy
        totalPoints += enemy.points;

        // Create explosion effect at enemy position
        createExplosion(enemy.position, enemy.isSpecial ? 0xff0000 : 0x00ff00);

        // Remove enemy
        scene.remove(enemy);
        enemies.splice(i, 1);

        // Increment enemies killed count
        enemiesKilled++;
    }

    // Add score for destroyed enemies
    if (totalPoints > 0) {
        addScore(totalPoints);
    }

    // Check if level is complete
    if (enemiesKilled >= enemiesRequired) {
        completedLevel();
    }
}

// --- Apply Game Settings ---
function applyGameSettings() {
    // Get selected settings
    const selectedValues = ui.getSelectedValues();

    // Apply settings
    setGameSettings(selectedValues.speed, selectedValues.difficulty, selectedValues.webType, selectedValues.tubeWidth, selectedValues.lives);

    // Recreate the web if the web type has changed
    if (webType !== selectedValues.webType) {
        createWeb(selectedValues.webType);
        // Reset player position after new web creation
        playerCurrentLaneIndex = Math.floor(NUM_LANES / 2);
        updatePlayerPosition();
    }
}

// --- Setup Audio Initialization on User Interaction ---
// Add event listeners to initialize audio on first user interaction
const initAudioOnInteraction = async (event) => {
    // First, directly try to resume the audio context if it exists
    if (window.audioWorkletManager && window.audioWorkletManager.audioContext) {
        try {
            const state = window.audioWorkletManager.audioContext.state;

            if (state === 'suspended') {
                await window.audioWorkletManager.audioContext.resume();
            }
        } catch (error) {
            console.error('Failed to resume AudioContext directly:', error);
        }
    } else {
        console.error('AudioWorkletManager or AudioContext not available yet');
    }

    // Then continue with normal sound initialization
    await sounds.initializeAudio();

    // Play a silent sound to unblock audio
    try {
        if (window.audioWorkletManager) {
            // Create a silent oscillator to unblock audio
            const context = window.audioWorkletManager.audioContext;
            if (context) {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                gain.gain.value = 0.001; // Nearly silent
                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start(0);
                oscillator.stop(0.1); // Very short duration
            }
        }
    } catch (error) {
        console.error('Failed to play silent sound:', error);
    }

    // Remove the event listeners once audio is initialized
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('keydown', initAudioOnInteraction);
    document.removeEventListener('touchstart', initAudioOnInteraction);

};

// Add event listeners for common user interactions
document.addEventListener('click', initAudioOnInteraction);
document.addEventListener('keydown', initAudioOnInteraction);
document.addEventListener('touchstart', initAudioOnInteraction);

// Function to change ship type during gameplay
function changeShipType(newShipType) {
    if (newShipType && newShipType !== shipType) {
        shipType = newShipType;

        // Update dropdown in case this was called programmatically
        const currentShipType = ui.getSelectedValues().shipType;
        if (currentShipType !== newShipType) {
            ui.setSelectedValues({ shipType: newShipType });
        }

        // Recreate the player with the new ship type
        createPlayer();

        // Play a sound effect for ship change if game is running
        if (isGameRunning && !isPaused) {
            sounds.playSound('powerUp');
        }
    }
}

// --- Leaderboard Functions ---

// Load leaderboard from API with localStorage fallback (deprecated)
async function loadLeaderboard() {
    // This function is deprecated - use leaderboardManager.loadLeaderboard() instead
    return await leaderboardManager.loadLeaderboard();
}

// Save leaderboard to localStorage (deprecated - use LeaderboardManager instead)
function saveLeaderboard() {
    // This function is deprecated - LeaderboardManager handles persistence
    leaderboardManager.saveLeaderboard();
}

// Check if the current score qualifies for the leaderboard
function checkHighScore(currentScore) {
    // This function is deprecated - use leaderboardManager.checkHighScore() instead
    return leaderboardManager.checkHighScore(currentScore);
}

// Add a new score to the leaderboard via API
async function addScoreToLeaderboard(initials, currentScore) {
    const formattedInitials = initials.toUpperCase().substring(0, 3);

    try {
        const response = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                initials: formattedInitials,
                score: currentScore
            })
        });

        if (!response.ok) throw new Error('Failed to submit score');

        const result = await response.json();

        if (result.success) {
            // Update local leaderboard with the one from the server (deprecated)
            // leaderboard = result.leaderboard;

            // This function is deprecated - the LeaderboardManager handles this now

            // Update the UI (deprecated - use LeaderboardManager instead)
            const leaderboardHTML = leaderboardManager.generateLeaderboardHTML();
            ui.updateLeaderboard(leaderboardHTML, false);

            // Local storage is now handled by LeaderboardManager

            return true;
        } else {
            console.error('Failed to submit score:', result.message);
            return false;
        }
    } catch (e) {
        console.error('Error submitting score to API:', e);

        // Fall back to local storage if API is unavailable (deprecated)
        // This function is deprecated - use leaderboardManager.addScoreLocally() instead
        console.warn('API unavailable, but this fallback is deprecated');

        // Use LeaderboardManager for local fallback
        const localResult = leaderboardManager.addScoreLocally(formattedInitials, currentScore);

        // Update the UI
        const leaderboardHTML = leaderboardManager.generateLeaderboardHTML();
        ui.updateLeaderboard(leaderboardHTML, false);

        return true;
    }
}

// Render the leaderboard HTML
function renderLeaderboard(targetElement = leaderboardTable) {
    if (!targetElement) return;

    // Create the table
    let html = `
    <table class="leaderboard-table">
        <thead>
            <tr>
                <th>RANK</th>
                <th>PLAYER</th>
                <th>SCORE</th>
            </tr>
        </thead>
        <tbody>
    `;

    // Add table rows - show only top 5 leaders
    leaderboardManager.getLeaderboard().slice(0, 5).forEach((entry, index) => {
        const highScoreStatus = leaderboardManager.getHighScoreStatus();
        const isHighlighted = (highScoreStatus.isNewHighScore && index === highScoreStatus.rank) ? 'highlight' : '';
        html += `
        <tr class="${isHighlighted}">
            <td>${index + 1}</td>
            <td>${entry.initials}</td>
            <td>${entry.score}</td>
        </tr>
        `;
    });

    // Close the table
    html += `
        </tbody>
    </table>
    `;

    // Set the HTML
    targetElement.innerHTML = html;
}

// Show the leaderboard modal
function showLeaderboard() {
    // Update leaderboard with latest data
    const leaderboardHTML = leaderboardManager.generateLeaderboardHTML();
    ui.updateLeaderboard(leaderboardHTML, true);
    ui.showLeaderboardModal();
}

// Hide the leaderboard modal
function hideLeaderboard() {
    ui.hideLeaderboardModal();
}

// Handle score submission
async function handleScoreSubmit() {
    const highScoreStatus = leaderboardManager.getHighScoreStatus();
    if (highScoreStatus.isNewHighScore) {
        const initials = ui.getPlayerInitials();
        if (initials) {
            // Disable submit button during submission
            const submitButton = ui.getElement('submitScore');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'SENDING...';
            }

            try {
                // Add score to leaderboard (async)
                const result = await leaderboardManager.addScoreToLeaderboard(initials, score);
                const success = result.success;

                if (success) {
                    // Hide form and reset
                    const highScoreForm = ui.getElement('highScoreForm');
                    if (highScoreForm) highScoreForm.style.display = 'none';
                    ui.setPlayerInitials('');
                    leaderboardManager.resetHighScoreStatus();

                    // Play a sound if available
                    if (sounds && sounds.playSound) {
                        sounds.playSound('powerUp');
                    }
                } else {
                    alert('Failed to submit score. Please try again.');
                }
            } catch (error) {
                console.error('Error in score submission:', error);
                alert('An error occurred while submitting your score.');
            } finally {
                // Re-enable submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'SUBMIT';
                }
            }
        } else {
            // Flash the input if empty
            const playerInitialsInput = ui.getElement('playerInitials');
            if (playerInitialsInput) {
                playerInitialsInput.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                setTimeout(() => {
                    playerInitialsInput.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                }, 300);
            }
        }
    }
}

// --- Add event listeners for fullscreen toggle buttons ---
const fullscreenToggleButton = document.getElementById('fullscreen-toggle');
if (fullscreenToggleButton) {
    fullscreenToggleButton.addEventListener('click', toggleFullscreen);
}

const gameFullscreenToggleButton = document.getElementById('game-fullscreen-toggle');
if (gameFullscreenToggleButton) {
    gameFullscreenToggleButton.addEventListener('click', toggleFullscreen);
}

// Initialize fullscreen toggle buttons
updateFullscreenToggleButton();

// --- Start the Game ---
console.log('Initializing');
await init();
console.log('Initialized');
