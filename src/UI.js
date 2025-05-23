// UI.js - Handle DOM manipulation and UI updates

export class UI {
  constructor() {
    this.elements = this.initializeElements();
  }

  // Initialize all DOM element references
  initializeElements() {
    return {
      // Main UI elements
      ui: document.getElementById('ui'),
      score: document.getElementById('score'),
      highScore: document.getElementById('high-score'),
      lives: document.getElementById('lives'),
      bombs: document.getElementById('bombs'),
      shields: document.getElementById('shields'),
      level: document.getElementById('current-level'),
      
      // Screen elements
      pauseScreen: document.getElementById('pause-screen'),
      gameOverScreen: document.getElementById('game-over'),
      finalScore: document.getElementById('final-score'),
      finalHighScore: document.getElementById('final-high-score'),
      levelComplete: document.getElementById('level-complete'),
      levelScore: document.getElementById('level-score'),
      levelHighScore: document.getElementById('level-high-score'),
      
      // Menu elements
      menu: document.getElementById('menu'),
      startButton: document.getElementById('start-button'),
      restartButton: document.getElementById('restart-button'),
      replayButton: document.getElementById('replay-button'),
      nextLevelButton: document.getElementById('next-level-button'),
      
      // Settings elements
      speedSelect: document.getElementById('speed-select'),
      difficultySelect: document.getElementById('difficulty-select'),
      webTypeSelect: document.getElementById('web-type-select'),
      tubeWidthSelect: document.getElementById('tube-width-select'),
      livesSelect: document.getElementById('lives-select'),
      shipSelect: document.getElementById('ship-select'),
      soundToggle: document.getElementById('sound-toggle'),
      fullscreenToggle: document.getElementById('fullscreen-toggle'),
      
      // Game control buttons
      gameSoundToggle: document.getElementById('game-sound-toggle'),
      gameFullscreenToggle: document.getElementById('game-fullscreen-toggle'),
      
      // Leaderboard elements
      leaderboardContainer: document.getElementById('leaderboard-container'),
      leaderboardTable: document.getElementById('leaderboard-table'),
      modalLeaderboardTable: document.getElementById('modal-leaderboard-table'),
      leaderboardModal: document.getElementById('leaderboard-modal'),
      showLeaderboardButton: document.getElementById('show-leaderboard-button'),
      closeLeaderboardButton: document.getElementById('close-leaderboard-button'),
      
      // High score form elements
      highScoreForm: document.getElementById('high-score-form'),
      playerInitials: document.getElementById('player-initials'),
      submitScore: document.getElementById('submit-score'),
      
      // Mobile controls
      mobileControls: document.getElementById('mobile-controls'),
      leftButton: document.getElementById('left-button'),
      rightButton: document.getElementById('right-button'),
      fireButton: document.getElementById('fire-button'),
      bombButton: document.getElementById('bomb-button'),
      
      // Instructions
      instructionsModal: document.getElementById('instructions-modal'),
      closeInstructionsButton: document.getElementById('close-instructions-button'),
      
      // FPS display
      fpsDisplay: document.getElementById('fps-display')
    };
  }

  // --- Game UI Updates ---
  
  updateScore(score) {
    if (this.elements.score) {
      this.elements.score.textContent = `SCORE: ${score.toLocaleString()}`;
    }
  }

  updateHighScore(highScore) {
    if (this.elements.highScore) {
      this.elements.highScore.textContent = `HIGH SCORE: ${highScore.toLocaleString()}`;
    }
  }

  updateLives(lives) {
    if (this.elements.lives) {
      this.elements.lives.textContent = `❤️: ${lives}`;
    }
  }

  updateBombs(bombs) {
    if (this.elements.bombs) {
      this.elements.bombs.textContent = `💣: ${bombs}`;
    }
  }

  updateShields(shields) {
    if (this.elements.shields) {
      this.elements.shields.textContent = `🛡️: ${shields}`;
    }
  }

  updateLevel(level) {
    if (this.elements.level) {
      this.elements.level.textContent = `LEVEL: ${level}`;
    }
  }

  updateFPS(fps) {
    if (this.elements.fpsDisplay) {
      this.elements.fpsDisplay.textContent = `FPS: ${Math.round(fps)}`;
    }
  }

  // --- Screen Management ---
  
  showScreen(screenName) {
    this.hideAllScreens();
    
    const screen = this.elements[screenName];
    if (screen) {
      screen.style.display = 'block';
    }
  }

  hideScreen(screenName) {
    const screen = this.elements[screenName];
    if (screen) {
      screen.style.display = 'none';
    }
  }

  hideAllScreens() {
    const screens = ['menu', 'ui', 'pauseScreen', 'gameOverScreen', 'levelComplete'];
    screens.forEach(screen => this.hideScreen(screen));
  }

  showMenu() {
    this.showScreen('menu');
    this.hideScreen('ui');
  }

  showGame() {
    this.hideScreen('menu');
    this.showScreen('ui');
  }

  showPauseScreen() {
    this.showScreen('pauseScreen');
  }

  hidePauseScreen() {
    this.hideScreen('pauseScreen');
  }

  showGameOver(score, highScore, isNewHighScore = false) {
    this.showScreen('gameOverScreen');
    this.hideScreen('ui');
    
    if (this.elements.finalScore) {
      this.elements.finalScore.textContent = `FINAL SCORE: ${score.toLocaleString()}`;
    }
    
    if (this.elements.finalHighScore) {
      this.elements.finalHighScore.textContent = `HIGH SCORE: ${highScore.toLocaleString()}`;
    }
    
    // Show/hide high score form based on whether it's a new high score
    if (this.elements.highScoreForm) {
      this.elements.highScoreForm.style.display = isNewHighScore ? 'block' : 'none';
    }
  }

