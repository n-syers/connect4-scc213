// Imports and dependanies
import logger from '../utils/logger.js';


// Minimax class algorithm implementation
export class minimax {

    depth = 3;
    maximiser = 1;
    minimiser = 0;
    maximiserUUID = 1;
    minimiserUUID = 0;
    stateZero = [];

    // Constructor to set initlial values
    constructor(stateZero, depth = 3, minimiserUUID = 0, maximiserUUID = -1, minimiserActivePlayer = 0, maximiserActivePlayer = 1) {
        this.stateZero = stateZero;
        this.depth = depth;
        this.maximiser = parseInt(maximiserActivePlayer);
        this.minimiser = parseInt(minimiserActivePlayer);
        this.maximiserUUID = maximiserUUID;
        this.minimiserUUID = minimiserUUID;
    }


    // Given a state and column. Move the player token into the column.
    // Returns new board state
    move(state, column, player) {
        try {
            let newState = state.map(col => col.slice()); // Copy of the state

            // Place the token in the lowest available row in the column
            // Iterate from the bottom until cell value is null
            for (let i = newState[column].length - 1; i >= 0; i--) {
                if (newState[column][i] === null) {
                    newState[column][i] = player; // Set token
                    break;
                }
            }
            return newState;
            // Catch errors and log them
        } catch (error) {
            logger.error(`An error occured in minimax.move() ${error}`, 500);
        }
    }

    // Evaluate a board state to determine if the game would be over
    // Return true if gameover, false if not
    isTerminalNode(state) {
        // Set message for terminal state
        let isTerminalValues = {
            terminate: false,
            terminateBy: null,
        };
        // Check if either player has won or drew
        let maximiserWin = this.checkWin(this.maximiser, state);
        let minimiserWin = this.checkWin(this.minimiser, state);
        let draw = this.checkDraw(state);

        // Set message for terminal state depending on the result
        if (maximiserWin) {
            isTerminalValues.terminateBy = "maximiser";
        } else if (minimiserWin) {
            isTerminalValues.terminateBy = "minimiser";
        } else if (draw) {
            isTerminalValues.terminateBy = "draw";
        }
        isTerminalValues.terminate = maximiserWin || minimiserWin || draw;

        // Return the terminal state values
        return isTerminalValues;
    }


    // Evaluate the board state as a score for maximiser
    // Positive score is favourable to maximiser
    // Negative score is favourable to minimiser
    // Returns the score of the section
    evaluateSection(section, isMaximising) {

        let score = 0;

        // Change maxer and minimiser based on who is maxing
        let tempMaxer = (isMaximising) ? this.maximiser : this.minimiser;
        let tempMini = (isMaximising) ? this.minimiser : this.maximiser;

        // Get counts within the section
        let maximiserCount = section.filter(cell => cell === tempMaxer).length;
        let minimiserCount = section.filter(cell => cell === tempMini).length;

        // Change score of the section based on counts

        if (maximiserCount === 4) score += 100000; // Absolute win for maximiser
        if (minimiserCount === 4) score -= 100000; // Absolute win for minimiser

        if (maximiserCount === 3 && minimiserCount === 0) score += 100;
        if (minimiserCount === 3 && maximiserCount === 0) score -= 100;
        if (maximiserCount === 2 && minimiserCount === 0) score += 10;
        if (minimiserCount === 2 && maximiserCount === 0) score -= 10;

        score = (isMaximising) ? (score) : (-score); // Invert score if minimiser is maxing

        return score;
    }


    // Evaluate the board state and return a score for the maximiser.
    // For each (row/column/diagonal/center) of 4 cells, evaluate the section and add to the score.
    // Returns integer
    scoreState(state, isMaximising) {

        let score = 0;

        // Score center column. Favour center column over side columns
        let center = state[3];
        score += this.evaluateSection(center, isMaximising);

        // Score rows in 4 cell sections
        for (let row = 0; row < state[0].length; row++) {
            for (let col = 0; col < state.length - 3; col++) {

                // Create section of 4 cells as array
                let section = [
                    state[col][row],
                    state[col + 1][row],
                    state[col + 2][row],
                    state[col + 3][row]
                ];

                // Score the section and add to total score
                score += this.evaluateSection(section, isMaximising);
            }
        }

        // Score columns in 4 cell sections
        for (let col = 0; col < state.length; col++) {
            for (let row = 0; row < state[0].length - 3; row++) {

                // Create section of 4 cells as array
                let section = [
                    state[col][row],
                    state[col][row + 1],
                    state[col][row + 2],
                    state[col][row + 3]
                ];

                // Score the section and add to total score
                score += this.evaluateSection(section, isMaximising);
            }
        }

        // Score diagonals (top-left to bottom-right) in 4 cell sections
        for (let col = 0; col < state.length - 3; col++) {
            for (let row = 0; row < state[0].length - 3; row++) {

                // Create section of 4 cells as array
                let section = [
                    state[col][row],
                    state[col + 1][row + 1],
                    state[col + 2][row + 2],
                    state[col + 3][row + 3]
                ];

                // Score the section and add to total score
                score += this.evaluateSection(section, isMaximising);
            }
        }

        // Score diagonals (bottom-left to top-right) in 4 cell sections
        for (let col = 0; col < state.length - 3; col++) {
            for (let row = 3; row < state[0].length; row++) {

                // Create section of 4 cells as array
                let section = [
                    state[col][row],
                    state[col + 1][row - 1],
                    state[col + 2][row - 2],
                    state[col + 3][row - 3]
                ];

                // Score the section and add to total score
                score += this.evaluateSection(section, isMaximising);
            }
        }

        return score;
    }


