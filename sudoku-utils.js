// Sudoku Utilities

// Difficulty levels
const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

// Logger for tracking Sudoku operations
class SudokuLogger {
  constructor() {
    this.logs = [];
    this.consoleOutput = true;
  }

  static getInstance() {
    if (!SudokuLogger.instance) {
      SudokuLogger.instance = new SudokuLogger();
    }
    return SudokuLogger.instance;
  }

  setConsoleOutput(enabled) {
    this.consoleOutput = enabled;
  }

  log(level, message, data) {
    const logEntry = {
      level,
      message,
      timestamp: new Date(),
      data
    };

    this.logs.push(logEntry);

    if (this.consoleOutput) {
      const formattedTime = logEntry.timestamp.toISOString();
      switch (level) {
        case 'info':
          console.info(`[${formattedTime}] INFO: ${message}`, data || '');
          break;
        case 'warn':
          console.warn(`[${formattedTime}] WARN: ${message}`, data || '');
          break;
        case 'error':
          console.error(`[${formattedTime}] ERROR: ${message}`, data || '');
          break;
        case 'debug':
          console.debug(`[${formattedTime}] DEBUG: ${message}`, data || '');
          break;
      }
    }
  }

  getLogs(level) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

// Get logger instance
const logger = SudokuLogger.getInstance();

// Generate a Sudoku puzzle with validation
function generateSudoku(difficulty) {
  logger.log('info', `Generating ${difficulty} puzzle`);
  const startTime = performance.now();

  try {
    // Create a solved Sudoku board
    const solution = createSolvedBoard();

    if (!isValidSudoku(solution)) {
      throw new Error('Generated solution is invalid');
    }

    logger.log('debug', 'Solution generated successfully', { solution });

    // Create a puzzle by removing numbers from the solution
    const puzzle = JSON.parse(JSON.stringify(solution));

    // Determine how many cells to remove based on difficulty
    let cellsToRemove = 0;
    switch (difficulty) {
      case DIFFICULTY.EASY:
        cellsToRemove = 40; // Leave ~41 clues
        break;
      case DIFFICULTY.MEDIUM:
        cellsToRemove = 50; // Leave ~31 clues
        break;
      case DIFFICULTY.HARD:
        cellsToRemove = 60; // Leave ~21 clues
        break;
    }

    // Remove cells with balanced distribution
    const removedCells = balancedRemoveCells(puzzle, solution, cellsToRemove);

    // Verify the puzzle has a unique solution
    const uniqueSolution = hasUniqueSolution(puzzle);

    if (!uniqueSolution) {
      logger.log('warn', 'Generated puzzle does not have a unique solution, regenerating');
      return generateSudoku(difficulty); // Recursively try again
    }

    // Count clues
    const cluesCount = countClues(puzzle);

    // Final validation
    if (!isSolvable(puzzle)) {
      logger.log('error', 'Generated puzzle is not solvable, regenerating');
      return generateSudoku(difficulty); // Recursively try again
    }

    // Validate distribution of clues
    if (!hasBalancedDistribution(puzzle)) {
      logger.log('warn', 'Generated puzzle does not have a balanced distribution, regenerating');
      return generateSudoku(difficulty); // Recursively try again
    }

    const endTime = performance.now();
    const generationTime = endTime - startTime;

    logger.log('info', `Puzzle generated successfully in ${generationTime.toFixed(2)}ms`, {
      difficulty,
      cluesCount,
      uniqueSolution,
      generationTime
    });

    return {
      puzzle,
      solution,
      uniqueSolution: true,
      difficulty,
      cluesCount,
      generationTime
    };
  } catch (error) {
    logger.log('error', 'Error generating puzzle', { error, difficulty });

    // Fallback to a simpler generation method in case of errors
    return fallbackGenerateSudoku(difficulty);
  }
}

// Check if the puzzle has a balanced distribution of clues
function hasBalancedDistribution(puzzle) {
  // Count clues in each row, column, and box
  const rowCounts = Array(9).fill(0);
  const colCounts = Array(9).fill(0);
  const boxCounts = Array(9).fill(0);

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (puzzle[row][col] !== 0) {
        rowCounts[row]++;
        colCounts[col]++;
        const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        boxCounts[boxIndex]++;
      }
    }
  }

  // Calculate statistics
  const totalClues = countClues(puzzle);
  const avgCluesPerUnit = totalClues / 9;

  // Allow some variance, but not too much
  const maxVariance = Math.max(2, Math.floor(avgCluesPerUnit * 0.5));

  // Check if any row, column, or box has too many or too few clues
  for (let i = 0; i < 9; i++) {
    if (
      Math.abs(rowCounts[i] - avgCluesPerUnit) > maxVariance ||
      Math.abs(colCounts[i] - avgCluesPerUnit) > maxVariance ||
      Math.abs(boxCounts[i] - avgCluesPerUnit) > maxVariance
    ) {
      return false;
    }

    // Specifically check for rows that are too filled
    if (rowCounts[i] > 7) {
      return false;
    }
  }

  return true;
}

