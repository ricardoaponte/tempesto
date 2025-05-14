// --- Global Variables ---
let scene, camera, renderer;
let webMesh;
let player;
const projectiles = [];
const enemies = [];
const powerUps = [];
const explosions = [];
const stars = [];
const NUM_STARS = 200; // Number of background stars
const keyState = {};
let difficulty = 'medium'; // Default difficulty

// Web color variables
let webColorHue = 180; // Starting with cyan (180 degrees in HSL)
const webColorSpeed = 0.1; // Speed of color change
let shipType = 'classic'; // Default ship type


// Mouse tracking variables
let targetRotationX = 0;
let targetRotationY = 0;
let isRotationEnabled = false; // Flag to enable/disable tunnel rotation

// localStorage keys
const STORAGE_KEY_ROTATION_X = 'tempest3d_rotationX';
const STORAGE_KEY_ROTATION_Y = 'tempest3d_rotationY';
const STORAGE_KEY_ROTATION_ENABLED = 'tempest3d_rotationEnabled';
const STORAGE_KEY_HIGH_SCORE = 'tempest3d_highScore';
const STORAGE_KEY_SOUND_ENABLED = 'tempest3d_soundEnabled';
const STORAGE_KEY_LEADERBOARD = 'tempest3d_leaderboard';

// Debounce timer for saving rotation state
let saveRotationTimer = null;

// Game State
let gameState = 'menu'; // 'menu', 'countdown', 'playing', 'paused', 'gameover', 'levelcomplete'
let isPaused = false;
let countdownTime = 3; // 3-second countdown
let countdownStartTime = 0;

// Sound State
let isSoundEnabled = true; // Default to sound on


// Web Configuration
let NUM_LANES = 16;
const WEB_DEPTH = 160;
const WEB_RADIUS = 9;
let LANE_ANGLE_STEP = (Math.PI * 2) / NUM_LANES;
let webType = 'circle';
let tubeWidth = 'large'; // Options: 'wire', 'small', 'medium', 'large'

// Fixed Z positions
const PLAYER_Z = WEB_DEPTH / 2;
const ENEMY_START_Z = -WEB_DEPTH / 2 + 1;
const ENEMY_END_Z = WEB_DEPTH / 2 - 2;

// Game mechanics
const PROJECTILE_SPEED = 0.6;
const COLLISION_Z_TOLERANCE = 1.0;
const POWER_UP_CHANCE = 0.15; // 15% chance of power-up spawn per enemy kill
const POWER_UP_DURATION = 10000; // 10 seconds
const BOMB_POINTS = 3000;
const MAX_SHOTS = 10;

// Configurable Settings
let playerLaneChangeRate = 6;
let currentEnemySpeed = 0.08;
let originalEnemySpeed = 0.08; // Store original speed for returning after acceleration
let currentEnemySpawnInterval = 50;
let enemiesPerLevel = 20;

// Game stats
let score = 0;
let highScore = 0;
let lives = 3;
let level = 1;
let enemiesKilled = 0;
let enemiesRequired = enemiesPerLevel;

// Leaderboard
let leaderboard = [];
let isNewHighScore = false;
let newScoreRank = -1;
let enemySpawnTimer = 0;
let playerCurrentLaneIndex = Math.floor(NUM_LANES / 2);
let lastLaneChangeFrame = 0;
let activePowerUp = null;
let powerUpTimer = 0;
let lastFrameTime = 0;

// Bomb variables
let bombs = 0; // Start with 3 bombs
let lastBombMilestone = 0; // Track the last score milestone for bomb rewards

// --- UI Elements ---
const uiElement = document.getElementById('ui');
const scoreUI = document.getElementById('score');
const highScoreUI = document.getElementById('high-score');
const livesUI = document.getElementById('lives');
const bombsUI = document.getElementById('bombs');
const powerUpUI = document.getElementById('active-power');
const levelUI = document.getElementById('current-level');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over');
const finalScoreUI = document.getElementById('final-score');
const finalHighScoreUI = document.getElementById('final-high-score');
const restartButton = document.getElementById('restart-button');
const replayButton = document.getElementById('replay-button');
const menuElement = document.getElementById('menu');
const speedSelect = document.getElementById('speed-select');
const difficultySelect = document.getElementById('difficulty-select');
const webTypeSelect = document.getElementById('web-type-select');
const tubeWidthSelect = document.getElementById('tube-width-select');
const livesSelect = document.getElementById('lives-select');
const shipSelect = document.getElementById('ship-select');
const gameShipSelect = document.getElementById('game-ship-select');
const startButton = document.getElementById('start-button');