    // Performs the minimax algorithm to a given depth
    // Recursive function to depth = 0 or terminal state
    // Weight terminal scores by remaining depth to prefer earlier wins and later losses.
    // Returns the best score for the maximiser
    minimaxSearch(state, depth, isMaximising) {

        // Check for terminal node or depth 0
        const isTerminal = this.isTerminalNode(state);

        // If node is terminal or depth is 0, return the score of the node
        if (depth === 0 || isTerminal.terminate) {
            if (isTerminal.terminate) {
                switch (isTerminal.terminateBy) {
                    case "maximiser":
                        return 100000 * (depth + 1); // Keep wins positive even at depth 0
                    case "minimiser":
                        return -100000 * (depth + 1); // Keep losses negative even at depth 0
                    case "draw":
                        return 0; // Neutral score for draw
                    default: // Handle unknown terminal state
                        logger.error("Unknown terminal state", 500);
                        return 0;
                }
            }

            // Depth is 0 but not terminal. Score the board.
            return this.scoreState(state, isMaximising);

        }
        let value = isMaximising ? -Infinity : Infinity; // Allow the full range of depth-weighted scores

        let validMoves = this.getValidMoves(state); // Get all valid moves for the current state

        // For each valid move, simulate the move by recursively calling minimaxSearch switching maxer
        validMoves.forEach(move => {

            let newState = this.move(state, move, isMaximising ? this.maximiser : this.minimiser); // Simulate the move

            // Recursively call minimaxSearch for the new state, decreasing depth and switching maxer
            if (isMaximising) {
                value = Math.max(value, this.minimaxSearch(newState, depth - 1, false));
            } else {
                value = Math.min(value, this.minimaxSearch(newState, depth - 1, true));
            }
        });

        // Return the best score for the maximiser
        return value;
    };

    // Get the best move for the maximiser by evaluating all valid moves with minimax
    // Returns the best move (column index)
    getBestMove() {

        let bestScore = -Infinity; // Choose a legal move even when every option loses
        let bestMove = null;

        let validMoves = this.getValidMoves(this.stateZero); // Get all valid moves for the current state

        // For each valid move, simulate the move and evaluate it with minimaxSearch
        validMoves.forEach(move => {

            let newState = this.move(this.stateZero, move, this.maximiser); // Simulate move

            let score = this.minimaxSearch(newState, this.depth - 1, false); // Evaulate move with minimaxSearch

            logger.debug(`Minimax evaluated column ${move} with score ${score}`, 102);

            // If score is better than current best, update best score and best move
            if (score >= bestScore) {
                bestScore = score;
                bestMove = move;
            }

        });

        this.bestColumn = bestMove;
        logger.info(`Best move determined by minimax: Column ${bestMove} with score ${bestScore}`, 200);

        // If a best move was found, make the move on the true state
        if (bestMove !== null) {
            this.stateZero = this.move(this.stateZero, bestMove, this.maximiser);
        }
        return this.bestColumn;
    }

    // Check if the board state is a win for the given player
    // Returns true if win, false if not
    checkWin(player, state) {
        if (!state) {
            logger.error("No state provided to checkWin", 500);
            return false;
        }
        // Check ROWS for win
        for (let row = 0; row < state[0].length; row++) {
            for (let col = 0; col < state.length - 3; col++) {
                if (state[col][row] === player &&
                    state[col + 1][row] === player &&
                    state[col + 2][row] === player &&
                    state[col + 3][row] === player) {
                    return true;
                }
            }
        }

        // Check COLUMNS for win
        for (let col = 0; col < state.length; col++) {
            for (let row = 0; row < state[0].length - 3; row++) {
                if (state[col][row] === player &&
                    state[col][row + 1] === player &&
                    state[col][row + 2] === player &&
                    state[col][row + 3] === player) {
                    return true;
                }
            }
        }

        // Check DIAGONAL (bottom-left to top-right) for win
        for (let col = 0; col < state.length - 3; col++) {
            for (let row = 3; row < state[0].length; row++) {
                if (state[col][row] === player &&
                    state[col + 1][row - 1] === player &&
                    state[col + 2][row - 2] === player &&
                    state[col + 3][row - 3] === player) {
                    return true;
                }
            }
        }

        // Check DIAGONAL (top-left to bottom-right) for win
        for (let col = 0; col < state.length - 3; col++) {
            for (let row = 0; row < state[0].length - 3; row++) {
                if (state[col][row] === player &&
                    state[col + 1][row + 1] === player &&
                    state[col + 2][row + 2] === player &&
                    state[col + 3][row + 3] === player) {
                    return true;
                }
            }
        }
        // No win found.
        return false;
    }

    // Check if the board state is a draw (no more valid moves)
    // Returns true if draw, false if not
    checkDraw(state) {

        // If no state provided, log error and return false
        if (!state) {
            logger.error("No state provided to checkDraw", 500);
            return false;
        }

        // If any cell is null then no draw present
        for (let column = 0; column < state.length; column++) {
            for (let row = 0; row < state[0].length; row++) {

                // Check cell state
                if (state[column][row] === null) {
                    return false;
                }

            }
        }
        return true;
    }

    // Get an array of valid columns for the given board state (columns that are not full)
    getValidMoves(state) {

        const validMoves = [];

        // For each column
        for (let col = 0; col < state.length; col++) {

            // Check top cell of the column is empty (null)
            if (state[col][0] === null) {

                // Add to array of valid moves
                validMoves.push(col);

            }
        }
        return validMoves;
    }

}
export default minimax;
