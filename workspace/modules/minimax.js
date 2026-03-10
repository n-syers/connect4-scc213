import logger from '../utils/logger.js';

export class minimax {

    depth = 3;
    maximiser = 1;
    minimiser = 0;
    maximiserUUID = 1;
    minimiserUUID = 0;
    stateZero = [];
    constructor(stateZero, depth = 3, minimiserUUID = 0, maximiserUUID = -1, minimiserActivePlayer = 0, maximiserActivePlayer = 1) {
        this.stateZero = stateZero;
        this.depth = depth;
        this.maximiser = parseInt(maximiserActivePlayer);
        this.minimiser = parseInt(minimiserActivePlayer);
        this.maximiserUUID = maximiserUUID;
        this.minimiserUUID = minimiserUUID;
    }

    /*
    Given a state and column. Move the player token into the column.
    Returns new board state
    */
    move(state, column, player) {
        try {
            let newState = state.map(col => col.slice());
            for (let i = newState[column].length - 1; i >= 0; i--) {
                if (newState[column][i] === null) {
                    newState[column][i] = player;
                    break;
                }
            }
            return newState;
        } catch (error) {
            logger.error(`An error occured in minimax.move() ${error}`, 500);
        }
    }


    /*
    Evaluate a board state to determine if the game would be over
    Return true if gameover, false if not
    */
    isTerminalNode(state) {
        let isTerminalValues = {
            terminate: false,
            terminateBy: null,
        };
        let maximiserWin = this.checkWin(this.maximiser, state);
        let minimiserWin = this.checkWin(this.minimiser, state);
        let draw = this.checkDraw(state);
        if (maximiserWin) {
            isTerminalValues.terminateBy = "maximiser";
        } else if (minimiserWin) {
            isTerminalValues.terminateBy = "minimiser";
        } else if (draw) {
            isTerminalValues.terminateBy = "draw";
        }
        isTerminalValues.terminate = maximiserWin || minimiserWin || draw;
        return isTerminalValues;
    }

    /*
    Evaluate the board state as a score for maximiser
    Positive score is favourable to maximiser
    Negative score is favourable to minimiser
    Returns the score of the section
    */
    evaluateSection(section, isMaximising) {
        let score = 0;
        let tempMaxer = (isMaximising) ? this.maximiser : this.minimiser;
        let tempMini = (isMaximising) ? this.minimiser : this.maximiser;
        // Get counts within the section
        let maximiserCount = section.filter(cell => cell === tempMaxer).length;
        let minimiserCount = section.filter(cell => cell === tempMini).length;

        // Change score of the section based on counts
        if (maximiserCount === 4) score += 100000;
        if (minimiserCount === 4) score -= 100000;
        if (maximiserCount === 3 && minimiserCount === 0) score += 100;
        if (minimiserCount === 3 && maximiserCount === 0) score -= 100;
        if (maximiserCount === 2 && minimiserCount === 0) score += 10;
        if (minimiserCount === 2 && maximiserCount === 0) score -= 10;
        score = (isMaximising) ? (score) : (-score);
        return score;
    }