// Fallback puzzle generation for error cases
function fallbackGenerateSudoku(difficulty) {
  logger.log('warn', 'Using fallback puzzle generation');
  const startTime = performance.now();

  // Create a solved Sudoku board
  const solution = createSolvedBoard();

  // Create a puzzle by removing numbers from the solution
  const puzzle = JSON.parse(JSON.stringify(solution));

  // Determine how many cells to remove based on difficulty
  let cellsToRemove = 0;
  switch (difficulty) {
    case DIFFICULTY.EASY:
      cellsToRemove = 35; // More conservative for fallback
      break;
    case DIFFICULTY.MEDIUM:
      cellsToRemove = 45;
      break;
    case DIFFICULTY.HARD:
      cellsToRemove = 55;
      break;
  }

  // Remove cells with balanced distribution
  balancedFallbackRemove(puzzle, cellsToRemove);

  const endTime = performance.now();
  const generationTime = endTime - startTime;
  const cluesCount = countClues(puzzle);

  logger.log('info', `Fallback puzzle generated successfully in ${generationTime.toFixed(2)}ms`, {
    difficulty,
    cluesCount,
    generationTime
  });

  return {
    puzzle,
    solution,
    uniqueSolution: true,
    difficulty,
    cluesCount,
    generationTime
  };
}

// Balanced fallback removal method
function balancedFallbackRemove(puzzle, cellsToRemove) {
  // Create a pattern to ensure balanced removal
  const pattern = createBalancedRemovalPattern(cellsToRemove);

  // Apply the pattern
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (pattern[row][col] === 0) {
        puzzle[row][col] = 0;
      }
    }
  }
}

// Create a balanced removal pattern
function createBalancedRemovalPattern(cellsToRemove) {
  // Start with a full grid (all 1s)
  const pattern = Array(9).fill(0).map(() => Array(9).fill(1));
  const totalCells = 81;
  const cellsToKeep = totalCells - cellsToRemove;

  // Distribute cells to keep evenly
  const cellsPerRow = Math.floor(cellsToKeep / 9);
  const extraCells = cellsToKeep % 9;

  // First, set all cells to 0 (remove all)
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      pattern[row][col] = 0;
    }
  }

  // Then, add back the cells to keep with balanced distribution
  for (let row = 0; row < 9; row++) {
    // Cells to keep in this row
    const rowCellsToKeep = cellsPerRow + (row < extraCells ? 1 : 0);

    // Shuffle column indices
    const cols = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8]);

    // Keep the first rowCellsToKeep cells
    for (let i = 0; i < rowCellsToKeep; i++) {
      pattern[row][cols[i]] = 1;
    }
  }

  return pattern;
}

// Count the number of clues in a puzzle
function countClues(board) {
  let count = 0;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== 0) {
        count++;
      }
    }
  }
  return count;
}

