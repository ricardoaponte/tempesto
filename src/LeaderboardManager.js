// LeaderboardManager.js - Handle leaderboard operations and API integration

import { PersistenceManager } from './PersistenceManager.js';

export class LeaderboardManager {
  constructor() {
    this.persistenceManager = new PersistenceManager();
    this.leaderboard = [];
    this.isNewHighScore = false;
    this.newScoreRank = -1;
    this.apiUrl = '/api/leaderboard';
  }

  // Load leaderboard from API with localStorage fallback
  async loadLeaderboard() {
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const data = await response.json();
      this.leaderboard = data;

      // Cache in localStorage as backup
      this.persistenceManager.saveLeaderboard(this.leaderboard);
      
      return this.leaderboard;
    } catch (e) {
      console.error('Failed to load leaderboard from API:', e);

      // Fall back to local storage if API is unavailable
      const savedLeaderboard = this.persistenceManager.loadLeaderboard();
      
      if (savedLeaderboard && savedLeaderboard.length > 0) {
        this.leaderboard = savedLeaderboard;
      } else {
        // Initialize with default values if nothing exists
        this.leaderboard = this.getDefaultLeaderboard();
        this.persistenceManager.saveLeaderboard(this.leaderboard);
      }
      
      return this.leaderboard;
    }
  }

  // Get default leaderboard entries
  getDefaultLeaderboard() {
    return [
      { initials: 'CPU', score: 5000 },
      { initials: 'BOT', score: 4000 },
      { initials: 'AI', score: 3000 },
      { initials: 'PRO', score: 2000 },
      { initials: 'MAX', score: 1000 }
    ];
  }

  // Save leaderboard to localStorage (used as a backup)
  saveLeaderboard() {
    this.persistenceManager.saveLeaderboard(this.leaderboard);
  }

  // Check if the current score qualifies for the leaderboard
  checkHighScore(currentScore) {
    // No entries yet or score is higher than the lowest score
    if (this.leaderboard.length < 10 || currentScore > this.leaderboard[this.leaderboard.length - 1].score) {
      // Find where to insert the new score
      this.newScoreRank = 0;
      while (this.newScoreRank < this.leaderboard.length && this.leaderboard[this.newScoreRank].score >= currentScore) {
        this.newScoreRank++;
      }

      this.isNewHighScore = true;
      return true;
    }

    this.isNewHighScore = false;
    return false;
  }

  // Add a new score to the leaderboard via API
  async addScoreToLeaderboard(initials, currentScore) {
    const formattedInitials = initials.toUpperCase().substring(0, 3);

    try {
      const response = await fetch(this.apiUrl, {
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
        this.leaderboard = result.leaderboard;
        
        // Update rank based on server response
        if (result.rank !== null && result.rank !== undefined) {
          this.newScoreRank = result.rank;
        }

        // Save updated leaderboard to localStorage
        this.saveLeaderboard();

        return {
          success: true,
          rank: this.newScoreRank,
          leaderboard: this.leaderboard
        };
      } else {
        throw new Error(result.message || 'Failed to add score');
      }
    } catch (e) {
      console.error('Failed to add score to API leaderboard:', e);

      // Fall back to local leaderboard management
      return this.addScoreLocally(formattedInitials, currentScore);
    }
  }

  // Add score to local leaderboard (fallback)
  addScoreLocally(initials, currentScore) {
    try {
      // Add the new score
      this.leaderboard.push({ initials, score: currentScore });

      // Sort by score (descending)
      this.leaderboard.sort((a, b) => b.score - a.score);

      // Keep only top 10
      this.leaderboard = this.leaderboard.slice(0, 10);

      // Find the rank of the new score
      this.newScoreRank = this.leaderboard.findIndex(entry =>
        entry.initials === initials && entry.score === currentScore
      );

      // Save to localStorage
      this.saveLeaderboard();

      return {
        success: true,
        rank: this.newScoreRank,
        leaderboard: this.leaderboard
      };
    } catch (e) {
      console.error('Failed to add score locally:', e);
      return {
        success: false,
        error: e.message
      };
    }
  }

  // Generate leaderboard HTML
  generateLeaderboardHTML() {
    if (!this.leaderboard || this.leaderboard.length === 0) {
      return '<div class="no-scores">No scores yet!</div>';
    }

    let html = '<table class="leaderboard-table">';
    html += '<thead><tr><th>Rank</th><th>Initials</th><th>Score</th></tr></thead>';
    html += '<tbody>';

    this.leaderboard.forEach((entry, index) => {
      const isNewScore = this.isNewHighScore && index === this.newScoreRank;
      const rowClass = isNewScore ? 'new-score' : '';
      
      html += `<tr class="${rowClass}">`;
      html += `<td>${index + 1}</td>`;
      html += `<td>${entry.initials}</td>`;
      html += `<td>${entry.score.toLocaleString()}</td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // Display leaderboard in specified container
  displayLeaderboard(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = this.generateLeaderboardHTML();
    }
  }

  // Get current leaderboard data
  getLeaderboard() {
    return this.leaderboard;
  }

  // Get high score status
  getHighScoreStatus() {
    return {
      isNewHighScore: this.isNewHighScore,
      rank: this.newScoreRank
    };
  }

  // Reset high score status
  resetHighScoreStatus() {
    this.isNewHighScore = false;
    this.newScoreRank = -1;
  }

  // Check if score qualifies for top 10
  qualifiesForLeaderboard(score) {
    return this.leaderboard.length < 10 || score > this.leaderboard[this.leaderboard.length - 1].score;
  }

  // Get minimum qualifying score
  getMinimumQualifyingScore() {
    if (this.leaderboard.length < 10) {
      return 0;
    }
    return this.leaderboard[this.leaderboard.length - 1].score;
  }

  // Clear leaderboard (for testing/debugging)
  clearLeaderboard() {
    this.leaderboard = [];
    this.persistenceManager.clearKey(this.persistenceManager.storageKeys.LEADERBOARD);
    this.resetHighScoreStatus();
  }
}