  showLevelComplete(score, highScore) {
    this.showScreen('levelComplete');
    
    if (this.elements.levelScore) {
      this.elements.levelScore.textContent = `SCORE: ${score.toLocaleString()}`;
    }
    
    if (this.elements.levelHighScore) {
      this.elements.levelHighScore.textContent = `HIGH SCORE: ${highScore.toLocaleString()}`;
    }
  }

  // --- Leaderboard Management ---
  
  showLeaderboardModal() {
    if (this.elements.leaderboardModal) {
      this.elements.leaderboardModal.style.display = 'block';
    }
  }

  hideLeaderboardModal() {
    if (this.elements.leaderboardModal) {
      this.elements.leaderboardModal.style.display = 'none';
    }
  }

  updateLeaderboard(leaderboardHTML, isModal = false) {
    const targetElement = isModal ? this.elements.modalLeaderboardTable : this.elements.leaderboardTable;
    if (targetElement) {
      targetElement.innerHTML = leaderboardHTML;
    }
  }

  // --- Settings Management ---
  
  updateSoundToggleButton(isSoundEnabled) {
    if (this.elements.soundToggle) {
      this.elements.soundToggle.textContent = isSoundEnabled ? 'ON' : 'OFF';
      this.elements.soundToggle.classList.toggle('active', isSoundEnabled);
    }
    
    if (this.elements.gameSoundToggle) {
      this.elements.gameSoundToggle.textContent = isSoundEnabled ? 'S' : 'S';
      this.elements.gameSoundToggle.classList.toggle('active', isSoundEnabled);
    }
  }

  updateFullscreenToggleButton(isFullscreen) {
    if (this.elements.fullscreenToggle) {
      this.elements.fullscreenToggle.textContent = isFullscreen ? 'ON' : 'OFF';
      this.elements.fullscreenToggle.classList.toggle('active', isFullscreen);
    }
    
    if (this.elements.gameFullscreenToggle) {
      this.elements.gameFullscreenToggle.textContent = isFullscreen ? 'F' : 'F';
      this.elements.gameFullscreenToggle.classList.toggle('active', isFullscreen);
    }
  }

  updateStartButtonText(gameState) {
    if (this.elements.startButton) {
      switch (gameState) {
        case 'paused':
          this.elements.startButton.textContent = 'RESUME GAME';
          break;
        case 'playing':
          this.elements.startButton.textContent = 'GAME IN PROGRESS';
          break;
        default:
          this.elements.startButton.textContent = 'START GAME';
      }
    }
  }

  // --- Form Management ---
  
  getPlayerInitials() {
    return this.elements.playerInitials ? this.elements.playerInitials.value.trim() : '';
  }

  setPlayerInitials(value) {
    if (this.elements.playerInitials) {
      this.elements.playerInitials.value = value;
    }
  }

  focusPlayerInitials() {
    if (this.elements.playerInitials) {
      this.elements.playerInitials.focus();
      this.elements.playerInitials.select();
    }
  }

  // --- Settings Values ---
  
  getSelectedValues() {
    return {
      speed: this.elements.speedSelect?.value || 'normal',
      difficulty: this.elements.difficultySelect?.value || 'medium',
      webType: this.elements.webTypeSelect?.value || 'circle',
      tubeWidth: this.elements.tubeWidthSelect?.value || 'large',
      lives: parseInt(this.elements.livesSelect?.value || '3'),
      shipType: this.elements.shipSelect?.value || 'classic'
    };
  }

  setSelectedValues(values) {
    if (values.speed && this.elements.speedSelect) {
      this.elements.speedSelect.value = values.speed;
    }
    if (values.difficulty && this.elements.difficultySelect) {
      this.elements.difficultySelect.value = values.difficulty;
    }
    if (values.webType && this.elements.webTypeSelect) {
      this.elements.webTypeSelect.value = values.webType;
    }
    if (values.tubeWidth && this.elements.tubeWidthSelect) {
      this.elements.tubeWidthSelect.value = values.tubeWidth;
    }
    if (values.lives && this.elements.livesSelect) {
      this.elements.livesSelect.value = values.lives.toString();
    }
    if (values.shipType && this.elements.shipSelect) {
      this.elements.shipSelect.value = values.shipType;
    }
  }

  // --- Mobile Controls ---
  
  showMobileControls() {
    if (this.elements.mobileControls) {
      this.elements.mobileControls.style.display = 'flex';
    }
  }

  hideMobileControls() {
    if (this.elements.mobileControls) {
      this.elements.mobileControls.style.display = 'none';
    }
  }

  // --- Instructions Modal ---
  
  showInstructionsModal() {
    if (this.elements.instructionsModal) {
      this.elements.instructionsModal.style.display = 'block';
    }
  }

  hideInstructionsModal() {
    if (this.elements.instructionsModal) {
      this.elements.instructionsModal.style.display = 'none';
    }
  }

  // --- Utility Methods ---
  
  addClickListener(elementName, callback) {
    const element = this.elements[elementName];
    if (element) {
      element.addEventListener('click', callback);
    }
  }

  addChangeListener(elementName, callback) {
    const element = this.elements[elementName];
    if (element) {
      element.addEventListener('change', callback);
    }
  }

  addClass(elementName, className) {
    const element = this.elements[elementName];
    if (element) {
      element.classList.add(className);
    }
  }

  removeClass(elementName, className) {
    const element = this.elements[elementName];
    if (element) {
      element.classList.remove(className);
    }
  }

  toggleClass(elementName, className) {
    const element = this.elements[elementName];
    if (element) {
      element.classList.toggle(className);
    }
  }

  // Check if element exists
  hasElement(elementName) {
    return !!this.elements[elementName];
  }

  // Get element directly
  getElement(elementName) {
    return this.elements[elementName];
  }
}