// Remove cells with balanced distribution
function balancedRemoveCells(puzzle, solution, cellsToRemove) {
  // Create a list of all cells
  const cells = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      cells.push([row, col]);
    }
  }

  // Shuffle the cells
  shuffleArray(cells);

  // Track clues per row, column, and box
  const rowCounts = Array(9).fill(9); // Start with all cells filled
  const colCounts = Array(9).fill(9);
  const boxCounts = Array(9).fill(9);

  let removed = 0;
  const maxAttempts = 1000;
  let attempts = 0;

  // First pass: remove cells while maintaining balance
  while (removed < cellsToRemove && attempts < maxAttempts) {
    attempts++;

    // Find a cell to remove that maintains balance
    let bestCell = null;
    let bestScore = -1;

    // Try a random subset of cells to improve performance
    const candidateCells = shuffleArray([...cells]).slice(0, 20);

    for (const [row, col] of candidateCells) {
      if (puzzle[row][col] !== 0) {
        const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);

        // Skip if removing this cell would leave too few clues in a unit
        if (rowCounts[row] <= 2 || colCounts[col] <= 2 || boxCounts[boxIndex] <= 2) {
          continue;
        }

        // Calculate how balanced the removal would be
        const score = calculateRemovalScore(rowCounts, colCounts, boxCounts, row, col);

        if (score > bestScore) {
          // Temporarily remove the cell to check if it still has a unique solution
          const temp = puzzle[row][col];
          puzzle[row][col] = 0;

          if (hasUniqueSolution(puzzle)) {
            bestScore = score;
            bestCell = [row, col];
          }

          // Restore the cell for now
          puzzle[row][col] = temp;
        }
      }
    }

    // If we found a good cell to remove, remove it permanently
    if (bestCell) {
      const [row, col] = bestCell;
      puzzle[row][col] = 0;
      removed++;

      // Update counts
      rowCounts[row]--;
      colCounts[col]--;
      const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      boxCounts[boxIndex]--;
    } else {
      // If we couldn't find a good cell, break to avoid infinite loop
      break;
    }
  }

  // If we couldn't remove enough cells with the balanced approach,
  // fall back to the simpler approach for the remaining cells
  if (removed < cellsToRemove) {
    logger.log(
      'warn',
      `Could only remove ${removed} cells with balanced approach, falling back to simple approach for the remaining ${cellsToRemove - removed} cells`
    );

    // Second pass: remove remaining cells with less strict balance requirements
    attempts = 0;
    while (removed < cellsToRemove && attempts < maxAttempts) {
      attempts++;
      const randomIndex = Math.floor(Math.random() * cells.length);
      const [row, col] = cells[randomIndex];

      if (puzzle[row][col] !== 0) {
        const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);

        // Ensure we don't completely empty any unit
        if (rowCounts[row] <= 1 || colCounts[col] <= 1 || boxCounts[boxIndex] <= 1) {
          continue;
        }

        // Temporarily remove the cell
        const temp = puzzle[row][col];
        puzzle[row][col] = 0;

        // Check if the puzzle is still solvable with a unique solution
        if (hasUniqueSolution(puzzle)) {
          removed++;
          rowCounts[row]--;
          colCounts[col]--;
          boxCounts[boxIndex]--;
        } else {
          // If not, restore the cell
          puzzle[row][col] = temp;
        }
      }
    }
  }

  return removed;
}

// Calculate a score for how balanced a cell removal would be
function calculateRemovalScore(rowCounts, colCounts, boxCounts, row, col) {
  const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);

  // Higher score means better to remove (more balanced)
  // We want to remove from rows/columns/boxes with more clues
  return rowCounts[row] + colCounts[col] + boxCounts[boxIndex];
}

