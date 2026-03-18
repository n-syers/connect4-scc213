// Imports and dependencies
import logger from '../utils/logger.js';


// Game class represents a single game instance
// Manages game state, player actions, and game conditions
export class game {

    // Default properties and values for game instance
    gamemode = null;
    rows = 6; // Number of rows on the board
    columns = 7; // Number of columns on the board
    board = Array.from({ length: this.columns }, () => Array(this.rows).fill(null)); // 2D array representing the game board. board[column][row]

    activePlayer = -1; // Tracks whos turn it is. -1 = inactive game, 0 = player 1, 1 = player 2

    // Player management arrays. Index 0 = Player 1, Index 1 = Player 2
    players = Array(2).fill(-1); // Filled with player UUIDs (-1 is empty)
    playerConditionCheck = Array(2).fill(false); // Used for checking if both players agree to start/reset
    usernames = Array(2).fill(null); // Tracks player usernames

    // Construct the game instance with specified gamemode
    constructor(gamemode) {
        this.gamemode = gamemode;
    }


    // Handles player joining the game instance
    // Returns boolean indicating success
    async joinGame(uuid, username) {

        uuid = parseInt(uuid); // Ensure UUID is an integer

        // Check if player is already in the game
        if (this.players.includes(uuid)) {
            logger.info(`${username} is already in the game.`, 200);
            return true;
        }

        // Add player to the first available slot
        if (this.players[0] === -1) {

            logger.info(`${username} joined successful.`, 200);

            this.players[0] = uuid; // Set UUID to player slot 0

            this.usernames[0] = username; // Set username to player slot 0

            return true;

        } else if (this.players[1] === -1) {

            logger.info(`${username} joined successful.`, 200);

            this.players[1] = uuid; // Set UUID to player slot 1

            this.usernames[1] = username; // Set username to player slot 1

            return true;
        }

        // Both players are already in the game
        logger.error(`Max people in game (${this.players} | ${this.usernames})`, 422);
        return false;
    }

    // Switch which player is active. Tracks turn changes
    async set_activePlayer() {
        switch (this.activePlayer) {
            case 1:
            case -1:
                this.activePlayer = 0; // Switch turn to player 1 if currently player 2 or game is inactive
                break; async
            case 0:
                this.activePlayer = 1; // Switch turn to player 2 if currently player 1
                break;
            default: // Unexpected value for activePlayer
                logger.error(`Unexpected value for activePlayer: ${this.activePlayer}`, 422);
                break;
        }
    }

