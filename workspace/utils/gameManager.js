import * as logger from './logger.js';
import { game } from '../modules/gameClass.js';
import { minimax } from '../modules/minimax.js';
import * as dbm from './databaseManager.js';

const gameMap = new Map();

dbm.open_connection(); // Keep database connection open for duration of server uptime.


async function createGame(gamemode) {
    let gamecode = await generateGameCode();
    let temp_game = new game(gamemode);
    gameMap.set(gamecode, temp_game);
    logger.debug(`Game in gameMap Successfully: ${gameMap.has(gamecode)}`);
    return gamecode;
}

async function generateGameCode() {
    // generate unique code
    let temp_gamecode = Math.floor(Math.random() * 900_000) + 100_000;
    while (gameMap.has(temp_gamecode)) {
        temp_gamecode = Math.floor(Math.random() * 900_000) + 100_000;
    }
    logger.trace(`Generated Game Code: ${temp_gamecode}`, 201);
    return temp_gamecode;
}

async function verifyGameCode(gameCode) {
    const code = parseInt(gameCode);
    return gameMap.has(code);
}

async function move(gamecode, y, uuid) {
    const codeIsValid = await verifyGameCode(gamecode);
    if (!codeIsValid) {
        logger.warn(`${uuid} move request invalid for gamecode: ${gamecode}`);
        let jsonMoveMessage = JSON.stringify({
            type: "newMove",
            success: false,
            whoMoved: -1,
            whoNext: -1,
            row: -1,
            column: -1,
            win: false
        });
        return jsonMoveMessage;
    };
    const code = parseInt(gamecode);
    const temp_game = gameMap.get(code);
    const gamemode = await temp_game.get_gamemode(gamecode);
    const move_success = await temp_game.move(uuid, y);

    // Check win/draw conditions and update database if game has concluded
    let parsedMove = JSON.parse(move_success);
    let player1 = "Unknown";
    let player2 = "Unknown";
    let winner = "Unkown";
    if (parsedMove.win || parsedMove.draw) {
        switch (gamemode) {
            case "lpvp":
                player1 = temp_game.usernames[0];
                dbm.addGame(player1, player1, null); // Cannot win local matches, so winner is set to null.
                logger.info(`Game concluded. Recorded result in database.`, 201);
                break;
            case "opvp":
                player1 = temp_game.usernames[0];
                player2 = temp_game.usernames[1];
                winner = parsedMove.win ? temp_game.usernames[parsedMove.whoMoved] : null;
                dbm.addGame(player1, player2, winner);
                logger.info(`Game concluded. Recorded result in database.`, 201);
                break;
            case "pvain":
            case "pvaim":
            case "pvaih":
                player1 = temp_game.usernames[0];
                winner = (parsedMove.win && parsedMove.whoMoved == 1) ? temp_game.usernames[0] : null;
                dbm.addGame(player1, null, winner);
                break;
            default:
                logger.warn("No Gamemode Passed", 500);
        }
    }
    return move_success;
}

async function joinExistingGame(gamecode, uuid) {
    const code = parseInt(gamecode);
    if (await verifyGameCode(code)) {
        const temp_game = gameMap.get(code);
        const join_success = await temp_game.joinGame(uuid);
        return join_success;
    };
    return false;
}

function resetGame(gamecode) {
    const temp_game = gameMap.get(gamecode);
    if (temp_game) {
        temp_game.resetBoard();
    }
}

function canStart(gamecode) {
    const temp_game = gameMap.get(gamecode);
    const canStart = temp_game.canStart();
    logger.trace("gameManager.canStart" + canStart, 200);
    return canStart;
}

async function set_readyPlayer(gamecode, uuid, username) {
    logger.debug(gamecode)
    const temp_game = gameMap.get(gamecode);
    const success = await temp_game.readyPlayer(uuid, username);
    logger.debug(success)
    return success;
}

async function getGamemode(gamecode) {
    gamecode = parseInt(gamecode);
    logger.debug("Retrieving Game", 102);
    const temp_game = gameMap.get(gamecode);
    const gamemode = await temp_game.get_gamemode();
    return gamemode;
}

async function getPlayerUUIDs(gamecode) {
    logger.debug("Retrieving Player UUIDs", 102);
    const temp_game = gameMap.get(gamecode);
    const players = await temp_game.getPlayers();
    if (!players) {
        logger.warn(`No players found for gamecode: ${gamecode}`);
        return null;
    }
    return players;
}