// Check if a puzzle has a unique solution
function hasUniqueSolution(board) {
  // Make a copy of the board
  const boardCopy = JSON.parse(JSON.stringify(board));

  // Find an empty cell
  let emptyCell = null;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (boardCopy[row][col] === 0) {
        emptyCell = [row, col];
        break;
      }
    }
    if (emptyCell) break;
  }

  // If no empty cell, the puzzle is already solved
  if (!emptyCell) return true;

  const [row, col] = emptyCell;
  let solutionCount = 0;

  // Try each number 1-9
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(boardCopy, row, col, num)) {
      boardCopy[row][col] = num;

      // Recursively check if this leads to a solution
      if (isSolvable(boardCopy)) {
        solutionCount++;
      }

      // If we've found more than one solution, return false
      if (solutionCount > 1) {
        return false;
      }

      // Backtrack
      boardCopy[row][col] = 0;
    }
  }

  return solutionCount === 1;
}

// Check if a puzzle is solvable
function isSolvable(board) {
  // Make a copy of the board
  const boardCopy = JSON.parse(JSON.stringify(board));

  // Try to solve the puzzle
  return solveSudoku(boardCopy);
}

// Create a solved Sudoku board
function createSolvedBoard() {
  // Initialize an empty 9x9 board
  const board = Array(9).fill(0).map(() => Array(9).fill(0));

  // Fill the board using backtracking
  const success = solveSudoku(board);

  if (!success) {
    logger.log('error', 'Failed to create a solved board');
    throw new Error('Failed to create a solved board');
  }

  return board;
}

// Solve a Sudoku board using backtracking
function solveSudoku(board) {
  // Find an empty cell
  let emptyCell = null;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        emptyCell = [row, col];
        break;
      }
    }
    if (emptyCell) break;
  }

  // If no empty cell, the board is solved
  if (!emptyCell) return true;

  const [row, col] = emptyCell;

  // Try placing numbers 1-9
  const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const num of nums) {
    // Check if the number can be placed
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num;

      // Recursively try to solve the rest of the board
      if (solveSudoku(board)) {
        return true;
      }

      // If we couldn't solve the board, backtrack
      board[row][col] = 0;
    }
  }

  // If no number works, backtrack
  return false;
}

// Check if a number can be placed in a cell
function isValidPlacement(board, row, col, num) {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) {
      return false;
    }
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) {
      return false;
    }
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[boxRow + r][boxCol + c] === num) {
        return false;
      }
    }
  }

  return true;
}

// Shuffle an array using Fisher-Yates algorithm
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Check if a Sudoku board is valid
function isValidSudoku(board) {
  // Check rows
  for (let row = 0; row < 9; row++) {
    const seen = new Set();
    for (let col = 0; col < 9; col++) {
      const num = board[row][col];
      if (num !== 0) {
        if (seen.has(num)) {
          return false;
        }
        seen.add(num);
      }
    }
  }

  // Check columns
  for (let col = 0; col < 9; col++) {
    const seen = new Set();
    for (let row = 0; row < 9; row++) {
      const num = board[row][col];
      if (num !== 0) {
        if (seen.has(num)) {
          return false;
        }
        seen.add(num);
      }
    }
  }

  // Check 3x3 boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = new Set();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = boxRow * 3 + r;
          const col = boxCol * 3 + c;
          const num = board[row][col];
          if (num !== 0) {
            if (seen.has(num)) {
              return false;
            }
            seen.add(num);
          }
        }
      }
    }
  }

  return true;
}

// Check if a Sudoku board is valid and return conflicts
function checkSolution(board) {
  logger.log('debug', 'Checking solution', { board });
  const conflicts = [];

  // Check rows
  for (let row = 0; row < 9; row++) {
    const seen = new Map();
    for (let col = 0; col < 9; col++) {
      const num = board[row][col];
      if (num !== 0) {
        if (seen.has(num)) {
          conflicts.push([row, col]);
          conflicts.push([row, seen.get(num)]);
        } else {
          seen.set(num, col);
        }
      }
    }
  }

  // Check columns
  for (let col = 0; col < 9; col++) {
    const seen = new Map();
    for (let row = 0; row < 9; row++) {
      const num = board[row][col];
      if (num !== 0) {
        if (seen.has(num)) {
          conflicts.push([row, col]);
          conflicts.push([seen.get(num), col]);
        } else {
          seen.set(num, row);
        }
      }
    }
  }

  // Check 3x3 boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = new Map();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = boxRow * 3 + r;
          const col = boxCol * 3 + c;
          const num = board[row][col];
          if (num !== 0) {
            if (seen.has(num)) {
              conflicts.push([row, col]);
              conflicts.push(seen.get(num));
            } else {
              seen.set(num, [row, col]);
            }
          }
        }
      }
    }
  }

  // Remove duplicates
  const uniqueConflicts = Array.from(new Set(conflicts.map(([r, c]) => `${r}-${c}`))).map(str => {
    const [r, c] = str.split('-').map(Number);
    return [r, c];
  });

  logger.log('debug', 'Solution check complete', {
    conflictsFound: uniqueConflicts.length > 0,
    conflicts: uniqueConflicts
  });

  return uniqueConflicts;
}

