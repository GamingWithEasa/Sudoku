// Main Sudoku Game Script

document.addEventListener('DOMContentLoaded', () => {
  // Game state
  let difficulty = 'easy';
  let board = [];
  let initialBoard = [];
  let solution = [];
  let selectedCell = null;
  let conflicts = [];
  let gameStatus = 'playing';
  let completedNumbers = [];
  let hintsUsed = 0;
  let mistakesCount = 0;
  let showCompletionAnimation = null;
  let moveHistory = [];
  let selectedNumber = null;
  let gameId = Math.random().toString(36).substring(2, 15);
  let currentTime = 0;
  let gameCompleted = false;
  let isGenerating = false;
  let generationError = null;
  let timerInterval = null;
  let timerStartTime = null;
  let timerPausedTime = 0;
  let timerIsRunning = false;

  // DOM elements
  const sudokuBoard = document.querySelector('.sudoku-board');
  const numberControls = document.querySelector('.number-controls');
  const difficultyTabs = document.querySelectorAll('.tab');
  const resetBtn = document.querySelector('.reset-btn');
  const undoBtn = document.querySelector('.undo-btn');
  const hintBtn = document.querySelector('.hint-btn');
  const newGameBtn = document.querySelector('.new-game-btn');
  const timerDisplay = document.querySelector('.timer-display');
  const timerToggle = document.querySelector('.timer-toggle');
  const mistakesCounter = document.querySelector('.mistakes-counter span');
  const loadingAlert = document.querySelector('.loading-alert');
  const errorAlert = document.querySelector('.error-alert');
  const errorMessage = document.querySelector('.error-message');
  const successAlert = document.querySelector('.success-alert');
  const successMessage = document.querySelector('.success-message');
  const conflictAlert = document.querySelector('.conflict-alert');
  const statsBtn = document.querySelector('.stats-btn');
  const statsModal = document.querySelector('.stats-modal');
  const closeModal = document.querySelector('.close-modal');
  const statsTabs = document.querySelectorAll('.stats-tab');
  const statsTabContents = document.querySelectorAll('.stats-tab-content');
  const difficultyStatsTabs = document.querySelectorAll('.difficulty-tab');
  const statsGrid = document.querySelector('.stats-grid');
  const leaderboardList = document.querySelector('.leaderboard-list');
  const resetStatsBtn = document.querySelector('.reset-stats-btn');
  const themeToggle = document.querySelector('.theme-toggle');
  const hintCount = document.querySelector('.hint-count');
  const confettiCanvas = document.getElementById('confetti-canvas');
  const confettiInstance = confetti.create(confettiCanvas, { resize: true, useWorker: true });

  // Initialize the game
  initGame();

  // Set up event listeners
  setupEventListeners();

  // Initialize the game
  function initGame() {
    // Check for dark mode preference
    if (localStorage.getItem('sudoku-theme') === 'dark' || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('sudoku-theme'))) {
      document.body.classList.add('dark');
    }

    // Start a new game
    startNewGame();

    // Create number controls
    createNumberControls();
  }

  // Set up event listeners
  function setupEventListeners() {
    // Difficulty tabs
    difficultyTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        difficultyTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        difficulty = tab.dataset.difficulty;
        startNewGame();
      });
    });

    // Game controls
    resetBtn.addEventListener('click', resetGame);
    undoBtn.addEventListener('click', undoMove);
    hintBtn.addEventListener('click', giveHint);
    newGameBtn.addEventListener('click', startNewGame);

    // Timer toggle
    timerToggle.addEventListener('click', toggleTimer);

    // Stats button
    statsBtn.addEventListener('click', () => {
      updateStatsDisplay();
      statsModal.classList.add('active');
    });

    // Close modal
    closeModal.addEventListener('click', () => {
      statsModal.classList.remove('active');
    });

    // Stats tabs
    statsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        statsTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        statsTabContents.forEach(content => content.classList.remove('active'));
        document.querySelector(`.${tab.dataset.tab}-panel`).classList.add('active');
      });
    });

    // Difficulty stats tabs
    difficultyStatsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabGroup = tab.closest('.difficulty-tabs');
        tabGroup.querySelectorAll('.difficulty-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update the stats or leaderboard display
        if (tabGroup.closest('.stats-panel')) {
          updateStatsGrid(tab.dataset.difficulty);
        } else if (tabGroup.closest('.leaderboard-panel')) {
          updateLeaderboardDisplay(tab.dataset.difficulty);
        }
      });
    });

    // Reset stats button
    resetStatsBtn.addEventListener('click', resetStats);

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Keyboard events
    document.addEventListener('keydown', handleKeyDown);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === statsModal) {
        statsModal.classList.remove('active');
      }
    });
  }

  // Start a new game
  function startNewGame() {
    try {
      isGenerating = true;
      generationError = null;
      mistakesCount = 0;
      showLoadingAlert();
      hideAllAlerts();

      // Reset timer
      resetTimer();
      
      // Generate puzzle in a non-blocking way
      setTimeout(() => {
        try {
          const result = generateSudoku(difficulty);

          // Validate the generated puzzle
          if (!result.puzzle || !result.solution) {
            throw new Error('Failed to generate valid puzzle');
          }

          // Check if the puzzle is solvable
          const conflicts = checkSolution(result.puzzle);
          if (conflicts.length > 0) {
            throw new Error('Generated puzzle has conflicts');
          }

          board = JSON.parse(JSON.stringify(result.puzzle));
          initialBoard = JSON.parse(JSON.stringify(result.puzzle));
          solution = result.solution;
          selectedCell = null;
          selectedNumber = null;
          conflicts = [];
          gameStatus = 'playing';
          completedNumbers = [];
          hintsUsed = 0;
          showCompletionAnimation = null;
          moveHistory = [];
          gameId = Math.random().toString(36).substring(2, 15);
          gameCompleted = false;
          isGenerating = false;
          
          // Update UI
          renderBoard();
          updateNumberControls();
          updateMistakesCounter();
          updateHintCount();
          hideAllAlerts();
          
          // Start timer
          startTimer();
        } catch (error) {
          console.error('Error generating puzzle:', error);
          generationError = error instanceof Error ? error.message : 'Unknown error generating puzzle';
          showErrorAlert(generationError);
          isGenerating = false;

          // Try again with fallback
          setTimeout(() => {
            startNewGame();
          }, 500);
        }
      }, 0);
    } catch (error) {
      isGenerating = false;
      generationError = error instanceof Error ? error.message : 'Unknown error generating puzzle';
      showErrorAlert(generationError);
      console.error('Error in startNewGame:', error);
    }
  }

  // Reset the current game
  function resetGame() {
    board = JSON.parse(JSON.stringify(initialBoard));
    selectedCell = null;
    selectedNumber = null;
    conflicts = [];
    gameStatus = 'playing';
    completedNumbers = [];
    hintsUsed = 0;
    mistakesCount = 0;
    showCompletionAnimation = null;
    moveHistory = [];
    gameCompleted = false;
    
    // Update UI
    renderBoard();
    updateNumberControls();
    updateMistakesCounter();
    updateHintCount();
    hideAllAlerts();
    
    // Reset timer
    resetTimer();
    startTimer();
  }

  // Create the Sudoku board
  function renderBoard() {
    sudokuBoard.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        
        // Add border classes
        if ((col + 1) % 3 === 0 && col < 8) {
          cell.classList.add('border-right');
        }
        if ((row + 1) % 3 === 0 && row < 8) {
          cell.classList.add('border-bottom');
        }
        
        // Add cell value
        if (board[row][col] !== 0) {
          cell.textContent = board[row][col];
        }
        
        // Add classes based on cell state
        if (isFixed(row, col)) {
          cell.classList.add('fixed');
        }
        
        if (hasConflict(row, col)) {
          cell.classList.add('conflict');
        }
        
        if (isSelected(row, col)) {
          cell.classList.add('selected');
        }
        
        if (hasSameNumber(row, col)) {
          cell.classList.add('same-number');
        }
        
        if (isRelatedToSelected(row, col)) {
          cell.classList.add('related');
        }
        
        if (isCompletedNumber(row, col)) {
          cell.classList.add('completed');
        }
        
        // Add click event
        cell.addEventListener('click', () => handleCellSelect(row, col));
        
        sudokuBoard.appendChild(cell);
      }
    }
  }

  // Create number controls
  function createNumberControls() {
    numberControls.innerHTML = '';
    
    for (let num = 1; num <= 9; num++) {
      const container = document.createElement('div');
      container.className = 'number-btn-container';
      
      const button = document.createElement('button');
      button.className = 'number-btn';
      button.textContent = num;
      button.dataset.number = num;
      button.addEventListener('click', () => handleNumberInput(num));
      
      const count = document.createElement('div');
      count.className = 'number-count';
      count.textContent = '0/9';
      
      container.appendChild(button);
      container.appendChild(count);
      numberControls.appendChild(container);
    }
  }

  // Update number controls
  function updateNumberControls() {
    // Count occurrences of each number
    const numberCounts = Array(10).fill(0);
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const num = board[row][col];
        if (num > 0) {
          numberCounts[num]++;
        }
      }
    }
    
    // Update number buttons
    for (let num = 1; num <= 9; num++) {
      const button = document.querySelector(`.number-btn[data-number="${num}"]`);
      const count = button.parentElement.querySelector('.number-count');
      
      // Update count
      count.textContent = `${numberCounts[num]}/9`;
      
      // Update button classes
      button.classList.remove('selected', 'completed');
      
      if (completedNumbers.includes(num)) {
        button.classList.add('completed');
      } else if (selectedNumber === num) {
        button.classList.add('selected');
      }
      
      // Add animation if needed
      if (showCompletionAnimation === num) {
        button.classList.add('animate');
        setTimeout(() => {
          button.classList.remove('animate');
        }, 1000);
      }
    }
  }

  // Handle cell selection
  function handleCellSelect(row, col) {
    selectedCell = [row, col];
    // Set the selected number to the number in the cell (if any)
    selectedNumber = board[row][col] !== 0 ? board[row][col] : null;
    
    renderBoard();
    updateNumberControls();
  }

  // Handle number input
  function handleNumberInput(num) {
    if (!selectedCell) {
      // If no cell is selected, just highlight all cells with this number
      selectedNumber = num === selectedNumber ? null : num;
      renderBoard();
      updateNumberControls();
      return;
    }
    
    const [row, col] = selectedCell;
    
    // Don't modify fixed cells
    if (isFixed(row, col)) {
      selectedNumber = board[row][col];
      renderBoard();
      updateNumberControls();
      return;
    }
    
    // Save current state to history before making changes
    moveHistory.push(JSON.parse(JSON.stringify(board)));
    
    // If the same number is clicked again, clear the cell
    if (board[row][col] === num) {
      board[row][col] = 0;
      selectedNumber = null;
    } else {
      // Check if the move is valid against the solution
      const isCorrectMove = solution[row][col] === num;
      
      if (!isCorrectMove) {
        // Increment mistake counter for incorrect moves
        mistakesCount++;
        updateMistakesCounter();
      }
      
      board[row][col] = num;
      selectedNumber = num;
    }
    
    // Check for conflicts
    conflicts = checkSolution(board);
    
    // Check for completed numbers
    checkCompletedNumbers();
    
    // Check if the puzzle is solved
    if (conflicts.length === 0 && isSolved(board)) {
      // Validate against the solution
      const validationResult = validateSolution(board, solution);
      
      if (validationResult.valid) {
        gameStatus = 'solved';
        gameCompleted = true;
        pauseTimer();
        showSuccessAlert();
        triggerConfetti();
        updateGameStats(difficulty, true, currentTime, hintsUsed);
      } else {
        if (validationResult.conflicts) {
          conflicts = validationResult.conflicts;
          gameStatus = 'invalid';
          showConflictAlert();
        }
      }
    } else if (conflicts.length > 0) {
      gameStatus = 'invalid';
      showConflictAlert();
    } else {
      gameStatus = 'playing';
      hideAllAlerts();
    }
    
    // Update UI
    renderBoard();
    updateNumberControls();
    
    // Enable undo button
    undoBtn.disabled = moveHistory.length === 0;
  }

  // Check for completed numbers
  function checkCompletedNumbers() {
    const numberCounts = Array(10).fill(0);
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const num = board[row][col];
        if (num > 0) {
          numberCounts[num]++;
        }
      }
    }
    
    const newCompletedNumbers = [];
    for (let num = 1; num <= 9; num++) {
      if (numberCounts[num] === 9) {
        newCompletedNumbers.push(num);
      }
    }
    
    // Check if we have a newly completed number
    for (const num of newCompletedNumbers) {
      if (!completedNumbers.includes(num)) {
        showCompletionAnimation = num;
        setTimeout(() => {
          showCompletionAnimation = null;
          updateNumberControls();
        }, 1500);
      }
    }
    
    completedNumbers = newCompletedNumbers;
  }

  // Provide a hint
  function giveHint() {
    if (gameStatus === 'solved') return;
    
    // Find all empty cells
    const emptyCells = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          emptyCells.push([row, col]);
        }
      }
    }
    
    if (emptyCells.length === 0) return;
    
    // Save current state to history before making changes
    moveHistory.push(JSON.parse(JSON.stringify(board)));
    
    // Select a random empty cell
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const [row, col] = emptyCells[randomIndex];
    
    // Fill it with the correct number from the solution
    board[row][col] = solution[row][col];
    
    // Update game state
    hintsUsed++;
    updateHintCount();
    
    // Check for completed numbers
    checkCompletedNumbers();
    
    // Check if the puzzle is solved
    conflicts = checkSolution(board);
    
    if (conflicts.length === 0 && isSolved(board)) {
      gameStatus = 'solved';
      gameCompleted = true;
      pauseTimer();
      showSuccessAlert();
      triggerConfetti();
      updateGameStats(difficulty, true, currentTime, hintsUsed);
    }
    
    // Update UI
    renderBoard();
    updateNumberControls();
    
    // Enable undo button
    undoBtn.disabled = moveHistory.length === 0;
  }

  // Undo the last move
  function undoMove() {
    if (moveHistory.length === 0) return;
    
    const previousBoard = moveHistory.pop();
    board = previousBoard;
    
    // Check for conflicts
    conflicts = checkSolution(board);
    
    // Check for completed numbers
    checkCompletedNumbers();
    
    // Update game status
    if (conflicts.length === 0 && isSolved(board)) {
      gameStatus = 'solved';
    } else if (conflicts.length > 0) {
      gameStatus = 'invalid';
      showConflictAlert();
    } else {
      gameStatus = 'playing';
      hideAllAlerts();
    }
    
    // Update UI
    renderBoard();
    updateNumberControls();
    
    // Disable undo button if no more history
    undoBtn.disabled = moveHistory.length === 0;
  }

  // Timer functions
  function startTimer() {
    if (timerIsRunning) return;
    
    timerIsRunning = true;
    timerStartTime = Date.now() - (timerPausedTime * 1000);
    
    timerToggle.innerHTML = '<i class="fas fa-pause"></i>';
    
    timerInterval = setInterval(() => {
      currentTime = Math.floor((Date.now() - timerStartTime) / 1000);
      timerDisplay.textContent = formatTime(currentTime);
      
      // Save timer state
      saveTimerState();
    }, 100);
  }

  function pauseTimer() {
    if (!timerIsRunning) return;
    
    timerIsRunning = false;
    timerPausedTime = currentTime;
    
    timerToggle.innerHTML = '<i class="fas fa-play"></i>';
    
    clearInterval(timerInterval);
    
    // Save timer state
    saveTimerState();
  }

  function toggleTimer() {
    if (timerIsRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function resetTimer() {
    pauseTimer();
    currentTime = 0;
    timerPausedTime = 0;
    timerDisplay.textContent = '00:00';
  }

  function saveTimerState() {
    localStorage.setItem(`sudoku-timer-${gameId}`, JSON.stringify({
      elapsedTime: currentTime,
      isRunning: timerIsRunning,
      pausedTime: timerPausedTime,
      timestamp: Date.now()
    }));
  }

  function loadTimerState() {
    const savedState = localStorage.getItem(`sudoku-timer-${gameId}`);
    if (savedState) {
      const { elapsedTime, isRunning, pausedTime, timestamp } = JSON.parse(savedState);
      
      currentTime = elapsedTime;
      timerPausedTime = pausedTime;
      
      // If the timer was running when the page was closed, calculate elapsed time
      if (isRunning && timestamp) {
        const timePassedSinceLastSave = Math.floor((Date.now() - timestamp) / 1000);
        currentTime = elapsedTime + timePassedSinceLastSave;
        timerPausedTime = currentTime;
      }
      
      timerDisplay.textContent = formatTime(currentTime);
      
      if (isRunning && !gameCompleted) {
        startTimer();
      }
    }
  }

  // Helper functions
  function isFixed(row, col) {
    return initialBoard[row][col] !== 0;
  }

  function hasConflict(row, col) {
    return conflicts.some(([r, c]) => r === row && c === col);
  }

  function isSelected(row, col) {
    return selectedCell && selectedCell[0] === row && selectedCell[1] === col;
  }

  function hasSameNumber(row, col) {
    const cellValue = board[row][col];
    return cellValue !== 0 && cellValue === selectedNumber;
  }

  function isRelatedToSelected(row, col) {
    if (!selectedCell) return false;
    const [selRow, selCol] = selectedCell;
    
    // Same row or column
    if (row === selRow || col === selCol) return true;
    
    // Same 3x3 box
    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    const selBoxRow = Math.floor(selRow / 3);
    const selBoxCol = Math.floor(selCol / 3);
    
    return boxRow === selBoxRow && boxCol === selBoxCol;
  }

  function isCompletedNumber(row, col) {
    const num = board[row][col];
    return num !== 0 && completedNumbers.includes(num);
  }

  function updateMistakesCounter() {
    mistakesCounter.textContent = mistakesCount;
  }

  function updateHintCount() {
    if (hintsUsed > 0) {
      hintCount.textContent = `(${hintsUsed})`;
      hintCount.classList.remove('hidden');
    } else {
      hintCount.classList.add('hidden');
    }
  }

  // Alert functions
  function showLoadingAlert() {
    hideAllAlerts();
    loadingAlert.classList.remove('hidden');
  }

  function showErrorAlert(message) {
    hideAllAlerts();
    errorMessage.textContent = message;
    errorAlert.classList.remove('hidden');
  }

  function showSuccessAlert() {
    hideAllAlerts();
    let message = 'Congratulations! You solved the puzzle!';
    if (hintsUsed > 0) {
      message += ` (with ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''})`;
    }
    if (mistakesCount > 0) {
      message += ` and ${mistakesCount} mistake${mistakesCount > 1 ? 's' : ''}`;
    }
    successMessage.textContent = message;
    successAlert.classList.remove('hidden');
  }

  function showConflictAlert() {
    hideAllAlerts();
    conflictAlert.classList.remove('hidden');
  }

  function hideAllAlerts() {
    loadingAlert.classList.add('hidden');
    errorAlert.classList.add('hidden');
    successAlert.classList.add('hidden');
    conflictAlert.classList.add('hidden');
  }

  // Stats functions
  function updateStatsDisplay() {
    // Update stats grid for the active difficulty
    const activeDifficultyTab = document.querySelector('.difficulty-tab.active');
    updateStatsGrid(activeDifficultyTab.dataset.difficulty);
    
    // Update leaderboard for the active difficulty
    const activeLeaderboardTab = document.querySelector('.leaderboard-panel .difficulty-tab.active');
    updateLeaderboardDisplay(activeLeaderboardTab.dataset.difficulty);
  }

  function updateStatsGrid(difficultyLevel) {
    // Load stats from localStorage
    const savedStats = localStorage.getItem('sudoku-stats');
    const stats = savedStats
      ? JSON.parse(savedStats)
      : {
          easy: { gamesPlayed: 0, gamesWon: 0, bestTime: null, totalTime: 0, hintsUsed: 0 },
          medium: { gamesPlayed: 0, gamesWon: 0, bestTime: null, totalTime: 0, hintsUsed: 0 },
          hard: { gamesPlayed: 0, gamesWon: 0, bestTime: null, totalTime: 0, hintsUsed: 0 }
        };
    
    const diffStats = stats[difficultyLevel];
    
    // Create stats items
    statsGrid.innerHTML = '';
    
    // Games Played
    addStatItem('Games Played', diffStats.gamesPlayed);
    
    // Games Won
    addStatItem('Games Won', diffStats.gamesWon);
    
    // Win Rate
    const winRate = diffStats.gamesPlayed > 0
      ? `${Math.round((diffStats.gamesWon / diffStats.gamesPlayed) * 100)}%`
      : '0%';
    addStatItem('Win Rate', winRate);
    
    // Best Time
    const bestTime = diffStats.bestTime !== null ? formatTime(diffStats.bestTime) : '--:--';
    addStatItem('Best Time', bestTime);
    
    // Avg. Time
    const avgTime = diffStats.gamesWon > 0
      ? formatTime(Math.round(diffStats.totalTime / diffStats.gamesWon))
      : '--:--';
    addStatItem('Avg. Time', avgTime);
    
    // Hints Used
    addStatItem('Hints Used', diffStats.hintsUsed);
  }

  function addStatItem(label, value) {
    const item = document.createElement('div');
    item.className = 'stat-item';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'stat-label';
    labelEl.textContent = label;
    
    const valueEl = document.createElement('div');
    valueEl.className = 'stat-value';
    valueEl.textContent = value;
    
    item.appendChild(labelEl);
    item.appendChild(valueEl);
    statsGrid.appendChild(item);
  }

  function updateLeaderboardDisplay(difficultyLevel) {
    // Load leaderboard from localStorage
    const savedLeaderboard = localStorage.getItem('sudoku-leaderboard');
    const leaderboard = savedLeaderboard
      ? JSON.parse(savedLeaderboard)
      : {
          easy: [],
          medium: [],
          hard: []
        };
    
    const times = leaderboard[difficultyLevel];
    
    // Create leaderboard items
    leaderboardList.innerHTML = '';
    
    if (times.length > 0) {
      times.sort((a, b) => a - b).slice(0, 5).forEach((time, index) => {
        const item = document.createElement('div');
        item.className = `leaderboard-item ${index === 0 ? 'top' : ''}`;
        
        const rank = document.createElement('div');
        rank.className = 'leaderboard-rank';
        rank.textContent = `#${index + 1}`;
        
        const timeEl = document.createElement('div');
        timeEl.className = 'leaderboard-time';
        timeEl.textContent = formatTime(time);
        
        item.appendChild(rank);
        item.appendChild(timeEl);
        
        if (index === 0) {
          const trophy = document.createElement('i');
          trophy.className = 'fas fa-trophy trophy-icon';
          item.appendChild(trophy);
        }
        
        leaderboardList.appendChild(item);
      });
    } else {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'text-center py-8 text-gray-500';
      emptyMessage.textContent = 'No records yet. Complete a game to set a record!';
      leaderboardList.appendChild(emptyMessage);
    }
  }

  function resetStats() {
    const newStats = {
      easy: { gamesPlayed: 0, gamesWon: 0, bestTime: null, totalTime: 0, hintsUsed: 0 },
      medium: { gamesPlayed: 0, gamesWon: 0, bestTime: null, totalTime: 0, hintsUsed: 0 },
      hard: { gamesPlayed: 0, gamesWon: 0, bestTime: null, totalTime: 0, hintsUsed: 0 }
    };
    
    const newLeaderboard = {
      easy: [],
      medium: [],
      hard: []
    };
    
    localStorage.setItem('sudoku-stats', JSON.stringify(newStats));
    localStorage.setItem('sudoku-leaderboard', JSON.stringify(newLeaderboard));
    
    updateStatsDisplay();
  }

  // Theme toggle
  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('sudoku-theme', isDark ? 'dark' : 'light');
  }

  // Confetti effect
  function triggerConfetti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      
      confettiInstance({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#10B981', '#34D399']
      });
    }, 250);
  }

  // Handle keyboard input
  function handleKeyDown(e) {
    if (!selectedCell) return;
    
    // Handle number keys (both regular and numpad)
    if ((e.key >= '1' && e.key <= '9') || (e.key >= 'Numpad1' && e.key <= 'Numpad9')) {
      const num = parseInt(e.key.replace('Numpad', ''), 10);
      handleNumberInput(num);
    }
    // Handle arrow keys to navigate
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); // Prevent scrolling
      const [row, col] = selectedCell;
      let newRow = row;
      let newCol = col;
      
      if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1);
      else if (e.key === 'ArrowDown') newRow = Math.min(8, row + 1);
      else if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1);
      else if (e.key === 'ArrowRight') newCol = Math.min(8, col + 1);
      
      handleCellSelect(newRow, newCol);
    }
    // Handle delete or backspace to clear a cell
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      const [row, col] = selectedCell;
      if (board[row][col] !== 0 && !isFixed(row, col)) {
        // Save current state to history before making changes
        moveHistory.push(JSON.parse(JSON.stringify(board)));
        
        board[row][col] = 0;
        selectedNumber = null;
        
        // Check for conflicts
        conflicts = checkSolution(board);
        
        // Check for completed numbers
        checkCompletedNumbers();
        
        if (conflicts.length > 0) {
          gameStatus = 'invalid';
          showConflictAlert();
        } else {
          gameStatus = 'playing';
          hideAllAlerts();
        }
        
        // Update UI
        renderBoard();
        updateNumberControls();
        
        // Enable undo button
        undoBtn.disabled = moveHistory.length === 0;
      }
    }
    // Handle 'z' key with Ctrl for undo
    else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undoMove();
    }
  }
});