// Leaderboard elements
const leaderboardContainer = document.getElementById('leaderboard-container');
const leaderboardTable = document.getElementById('leaderboard-table');
const modalLeaderboardTable = document.getElementById('modal-leaderboard-table');
const leaderboardModal = document.getElementById('leaderboard-modal');
const showLeaderboardButton = document.getElementById('show-leaderboard-button');
const closeLeaderboardButton = document.getElementById('close-leaderboard-button');
const highScoreForm = document.getElementById('high-score-form');
const playerInitialsInput = document.getElementById('player-initials');
const submitScoreButton = document.getElementById('submit-score');


// --- Save and Load Rotation State ---
function saveRotationState() {
    try {
        localStorage.setItem(STORAGE_KEY_ROTATION_X, targetRotationX);
        localStorage.setItem(STORAGE_KEY_ROTATION_Y, targetRotationY);
        localStorage.setItem(STORAGE_KEY_ROTATION_ENABLED, isRotationEnabled);
    } catch (e) {
        console.error("Failed to save rotation state to localStorage:", e);
    }
}

// --- Save and Load High Score ---
function saveHighScore() {
    try {
        localStorage.setItem(STORAGE_KEY_HIGH_SCORE, highScore);
    } catch (e) {
        console.error("Failed to save high score to localStorage:", e);
    }
}

function loadHighScore() {
    try {
        const savedHighScore = localStorage.getItem(STORAGE_KEY_HIGH_SCORE);

        if (savedHighScore !== null) {
            highScore = parseInt(savedHighScore);
            updateHighScoreUI();
        }
    } catch (e) {
        console.error("Failed to load high score from localStorage:", e);
    }
}

// --- Save and Load Sound State ---
function saveSoundState() {
    try {
        localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, isSoundEnabled);
    } catch (e) {
        console.error("Failed to save sound state to localStorage:", e);
    }
}