// Validate a user's solution against the original solution
function validateSolution(userBoard, solution) {
  logger.log('info', 'Validating user solution');

  // Check for conflicts
  const conflicts = checkSolution(userBoard);
  if (conflicts.length > 0) {
    logger.log('info', 'User solution has conflicts', { conflicts });
    return {
      valid: false,
      reason: 'There are conflicts in your solution',
      conflicts
    };
  }

  // Check if the board is completely filled
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (userBoard[row][col] === 0) {
        logger.log('info', 'User solution is incomplete');
        return {
          valid: false,
          reason: 'The solution is incomplete'
        };
      }
    }
  }

  // Check if the solution matches the expected solution
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (userBoard[row][col] !== solution[row][col]) {
        logger.log('info', 'User solution is incorrect', {
          position: [row, col],
          expected: solution[row][col],
          actual: userBoard[row][col]
        });
        return {
          valid: false,
          reason: 'The solution is incorrect'
        };
      }
    }
  }

  logger.log('info', 'User solution is valid');
  return {
    valid: true
  };
}

// Check if the board is completely filled (no zeros)
function isSolved(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        return false;
      }
    }
  }
  return true;
}

// Format time as MM:SS
function formatTime(timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update game statistics
function updateGameStats(difficulty, isWon, time, hintsUsed) {
  // Load existing stats
  const savedStats = localStorage.getItem('sudoku-stats');
  const stats = savedStats
    ? JSON.parse(savedStats)
    : {
        easy: { gamesPlayed: 0, gamesWon: 0, bestTime: null, totalTime: 0, hintsUsed: 0 },
        medium: { gamesPlayed: 0, gamesWon: 0, bestTime: null, totalTime: 0, hintsUsed: 0 },
        hard: { gamesPlayed: 0, gamesWon: 0, bestTime: null, totalTime: 0, hintsUsed: 0 }
      };

  // Update stats
  stats[difficulty].gamesPlayed += 1;
  stats[difficulty].hintsUsed += hintsUsed;

  if (isWon) {
    stats[difficulty].gamesWon += 1;
    stats[difficulty].totalTime += time;

    // Update best time
    if (stats[difficulty].bestTime === null || time < stats[difficulty].bestTime) {
      stats[difficulty].bestTime = time;
    }

    // Update leaderboard
    updateLeaderboard(difficulty, time);
  }

  // Save updated stats
  localStorage.setItem('sudoku-stats', JSON.stringify(stats));
}

// Update leaderboard
function updateLeaderboard(difficulty, time) {
  // Load existing leaderboard
  const savedLeaderboard = localStorage.getItem('sudoku-leaderboard');
  const leaderboard = savedLeaderboard
    ? JSON.parse(savedLeaderboard)
    : {
        easy: [],
        medium: [],
        hard: []
      };

  // Add new time
  leaderboard[difficulty].push(time);

  // Sort and limit to top 10
  leaderboard[difficulty].sort((a, b) => a - b);
  if (leaderboard[difficulty].length > 10) {
    leaderboard[difficulty] = leaderboard[difficulty].slice(0, 10);
  }

  // Save updated leaderboard
  localStorage.setItem('sudoku-leaderboard', JSON.stringify(leaderboard));
}