    /*
    Evaluate the board state and return a score for the maximiser.
    For each (row/column/diagonal/center) of 4 cells, evaluate the section and add to the score.
    Returns the total score for the board state
    */
    scoreState(state, isMaximising) {
        let score = 0;

        // Score center column
        let center = state[3];
        score += this.evaluateSection(center, isMaximising);


        // Score rows
        for (let row = 0; row < state[0].length; row++) {
            for (let col = 0; col < state.length - 3; col++) {
                let section = [
                    state[col][row],
                    state[col + 1][row],
                    state[col + 2][row],
                    state[col + 3][row]
                ];
                score += this.evaluateSection(section, isMaximising);
            }
        }

        // Score columns
        for (let col = 0; col < state.length; col++) {
            for (let row = 0; row < state[0].length - 3; row++) {
                let section = [
                    state[col][row],
                    state[col][row + 1],
                    state[col][row + 2],
                    state[col][row + 3]
                ];
                score += this.evaluateSection(section, isMaximising);
            }
        }

        // Score diagonals (top-left to bottom-right)
        for (let col = 0; col < state.length - 3; col++) {
            for (let row = 0; row < state[0].length - 3; row++) {
                let section = [
                    state[col][row],
                    state[col + 1][row + 1],
                    state[col + 2][row + 2],
                    state[col + 3][row + 3]
                ];
                score += this.evaluateSection(section, isMaximising);
            }
        }

        // Score diagonals (bottom-left to top-right)
        for (let col = 0; col < state.length - 3; col++) {
            for (let row = 3; row < state[0].length; row++) {
                let section = [
                    state[col][row],
                    state[col + 1][row - 1],
                    state[col + 2][row - 2],
                    state[col + 3][row - 3]
                ];
                score += this.evaluateSection(section, isMaximising);
            }
        }

        return score;
    }

    /*
    Performs the minimax algorithm to a given depth
    Recursive function to depth = 0 or terminal state
    Uses 100 for absolute wins/losses. (Positive for maximiser, Negative for minimiser)
    Returns the best score and move for the maximiser
    */
    minimaxSearch(state, depth, isMaximising) {
        // Check for terminal node or depth 0
        const isTerminal = this.isTerminalNode(state);
        if (depth === 0 || isTerminal.terminate) {
            if (isTerminal.terminate) {
                switch (isTerminal.terminateBy) {
                    case "maximiser":
                        return 100000 * depth;
                    case "minimiser":
                        return -100000 * depth;
                    case "draw":
                        return 0;
                    default:
                        logger.error("Unknown terminal state", 500);
                        return 0;
                }
            }
            // Depth is 0 but not terminal. Score the board.
            return this.scoreState(state, isMaximising);
        }

        let validMoves = this.getValidMoves(state);
        let value = isMaximising ? -100000 : 100000; // Switch value based on isMaximising
        validMoves.forEach(move => {
            let newState = this.move(state, move, isMaximising ? this.maximiser : this.minimiser);
            if (isMaximising) {
                value = Math.max(value, this.minimaxSearch(newState, depth - 1, false));
            } else {
                value = Math.min(value, this.minimaxSearch(newState, depth - 1, true));
            }
        });
        return value;
    };

    /*
    Get the best move for the maximiser by evaluating all valid moves with minimax
    Returns the best move (column index)
     */
    getBestMove() {
        let bestScore = -100000;
        let bestMove = null;
        let validMoves = this.getValidMoves(this.stateZero);

        validMoves.forEach(move => {
            let newState = this.move(this.stateZero, move, this.maximiser);
            let score = this.minimaxSearch(newState, this.depth - 1, false);
            logger.debug(`Minimax evaluated column ${move} with score ${score}`, 102);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

        });

        this.bestColumn = bestMove;
        logger.info(`Best move determined by minimax: Column ${bestMove} with score ${bestScore}`, 200);
        this.stateZero = this.move(this.stateZero, bestMove, this.maximiser);
        return this.bestColumn;
    }

    /*
    Check if the board state is a win for the given player
    Returns true if win, false if not
    */
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

    /*
    Check if the board state is a draw (no more valid moves)
    Returns true if draw, false if not
    */
    checkDraw(state) {
        if (!state) {
            logger.error("No state provided to checkDraw", 500);
            return false;
        }
        for (let column = 0; column < state.length; column++) {
            for (let row = 0; row < state[0].length; row++) {
                if (state[column][row] === null) {
                    return false;
                }
            }
        }
        return true;
    }

    /*
    Get an array of valid columns for the given board state (columns that are not full)
    */
    getValidMoves(state) {
        const validMoves = [];
        for (let col = 0; col < state.length; col++) {
            if (state[col][0] === null) {
                validMoves.push(col);
            }
        }
        return validMoves;
    }

}
export default minimax;