async function moveAi(gamecode, gamemode) {
    let aiMove;
    switch (gamemode) {
        case ("pvain"):
            aiMove = await handleNaiveAI(gamecode);
            break;
        case ("pvaim"):
            aiMove = await handleMediumAI(gamecode);
            break;
        case ("pvaih"):
            aiMove = await handleHardAI(gamecode);
            break;
    }
    return aiMove;
}

async function handleNaiveAI(gamecode) {
    const temp_game = gameMap.get(gamecode);
    logger.debug("Processing Naive AI Move", 102);
    let column = Math.floor(Math.random() * 7);
    let aiMove = await temp_game.move(-1, column);
    let parsedData = JSON.parse(aiMove);

    while (!parsedData.success) {
        logger.debug(`Naive AI Move Failed. Retrying...`, 102);
        logger.trace(aiMove, 201);
        column = Math.floor(Math.random() * 7);
        aiMove = await temp_game.move(-1, column);
        parsedData = JSON.parse(aiMove);
    }
    return aiMove
}

async function handleMediumAI(gamecode) {
    const temp_game = gameMap.get(gamecode);
    logger.debug("Processing Medium AI Move", 102);
    let board = Array.from(await temp_game.getBoard());

    let aiMove = await testAiWinConditions(board, 1, temp_game);

    if (!aiMove) {
        aiMove = await testAiWinConditions(board, 0, temp_game);
    }
    if (aiMove) {
        return aiMove;
    }
    // Random move if no blocking move or winning move found
    aiMove = await handleNaiveAI(gamecode);
    return aiMove;
}

async function handleHardAI(gamecode) {

    const DEPTH = 4
    logger.debug("Processing Hard AI Move", 102);
    const temp_game = gameMap.get(gamecode);
    let board = Array.from(await temp_game.getBoard());
    const minimaxAI = new minimax(board, DEPTH, -1, 0);
    let bestMove = minimaxAI.getBestMove();
    let aiMove = await temp_game.move(-1, bestMove);
    let parsedData = JSON.parse(aiMove);

    while (!parsedData.success) {
        logger.debug(`Hard AI Move Failed. Retrying...`, 102);
        logger.trace(aiMove, 201);
        aiMove = await temp_game.move(-1, bestMove);
        parsedData = JSON.parse(aiMove);
    }
    return aiMove;
}

async function testAiWinConditions(board, player, temp_game) {
    for (let col = 0; col < board.length; col++) {
        for (let row = board[col].length - 1; row >= 0; row--) {
            if (board[col][row] === null) {
                board[col][row] = player;
                let hasWon = temp_game.checkWin(player, board);
                if (hasWon) {
                    logger.debug(`Winning move located for player ${player} at Column ${col} (Row ${row})`, 102);
                    let rowBelow = row + 1;

                    // If the token below the winning move is empty, loop again.
                    if (board[col][rowBelow] === null) {
                        board[col][row] = null;
                        break;
                    };

                    board[col][row] = null;
                    let aiMove = await temp_game.move(-1, col);
                    return aiMove;
                } else {
                    board[col][row] = null;
                }
            }
        }
    }
    return null;
}

async function addResetRequest(gamecode, uuid) {
    const temp_game = gameMap.get(gamecode);
    let status = await temp_game.addResetRequest(uuid);
    return status;
}

async function closeLobby(gamecode) {
    try {
        gameMap.delete(parseInt(gamecode));
    } catch (error) {
        logger.error(`Error closing lobby for gamecode: ${gamecode} | Error: ${error.message}`, 500);
    }
}

process.on('exit', () => {
    logger.info('Server shutting down. Closing database connection.', 200);
    dbm.close_connection();
});

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message} | Stack: ${err.stack}`, 500);
    dbm.close_connection();
    process.exit(1);
});

export default {
    createGame,
    verifyGameCode,
    move,
    set_readyPlayer,
    canStart,
    getPlayerUUIDs,
    getGamemode,
    moveAi,
    addResetRequest,
    resetGame,
    closeLobby,
    joinExistingGame
};

export { createGame, closeLobby, verifyGameCode, move, getGamemode, joinExistingGame, set_readyPlayer, canStart, getPlayerUUIDs, moveAi, resetGame, addResetRequest };