function loadSoundState() {
    try {
        const savedSoundState = localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
        if (savedSoundState !== null) {
            isSoundEnabled = savedSoundState === 'true';

            // Initialize AudioWorklet manager's sound enabled state
            if (window.audioWorkletManager) {
                window.audioWorkletManager.setSoundEnabled(isSoundEnabled);
            }

            updateSoundToggleButton();
        }
    } catch (e) {
        console.error("Failed to load sound state from localStorage:", e);
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
    if (startButton) {
        startButton.textContent = (gameState === 'playing' && isPaused) ? 'RESUME GAME' : 'START GAME';
    }
}

// --- Update Sound Toggle Buttons ---
function updateSoundToggleButton() {
    // Update menu sound toggle button
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
                keyState['ArrowRight'] = true;
            });

            leftButton.addEventListener('touchend', function (e) {
                e.preventDefault();
                keyState['ArrowRight'] = false;
            });
        }

        if (rightButton) {
            rightButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                keyState['ArrowLeft'] = true;
            });

            rightButton.addEventListener('touchend', function (e) {
                e.preventDefault();
                keyState['ArrowLeft'] = false;
            });
        }

        // Fire button
        if (fireButton) {
            fireButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                keyState[' '] = true;
                if (gameState === 'playing') {
                    createProjectile(activePowerUp === 'superProjectile');
                }
            });

            fireButton.addEventListener('touchend', function (e) {
                e.preventDefault();
                keyState[' '] = false;
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
                        pauseScreen.style.display = isPaused ? 'block' : 'none';
                        menuElement.style.display = isPaused ? 'block' : 'none';
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
                            pauseScreen.style.display = isPaused ? 'block' : 'none';
                            menuElement.style.display = isPaused ? 'block' : 'none';
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
                        keyState['ArrowRight'] = true;
                        setTimeout(() => {
                            keyState['ArrowRight'] = false;
                        }, 100);
                    } else {
                        // Swipe right - move left (inverted)
                        keyState['ArrowLeft'] = true;
                        setTimeout(() => {
                            keyState['ArrowLeft'] = false;
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
        bomb: 'assets/sounds/blast-37988.mp3'
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
                console.log('All sounds loaded successfully');
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
                    console.log('AudioWorkletManager is now available');
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

                    console.log('Audio system initialized');
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
                console.log('Sound play result:', result);
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
    // Load high score
    loadHighScore();

    // Load leaderboard (async)
    await loadLeaderboard();

    // Load sound state
    loadSoundState();

    // Initialize sounds
    sounds.init();

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
    camera.position.set(0, .6, WEB_DEPTH / 2 + 15);
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
    if (uiElement) uiElement.style.display = 'none';

    const powerUpsElement = document.getElementById('power-ups');
    if (powerUpsElement) powerUpsElement.style.display = 'none';

    const levelIndicatorElement = document.getElementById('level-indicator');
    if (levelIndicatorElement) levelIndicatorElement.style.display = 'none';

    if (gameOverScreen) gameOverScreen.style.display = 'none';
    // We don't need to hide the level complete screen anymore as it's not shown
    // if (levelCompleteScreen) levelCompleteScreen.style.display = 'none';
    if (menuElement) menuElement.style.display = 'block';

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
    if (startButton) startButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', restartGame);
    if (replayButton) replayButton.addEventListener('click', replayGame);
    // We don't need the next level button anymore as levels continue automatically
    // if (nextLevelButton) nextLevelButton.addEventListener('click', nextLevel);

    // Ship selection listeners - works during gameplay to change ship on the fly
    if (shipSelect) shipSelect.addEventListener('change', function () {
        // Update the in-game selector to match
        if (gameShipSelect) gameShipSelect.value = shipSelect.value;
        changeShipType(shipSelect.value);
    });

    // In-game ship selector
    if (gameShipSelect) gameShipSelect.addEventListener('change', function () {
        // Update the menu selector to match
        if (shipSelect) shipSelect.value = gameShipSelect.value;
        changeShipType(gameShipSelect.value);
    });

    // Sound toggle buttons listeners
    const soundToggleButton = document.getElementById('sound-toggle');
    const gameSoundToggleButton = document.getElementById('game-sound-toggle');

    if (soundToggleButton) soundToggleButton.addEventListener('click', toggleSound);
    if (gameSoundToggleButton) gameSoundToggleButton.addEventListener('click', toggleSound);

    // Leaderboard button listeners
    if (showLeaderboardButton) showLeaderboardButton.addEventListener('click', showLeaderboard);
    if (closeLeaderboardButton) closeLeaderboardButton.addEventListener('click', hideLeaderboard);
    if (submitScoreButton) submitScoreButton.addEventListener('click', handleScoreSubmit);


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
    for (let i = 0; i < NUM_STARS; i++) {
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
function createWeb(type) {
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
        depth: WEB_DEPTH,
        bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -WEB_DEPTH / 2);

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
        const tubeRadius = WEB_RADIUS * tubeRadiusMultiplier;
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
    shape.moveTo(WEB_RADIUS, 0);
    for (let i = 1; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        shape.lineTo(WEB_RADIUS * Math.cos(angle), WEB_RADIUS * Math.sin(angle));
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
    x = WEB_RADIUS * Math.cos(angle);
    y = WEB_RADIUS * Math.sin(angle);

    // Create a position vector
    const position = new THREE.Vector3(x, y, PLAYER_Z);

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
function startGame() {
    // If the game is paused, resume it
    if (gameState === 'playing' && isPaused) {
        isPaused = false;
        pauseScreen.style.display = 'none';
        menuElement.style.display = 'none';
        updateStartButtonText();
        return;
    }

    // Otherwise, don't start a new game if already playing or in countdown
    if (gameState === 'playing' || gameState === 'countdown') return;

    // Initialize audio after user interaction
    sounds.initializeAudio();

    // Get selected settings
    const selectedSpeed = speedSelect.value;
    const selectedDifficulty = difficultySelect.value;
    const selectedWebType = webTypeSelect.value;
    const selectedTubeWidth = tubeWidthSelect.value;
    const selectedLives = livesSelect.value;
    // Update global ship type
    shipType = shipSelect.value;

    // Sync the in-game ship selector with the menu selection
    if (gameShipSelect) {
        gameShipSelect.value = shipType;
    }

    setGameSettings(selectedSpeed, selectedDifficulty, selectedWebType, selectedTubeWidth, selectedLives);

    // Create the web based on selected type
    createWeb(selectedWebType);

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
    activePowerUp = null;
    powerUpTimer = 0;

    // Reset leaderboard state
    isNewHighScore = false;
    newScoreRank = -1;

    // Hide leaderboard elements
    if (leaderboardContainer) {
        leaderboardContainer.style.display = 'none';
    }
    if (highScoreForm) {
        highScoreForm.style.display = 'none';
    }
    bombs = 0; // Reset bombs to 0
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
    updatePowerUpUI();
    updateBombsUI();

    uiElement.style.display = 'block';
    document.getElementById('power-ups').style.display = 'block';
    document.getElementById('level-indicator').style.display = 'block';
    gameOverScreen.style.display = 'none';
    // We don't need to hide the level complete screen anymore as it's not shown
    // levelCompleteScreen.style.display = 'none';
    menuElement.style.display = 'none';

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
function nextLevel() {
    if (gameState !== 'levelcomplete') return;

    // Initialize audio after user interaction
    sounds.initializeAudio();

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

    // Choose a new random web shape for variety
    const webTypes = ['circle', 'pentagon', 'hexagon', 'octagon', 'random'];
    const newWebType = webTypes[Math.floor(Math.random() * webTypes.length)];
    createWeb(newWebType);

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
function restartGame() {
    // Initialize audio after user interaction
    sounds.initializeAudio();

    gameState = 'menu';
    gameOverScreen.style.display = 'none';
    menuElement.style.display = 'block';
    uiElement.style.display = 'none';
    document.getElementById('power-ups').style.display = 'none';
    document.getElementById('level-indicator').style.display = 'none';

    player.visible = false;
    clearGameObjects();
}

// --- Replay Game Function ---
function replayGame() {
    // Initialize audio after user interaction
    sounds.initializeAudio();

    // Hide game over screen
    gameOverScreen.style.display = 'none';

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

    // Limit standard projectiles (unless super power active)
    if (!isSuperProjectile && !activePowerUp && projectiles.length > MAX_SHOTS) return;

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

    let enemyGeometry, enemyMaterial;
    let initialScale = 1.0;
    let points = 100;

    // Geometry and material based on enemy type
    switch (enemyType) {
        case 'special':
            // Special enemy (red torus knot)
            enemyGeometry = new THREE.TorusKnotGeometry(1.2);
            enemyMaterial = new THREE.MeshPhongMaterial({
                color: 0xff0000,
                emissive: 0x880000,
                emissiveIntensity: 0.5,
                shininess: 30
            });
            initialScale = 1.2;
            points = 200;
            break;
        case 'slow':
            // Very slow enemy (blue cube)
            enemyGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            enemyMaterial = new THREE.MeshPhongMaterial({
                color: 0x0000ff,
                emissive: 0x000088,
                emissiveIntensity: 0.4,
                shininess: 25
            });
            points = 150;
            break;
        case 'bomber':
            // Bomb-dropping enemy (orange dodecahedron)
            enemyGeometry = new THREE.DodecahedronGeometry(1.2);
            enemyMaterial = new THREE.MeshPhongMaterial({
                color: 0xff8800,
                emissive: 0x884400,
                emissiveIntensity: 0.4,
                shininess: 25
            });
            points = 300;
            break;
        default:
            // Regular enemy (green torus)
            enemyGeometry = new THREE.TorusGeometry(1);
            enemyMaterial = new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                emissive: 0x008800,
                emissiveIntensity: 0.3,
                shininess: 20
            });
            break;
    }

    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);

    // Random lane
    const laneIndex = Math.floor(Math.random() * NUM_LANES);

    // Position depends on web type
    let x, y;
    let angle;

    angle = laneIndex * LANE_ANGLE_STEP;
    x = WEB_RADIUS * Math.cos(angle);
    y = WEB_RADIUS * Math.sin(angle);

    // Create a position vector
    const position = new THREE.Vector3(x, y, ENEMY_START_Z);

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
    const powerTypes = ['rapidFire', 'extraLife', 'shield', 'superProjectile'];
    const powerType = powerTypes[Math.floor(Math.random() * powerTypes.length)];

    // Create power-up object
    const powerGeometry = new THREE.SphereGeometry(0.8, 8, 8);

    // Color based on power-up type - using bright, distinct colors
    let powerColor;
    switch (powerType) {
        case 'rapidFire':
            powerColor = 0xFFD700;
            break; // Gold
        case 'extraLife':
            powerColor = 0x00FFAA;
            break; // Bright Teal
        case 'shield':
            powerColor = 0x00DDFF;
            break; // Bright Cyan
        case 'superProjectile':
            powerColor = 0xFF00CC;
            break; // Hot Pink
        default:
            powerColor = 0xFFFFFF; // White
    }

    const powerMaterial = new THREE.MeshPhongMaterial({
        color: powerColor,
        emissive: powerColor,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9,
        shininess: 50
    });

    const powerUp = new THREE.Mesh(powerGeometry, powerMaterial);

    // Position at enemy death location (passed in as argument)
    powerUp.position.copy(position);

    // Apply tunnel rotation to power-up orientation
    if (webMesh) {
        powerUp.rotation.x = webMesh.rotation.x;
        powerUp.rotation.y = webMesh.rotation.y;
    }

    // Store power-up properties
    powerUp.powerType = powerType;
    powerUp.rotationSpeed = 0.05;

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
function createExplosion(position, color) {
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
    sounds.play('explode');

    return explosionGroup;
}

// --- Apply Power-Up ---
function applyPowerUp(powerType) {
    // Clear any existing power-up
    if (activePowerUp) {
        clearTimeout(powerUpTimer);
    }

    activePowerUp = powerType;
    updatePowerUpUI();

    // Apply power-up effect
    switch (powerType) {
        case 'rapidFire':
            // Rapid fire handled in update loop
            break;
        case 'extraLife':
            lives++;
            updateLivesUI();
            activePowerUp = null; // Immediate effect
            break;
        case 'shield':
            // Shield is handled in collision detection
            break;
        case 'superProjectile':
            // Super projectiles handled in projectile creation and collision
            break;
    }

    // Set timeout to clear power-up after duration (except extraLife which is immediate)
    if (powerType !== 'extraLife') {
        powerUpTimer = setTimeout(() => {
            activePowerUp = null;
            updatePowerUpUI();
        }, POWER_UP_DURATION);
    }

    // Play power-up sound
    sounds.play('powerUp');
}

// --- Update Web Color ---
function updateWebColor(deltaTime) {
    if (!webMesh) return;

    // Update the hue value
    webColorHue = (webColorHue + webColorSpeed * deltaTime) % 360;

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
    if (keyState['ArrowUp']) {
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

    if (keyState['ArrowLeft']) {
        newLaneIndex = (playerCurrentLaneIndex + 1) % NUM_LANES;
        laneChangeAttempt = true;
    } else if (keyState['ArrowRight']) {
        newLaneIndex = (playerCurrentLaneIndex - 1 + NUM_LANES) % NUM_LANES;
        laneChangeAttempt = true;
    }

    if (laneChangeAttempt && currentFrame >= lastLaneChangeFrame + playerLaneChangeRate) {
        playerCurrentLaneIndex = newLaneIndex;
        updatePlayerPosition();
        lastLaneChangeFrame = currentFrame;
    }

    // Handle automatic firing for rapid fire power-up
    if (activePowerUp === 'rapidFire' && currentFrame % 12 === 0) {
        createProjectile();
    }

    // --- Update Projectiles ---
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];

        // Move projectile along its direction vector (accounting for tunnel rotation)
        if (projectile.direction) {
            projectile.position.x += projectile.direction.x * PROJECTILE_SPEED;
            projectile.position.y += projectile.direction.y * PROJECTILE_SPEED;
            projectile.position.z += projectile.direction.z * PROJECTILE_SPEED;
        } else {
            // Fallback for projectiles created before this update
            projectile.position.z -= PROJECTILE_SPEED;
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
        if (projectile.position.z < ENEMY_START_Z - 5) {
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
        enemy.scale.set(pulseScale, pulseScale, pulseScale);

        // Special rotation effects based on enemy type
        switch (enemy.enemyType) {
            case 'special':
                enemy.rotation.y += 0.03;
                enemy.rotation.x += 0.02;
                break;
            case 'bomber':
                enemy.rotation.x += 0.03;
                break;
            case 'slow':
                enemy.rotation.y += 0.01;
                break;
        }

        // Check if enemy reached the player's end
        if (enemy.position.z > ENEMY_END_Z) {
            // Player loses a life if not shielded
            if (activePowerUp !== 'shield') {
                loseLife();
            } else {
                // Shield absorbs one hit
                activePowerUp = null;
                updatePowerUpUI();
                clearTimeout(powerUpTimer);

                // Visual effect for shield hit
                createExplosion(enemy.position, 0x0088ff);
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

        // Rotate power-up
        powerUp.rotation.y += powerUp.rotationSpeed;
        powerUp.rotation.x += powerUp.rotationSpeed * 0.7;

        // Pulsate size
        const pulseScale = 1 + 0.1 * Math.sin(performance.now() * 0.005);
        powerUp.scale.set(pulseScale, pulseScale, pulseScale);

        // Check if power-up is collected
        if (powerUp.position.z > PLAYER_Z - 1 &&
          Math.abs(powerUp.position.x - player.position.x) < 2 &&
          Math.abs(powerUp.position.y - player.position.y) < 2) {

            // Collect power-up
            applyPowerUp(powerUp.powerType);

            // Remove power-up
            scene.remove(powerUp);
            powerUps.splice(i, 1);
        }

        // Remove if past player
        if (powerUp.position.z > PLAYER_Z + 5) {
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
              Math.abs(projectile.position.z - enemy.position.z) < COLLISION_Z_TOLERANCE) {

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
                else if (Math.random() < POWER_UP_CHANCE || enemy.enemyType === 'special') {
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
    createExplosion(player.position, 0xff0000);

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
    finalScoreUI.textContent = 'FINAL SCORE: ' + score;
    finalHighScoreUI.textContent = 'HIGH SCORE: ' + highScore;

    // Check if player's score qualifies for the leaderboard
    const isLeaderboardScore = checkHighScore(score);

    // Show high score form if it's a new high score
    if (highScoreForm) {
        highScoreForm.style.display = isLeaderboardScore ? 'block' : 'none';

        if (isLeaderboardScore && playerInitialsInput) {
            // Focus on the input field and select any existing text
            setTimeout(() => {
                playerInitialsInput.focus();
                playerInitialsInput.select();
            }, 300);
        }
    }

    // Update and display the leaderboard
    renderLeaderboard();
    if (leaderboardContainer) {
        leaderboardContainer.style.display = 'block';
    }

    // Show game over screen
    gameOverScreen.style.display = 'block';
    uiElement.style.display = 'none';
    document.getElementById('power-ups').style.display = 'none';
    document.getElementById('level-indicator').style.display = 'none';

    // Clear game objects
    clearGameObjects();

    // Hide player
    player.visible = false;

    // Play game over sound
    sounds.play('explode');

    // Clear power-up timer
    if (activePowerUp) {
        clearTimeout(powerUpTimer);
        activePowerUp = null;
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

    // Clear power-up timer
    if (activePowerUp) {
        clearTimeout(powerUpTimer);
        activePowerUp = null;
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
    const currentMilestone = Math.floor(score / BOMB_POINTS);
    if (currentMilestone > lastBombMilestone) {
        // Award a new bomb for each milestone passed
        const newBombs = currentMilestone - lastBombMilestone;

        // Add bombs, but don't exceed the maximum of 30000000
        bombs = Math.min(bombs + newBombs, 30);

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
    scoreUI.textContent = 'SCORE: ' + score;
}

function updateHighScoreUI() {
    highScoreUI.textContent = 'HIGH SCORE: ' + highScore;
}

function updateLivesUI() {
    livesUI.textContent = 'LIVES: ' + lives;
}

function updateLevelUI() {
    levelUI.textContent = 'LEVEL: ' + level;
}

function updatePowerUpUI() {
    let powerText = 'POWER: ';

    switch (activePowerUp) {
        case 'rapidFire':
            powerText += 'RAPID FIRE';
            break;
        case 'shield':
            powerText += 'SHIELD';
            break;
        case 'superProjectile':
            powerText += 'SUPER SHOT';
            break;
        default:
            powerText += 'NONE';
    }

    powerUpUI.textContent = powerText;
}

function updateBombsUI() {
    bombsUI.textContent = '💣: ' + bombs;
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
            updateCountdown(deltaTime);
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
    keyState[event.key] = true;

    // Handle firing
    if (gameState === 'playing' && event.key === ' ') {
        // Create super projectile if power-up is active
        createProjectile(activePowerUp === 'superProjectile');
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
            pauseScreen.style.display = isPaused ? 'block' : 'none';
            menuElement.style.display = isPaused ? 'block' : 'none';
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
    keyState[event.key] = false;
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
    const selectedSpeed = speedSelect.value;
    const selectedDifficulty = difficultySelect.value;
    const selectedWebType = webTypeSelect.value;
    const selectedTubeWidth = tubeWidthSelect.value;
    const selectedLives = livesSelect.value;

    // Apply settings
    setGameSettings(selectedSpeed, selectedDifficulty, selectedWebType, selectedTubeWidth, selectedLives);

    // Recreate the web if the web type has changed
    if (webType !== selectedWebType) {
        createWeb(selectedWebType);
        // Reset player position after new web creation
        playerCurrentLaneIndex = Math.floor(NUM_LANES / 2);
        updatePlayerPosition();
    }
}

// --- Setup Audio Initialization on User Interaction ---
// Add event listeners to initialize audio on first user interaction
const initAudioOnInteraction = async (event) => {
    console.log('User interaction detected, initializing audio...');

    // First, directly try to resume the audio context if it exists
    if (window.audioWorkletManager && window.audioWorkletManager.audioContext) {
        try {
            console.log('AudioContext exists, attempting to resume directly after user interaction');
            const state = window.audioWorkletManager.audioContext.state;
            console.log('Current AudioContext state:', state);

            if (state === 'suspended') {
                await window.audioWorkletManager.audioContext.resume();
                console.log('AudioContext resumed directly, new state:', window.audioWorkletManager.audioContext.state);
            }
        } catch (error) {
            console.error('Failed to resume AudioContext directly:', error);
        }
    } else {
        console.log('AudioWorkletManager or AudioContext not available yet');
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
                console.log('Played silent sound to unblock audio');
            }
        }
    } catch (error) {
        console.error('Failed to play silent sound:', error);
    }

    // Remove the event listeners once audio is initialized
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('keydown', initAudioOnInteraction);
    document.removeEventListener('touchstart', initAudioOnInteraction);

    console.log('Audio initialization complete, removed event listeners');
};

// Add event listeners for common user interactions
document.addEventListener('click', initAudioOnInteraction);
document.addEventListener('keydown', initAudioOnInteraction);
document.addEventListener('touchstart', initAudioOnInteraction);

// Function to change ship type during gameplay
function changeShipType(newShipType) {
    if (newShipType && newShipType !== shipType) {
        console.log(`Changing ship from ${shipType} to ${newShipType}`);
        shipType = newShipType;

        // Update dropdown in case this was called programmatically
        if (shipSelect.value !== newShipType) {
            shipSelect.value = newShipType;
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

// Load leaderboard from localStorage
// Load leaderboard from API with localStorage fallback
async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error('Failed to fetch leaderboard');

        const data = await response.json();
        leaderboard = data;

        // Cache in localStorage as backup
        try {
            localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(leaderboard));
        } catch (storageError) {
            console.error('Error saving to localStorage:', storageError);
        }
    } catch (e) {
        console.error('Failed to load leaderboard from API:', e);

        // Fall back to local storage if API is unavailable
        try {
            const savedLeaderboard = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
            if (savedLeaderboard) {
                leaderboard = JSON.parse(savedLeaderboard);
            } else {
                // Initialize with default values if nothing exists
                leaderboard = [
                    {initials: 'CPU', score: 5000},
                    {initials: 'BOT', score: 4000},
                    {initials: 'AI', score: 3000},
                    {initials: 'PRO', score: 2000},
                    {initials: 'MAX', score: 1000}
                ];
                // Save defaults to localStorage
                localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(leaderboard));
            }
        } catch (storageError) {
            console.error('Error accessing localStorage:', storageError);
            leaderboard = [];
        }
    }
}

// Save leaderboard to localStorage (used as a backup)
function saveLeaderboard() {
    try {
        localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(leaderboard));
    } catch (e) {
        console.error('Failed to save leaderboard to localStorage:', e);
    }
}

// Check if the current score qualifies for the leaderboard
function checkHighScore(currentScore) {
    // No entries yet or score is higher than the lowest score
    if (leaderboard.length < 10 || currentScore > leaderboard[leaderboard.length - 1].score) {
        // Find where to insert the new score
        newScoreRank = 0;
        while (newScoreRank < leaderboard.length && leaderboard[newScoreRank].score >= currentScore) {
            newScoreRank++;
        }

        isNewHighScore = true;
        return true;
    }

    isNewHighScore = false;
    return false;
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
            // Update local leaderboard with the one from the server
            leaderboard = result.leaderboard;

            // Highlight the new score
            if (result.rank !== null) {
                newScoreRank = result.rank;
                isNewHighScore = true;
            }

            // Update the UI
            renderLeaderboard();

            // Also update local storage as backup
            saveLeaderboard();

            return true;
        } else {
            console.error('Failed to submit score:', result.message);
            return false;
        }
    } catch (e) {
        console.error('Error submitting score to API:', e);

        // Fall back to local storage if API is unavailable
        // Insert the new score at the correct position
        leaderboard.splice(newScoreRank, 0, {
            initials: formattedInitials,
            score: currentScore
        });

        // Keep only the top 10 scores
        if (leaderboard.length > 10) {
            leaderboard = leaderboard.slice(0, 10);
        }

        // Save to local storage as backup
        saveLeaderboard();

        // Update the UI
        renderLeaderboard();

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

    // Add table rows
    leaderboard.forEach((entry, index) => {
        const isHighlighted = (isNewHighScore && index === newScoreRank) ? 'highlight' : '';
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
    if (leaderboardModal) {
        renderLeaderboard(modalLeaderboardTable);
        leaderboardModal.style.display = 'block';
    }
}

// Hide the leaderboard modal
function hideLeaderboard() {
    if (leaderboardModal) {
        leaderboardModal.style.display = 'none';
    }
}

// Handle score submission
async function handleScoreSubmit() {
    if (playerInitialsInput && isNewHighScore) {
        const initials = playerInitialsInput.value.trim();
        if (initials) {
            // Disable submit button during submission
            if (submitScoreButton) {
                submitScoreButton.disabled = true;
                submitScoreButton.textContent = 'SENDING...';
            }

            try {
                // Add score to leaderboard (async)
                const success = await addScoreToLeaderboard(initials, score);

                if (success) {
                    // Hide form and reset
                    highScoreForm.style.display = 'none';
                    playerInitialsInput.value = '';
                    isNewHighScore = false;

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
                if (submitScoreButton) {
                    submitScoreButton.disabled = false;
                    submitScoreButton.textContent = 'SUBMIT';
                }
            }
        } else {
            // Flash the input if empty
            playerInitialsInput.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
            setTimeout(() => {
                playerInitialsInput.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }, 300);
        }
    }
}

// --- Start the Game ---
init();
