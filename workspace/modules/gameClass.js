import logger from '../utils/logger.js';

export class game {
    gamemode = null;
    players = Array(2).fill(-1); // Filled with player UUIDs
    rows = 6;
    columns = 7;
    activePlayer = -1;
    playerConditionCheck = Array(2).fill(false);
    usernames = Array(2).fill(null);
    board = Array.from({ length: this.columns }, () => Array(this.rows).fill(null));

    constructor(gamemode, activePlayer = -1) {
        this.gamemode = gamemode;
        this.activePlayer = activePlayer;
        logger.trace(this.players);
    }

    async joinGame(uuid, username) {
        uuid = parseInt(uuid);
        if (this.players[0] === -1) {
            logger.info(`${username} joined successful.`, 200);
            this.players[0] = uuid;
            this.usernames[0] = username;
            return true;
        } else if (this.players[1] === -1) {
            logger.info(`${username} joined successful.`, 200);
            this.players[1] = uuid;
            this.usernames[1] = username;
            return true;
        }
        logger.error(`Max people in game (${this.players} | ${this.usernames})`, 422);
        return false;
    }

    async set_activePlayer() {
        switch (this.activePlayer) {
            case 1:
            case -1:
                this.activePlayer = 0;
                break; async
            case 0:
                this.activePlayer = 1;
                break;
            default:
                logger.error(`Unexpected value for activePlayer: ${this.activePlayer}`, 422);
                break;
        }
    }

    checkWin(player, board = this.board) {

        // Check ROWS for win
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns - 3; col++) {
                if (board[col][row] === player &&
                    board[col + 1][row] === player &&
                    board[col + 2][row] === player &&
                    board[col + 3][row] === player) {
                    return true;
                }
            }
        }

        // Check COLUMNS for win
        for (let col = 0; col < this.columns; col++) {
            for (let row = 0; row < this.rows - 3; row++) {
                if (board[col][row] === player &&
                    board[col][row + 1] === player &&
                    board[col][row + 2] === player &&
                    board[col][row + 3] === player) {
                    return true;
                }
            }
        }

        // Check DIAGONAL (bottom-left to top-right) for win
        for (let col = 0; col < this.columns - 3; col++) {
            for (let row = 3; row < this.rows; row++) {
                if (board[col][row] === player &&
                    board[col + 1][row - 1] === player &&
                    board[col + 2][row - 2] === player &&
                    board[col + 3][row - 3] === player) {
                    return true;
                }
            }
        }

        // Check DIAGONAL (top-left to bottom-right) for win
        for (let col = 0; col < this.columns - 3; col++) {
            for (let row = 0; row < this.rows - 3; row++) {
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

    hasDraw(board = this.board) {
        for (let column = 0; column < this.columns; column++) {
            for (let row = 0; row < this.rows; row++) {
                if (board[column][row] === null) {
                    return false;
                }
            }
        }
        return true;
    }

    async move(uuid, y) {
        uuid = parseInt(uuid);
        let player = this.activePlayer;
        let moveMessage = JSON.stringify({
            success: false,
            whoMoved: player,
            whoNext: player,
            row: 0,
            column: y,
            win: false
        });
        if (this.players[player] !== uuid) {
            logger.info(`Invalid move attempted by player ${uuid} in column {${y}}`, 100);
            logger.info(`Active player is ${this.players[player]}`, 100);
            return moveMessage;
        }
        if (this.board[y][0] !== null) {
            logger.info(`Invalid move column {${y}}`, 100);
            return moveMessage;
        }

        for (let i = (this.rows - 1); i >= 0; i--) {
            if (this.board[y][i] === null) {
                this.board[y][i] = player;
                await this.set_activePlayer();
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
                return moveMessage;
            }
        }
        logger.info(`No available move in column ${y}`, 100);
        return moveMessage;
    }

    async readyPlayer(uuid, username) {
        uuid = parseInt(uuid);
        logger.trace(this.players);
        if (this.playerConditionCheck[1] === true && this.playerConditionCheck[0] === true) {
            return false;
        }

        if (this.gamemode !== "opvp") {
            this.playerConditionCheck[0] = true;
            this.playerConditionCheck[1] = true;
            if (username) this.usernames[0] = username;
            return true;
        }

        if (this.players[0] === uuid) {
            this.playerConditionCheck[0] = true;
            if (username) this.usernames[0] = username;
        } else {
            this.playerConditionCheck[1] = true;
            if (username) this.usernames[1] = username;
        }
        return true;
    }

    get_gamemode() {
        return this.gamemode;
    }
    async canStart() {
        let start = false;
        if (this.playerConditionCheck[1] === true && this.playerConditionCheck[0] === true) {
            await this.set_activePlayer();
            start = true;
            this.playerConditionCheck = Array(2).fill(false);
        }
        const message = JSON.stringify({
            type: "startGame",
            startStatus: start,
            firstPlayerUUID: this.players[this.activePlayer]
        });
        logger.trace("gameClass.canStart" + message, 200);
        return message;
    }

    getPlayers() {
        return this.players;
    }

    addResetRequest(uuid) {
        uuid = parseInt(uuid);

        let jsonMessage = {
            requestStatus: false,
            canReset: false,
            waitingOn: -1
        };

        // Skip all checks if not online pvp
        if (this.gamemode !== "opvp") {
            this.playerConditionCheck[0] = true;
            this.playerConditionCheck[1] = true;
            jsonMessage.canReset = true;
            jsonMessage.requestStatus = true;
            return JSON.stringify(jsonMessage);
        }

        // Set reset request
        let player = (uuid == this.players[0]) ? 1 : 0;
        this.playerConditionCheck[player] = true;

        // Check if canReset
        if (this.playerConditionCheck[0] === true && this.playerConditionCheck[1] === true) {
            jsonMessage.canReset = true;
        } else {
            jsonMessage.waitingOn = (uuid == this.players[0]) ? this.players[1] : this.players[0];
        }

        return JSON.stringify(jsonMessage);
    }

    resetBoard() {
        this.board = Array.from({ length: this.columns }, () => Array(this.rows).fill(null));
        this.activePlayer = -1;
        this.set_activePlayer();
        this.playerConditionCheck = Array(2).fill(false);
    }

    async getBoard() {
        return this.board;
    }

    async getUsernames() {
        return this.usernames;
    }

    async setBoard(newBoard) {
        this.board = newBoard;
    }

    async getActivePlayer() {
        return this.activePlayer;
    }
}