    // Checks if the specified player has won the game based on the current board state
    checkWin(player, board = this.board) {

        // Check ROWS for win in 4 cell sections
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns - 3; col++) {

                // Check 4 cells next to each other in the row (left-right)
                if (board[col][row] === player &&
                    board[col + 1][row] === player &&
                    board[col + 2][row] === player &&
                    board[col + 3][row] === player) {
                    return true;
                }
            }
        }

        // Check COLUMNS for win in 4 cell sections
        for (let col = 0; col < this.columns; col++) {
            for (let row = 0; row < this.rows - 3; row++) {

                // Check 4 cells next to each other in the column (bottom-top)
                if (board[col][row] === player &&
                    board[col][row + 1] === player &&
                    board[col][row + 2] === player &&
                    board[col][row + 3] === player) {
                    return true;
                }
            }
        }

        // Check DIAGONAL (bottom-left to top-right) for win  in 4 cell sections
        for (let col = 0; col < this.columns - 3; col++) {
            for (let row = 3; row < this.rows; row++) {

                // Check 4 cells next to each other in the diagonal (bottom-left to top-right)
                if (board[col][row] === player &&
                    board[col + 1][row - 1] === player &&
                    board[col + 2][row - 2] === player &&
                    board[col + 3][row - 3] === player) {
                    return true;
                }
            }
        }

        // Check DIAGONAL (top-left to bottom-right) for win  in 4 cell sections
        for (let col = 0; col < this.columns - 3; col++) {
            for (let row = 0; row < this.rows - 3; row++) {

                // Check 4 cells next to each other in the diagonal (top-left to bottom-right)
                if (board[col][row] === player &&
                    board[col + 1][row + 1] === player &&
                    board[col + 2][row + 2] === player &&
                    board[col + 3][row + 3] === player) {
                    return true;
                }
            }
        }

        // No win found.
        return false;
    }

    // Check if a draw has occured
    hasDraw(board = this.board) {

        // For each column and row (each cell)
        for (let column = 0; column < this.columns; column++) {
            for (let row = 0; row < this.rows; row++) {

                // Check if cell is null (empty). If any cell is empty, draw condition not met
                if (board[column][row] === null) {
                    return false;
                }
            }
        }
        return true;
    }

    // Handle move made by player
    async move(uuid, y) {
        try {
            logger.trace(`Player ${uuid} is attempting to move in column ${y}`, 200);

            uuid = parseInt(uuid); // Ensure UUID is an integer

            let player = this.activePlayer; // Get the current active plaayer before modification

            // Generate a default move message as JSON string
            let moveMessage = JSON.stringify({
                success: false,
                whoMoved: player,
                whoNext: player,
                row: 0,
                column: y,
                win: false
            });

            // If move is out of turn (player 2 tries to move on player 1's turn), return failed move message
            if (this.players[player] !== uuid) {
                logger.info(`Invalid move attempted by player ${uuid} in column {${y}}`, 100);
                logger.info(`Active player is ${this.players[player]}`, 100);
                return moveMessage;
            }

            // If move is invalid (column is full), return failed move message
            if (this.board[y][0] !== null) {
                logger.info(`Invalid move column {${y}}`, 100);
                return moveMessage;
            }

            // Process the move by placing a token in the lowest available row in the specified column
            for (let i = (this.rows - 1); i >= 0; i--) {
                if (this.board[y][i] === null) {
                    this.board[y][i] = player;

                    // Switch active player
                    await this.set_activePlayer();

                    // Generate move message
                    moveMessage = JSON.stringify({
                        type: "newMove",
                        success: true,
                        whoMoved: player,
                        whoNext: this.activePlayer,
                        row: i,
                        column: y,
                        win: await this.checkWin(player),
                        draw: await this.hasDraw()
                    });

                    // Return message
                    return moveMessage;
                }
            }

            // Catch erros and log them, then return a failed move message
        } catch (error) {
            logger.error(`[gameClass.move()] Error processing move for player ${uuid} in column ${y}: ${error.message}`, 500);
            return JSON.stringify({
                success: false,
                whoMoved: -1,
                whoNext: -1,
                row: -1,
                column: -1,
                win: false
            });
        }
    }

    // Handle player ready ups for starting the game or resetting the board
    async readyPlayer(uuid, username) {

        uuid = parseInt(uuid); // Ensure UUID is an integer

        logger.trace(`Player ${uuid} is readying up.`, 200);

        // If both players are ready, return false to indicate no need to ready up
        if (this.playerConditionCheck[1] === true && this.playerConditionCheck[0] === true) {
            return false;
        }

        // If gamemode is not online pvp, only 1 player is required to ready up
        if (this.gamemode !== "opvp") {

            // Set both players to ready
            this.playerConditionCheck[0] = true;
            this.playerConditionCheck[1] = true;

            // Set username for the single player mode
            if (username) {
                this.usernames[0] = username;
            };

            return true;
        }

        // Set ready up depending on which player is readying up
        if (this.players[0] === uuid) {

            this.playerConditionCheck[0] = true; // Set ready condition for player 1

            // If username is provided, set it for the player
            if (username) {
                this.usernames[0] = username;
            };
        } else {

            this.playerConditionCheck[1] = true; // Set ready condition for player 2

            // If username is provided, set it for the player
            if (username) {
                this.usernames[1] = username;
            }
        }

        return true;
    }

    // Returns the gamemode for the game instance
    get_gamemode() {
        return this.gamemode;
    }

    // Check if both players are ready to start the game
    async canStart() {

        let start = false;

        // If both players are ready
        if (this.playerConditionCheck[1] === true && this.playerConditionCheck[0] === true) {

            // Set active player to player 1
            await this.set_activePlayer();

            start = true; // Set active state


            this.playerConditionCheck = Array(2).fill(false); // Reset condition checks
        }

        // Construct a message indicating whether the game can start
        const message = JSON.stringify({
            type: "startGame",
            startStatus: start,
            firstPlayerUUID: this.players[this.activePlayer]
        });

        return message;
    }

    // Get the player UUIDs for the game instance
    getPlayers() {
        return this.players;
    }


    // Handle reset requests from players
    addResetRequest(uuid) {

        logger.trace(`Player ${uuid} is requesting a reset.`, 200);

        uuid = parseInt(uuid); // Ensure UUID is an integer

        // Construct default message as JSON object
        let jsonMessage = {
            requestStatus: false,
            canReset: false,
            waitingOn: -1
        };

        // Skip all checks if not online pvp
        if (this.gamemode !== "opvp") {

            // Set both players to ready for reset
            this.playerConditionCheck[0] = true;
            this.playerConditionCheck[1] = true;

            // Set message contents to true
            jsonMessage.canReset = true;
            jsonMessage.requestStatus = true;

            // Stringify for return message
            return JSON.stringify(jsonMessage);
        }

        // Set reset request
        let player = (uuid == this.players[0]) ? 1 : 0;
        this.playerConditionCheck[player] = true;

        // Check if game can be reset (both players have requested reset)
        if (this.playerConditionCheck[0] === true && this.playerConditionCheck[1] === true) {
            jsonMessage.canReset = true; // Set can reset to true if both players have requested reset
        } else {
            // If game cannot be reset, set waiting on to the player who has not requested reset yet
            jsonMessage.waitingOn = (uuid == this.players[0]) ? this.players[1] : this.players[0];
        }

        // Return reset message as JSON string
        return JSON.stringify(jsonMessage);
    }

    // Reset the board to the default state and set game to player 1's turn
    resetBoard() {

        // Reset board to empty state (all nulls)
        this.board = Array.from({ length: this.columns }, () => Array(this.rows).fill(null));

        // Set active player to player 1 (0)
        this.activePlayer = -1;
        this.set_activePlayer();

        // Set conditional checks
        this.playerConditionCheck = Array(2).fill(false);
    }

    // Return the current state of the board as a 2D array
    async getBoard() {
        return this.board;
    }

    // Return the usernames of the players in the game instance
    async getUsernames() {
        return this.usernames;
    }

    // Set the board state to a new board
    async setBoard(newBoard) {
        this.board = newBoard;
    }

    // Returns the active player (0 = Player 1, 1 = Player 2, -1 = inactive game)
    async getActivePlayer() {
        return this.activePlayer;
    }

    // Resets conditional checks for both players
    async resetConditionals() {
        this.playerConditionCheck = Array(2).fill(false);
    }
}
