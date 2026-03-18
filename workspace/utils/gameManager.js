// Import modules and dependencies
import * as logger from './logger.js';
import { game } from '../modules/gameClass.js';
import { minimax } from '../modules/minimax.js';
import * as dbm from './databaseManager.js';

// Create a map of all active games
const gameMap = new Map();

// Create an instance of a game and add it to the map
// Returns the gamecode as integer
async function createGame(gamemode) {

    let gamecode = await generateGameCode(); // Generate unique gamecode

    let temp_game = new game(gamemode); // Create new game instance with specified gamemode

    gameMap.set(gamecode, temp_game); // Add game instance to map with gamecode as key

    logger.debug(`Game in gameMap Successfully: ${gameMap.has(gamecode)}`);
    return gamecode;
}

// Generate a unique 6-digit gamecode
// Returns integer
async function generateGameCode() {

    // Generate a random number between 100000 and 999999
    let temp_gamecode = Math.floor(Math.random() * 900_000) + 100_000;

    // Check if the code is unique, if not, generate a new code
    while (gameMap.has(temp_gamecode)) {
        temp_gamecode = Math.floor(Math.random() * 900_000) + 100_000;
    }

    logger.trace(`Generated Game Code: ${temp_gamecode}`, 201);
    return temp_gamecode;
}

// Handle verification logic for a given gamecode
// Returns true if gamecode matches game instance, false otherwise
async function verifyGameCode(gameCode) {
    const code = parseInt(gameCode); // Ensure gamecode is an integer
    return gameMap.has(code); // Check if gamecode exists in the game map
}

// Handle move logic for a given gamecode, column, and player UUID
async function move(gamecode, y, uuid) {

    // Verify gamecode is valid before processing move
    const codeIsValid = await verifyGameCode(gamecode);

    // If gamecode is invalid, return a message
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

    // Process the move for the current game instance and player UUID
    const code = parseInt(gamecode);
    const temp_game = gameMap.get(code); // Get game instance
    const gamemode = await temp_game.get_gamemode(gamecode); // Get gamemode
    const move_success = await temp_game.move(uuid, y); // Process the move

    let parsedMove = JSON.parse(move_success); // parse the move into JSON

    let player1 = "Unknown";
    let player2 = "Unknown";
    let winner = "Unknown";

    // Check win/draw conditions and update database if game has concluded
    if (parsedMove.win || parsedMove.draw) {
        // Switch depending on gamemode
        switch (gamemode) {
            case "lpvp":
                player1 = temp_game.usernames[0];
                dbm.addGame(player1, player1, null); // Cannot win local matches, so winner is set to null.
                logger.info(`Game concluded. Recorded result in database.`, 201);
                break;
            case "opvp":
                player1 = temp_game.usernames[0];
                player2 = temp_game.usernames[1];
                // Determine the winner based on the move data
                winner = parsedMove.win ? temp_game.usernames[parsedMove.whoMoved] : null;
                dbm.addGame(player1, player2, winner); // Record game result in database
                logger.info(`Game concluded. Recorded result in database.`, 201);
                break;
            case "pvain":
            case "pvaim":
            case "pvaih":
                player1 = temp_game.usernames[0];
                // Determine if the player won. AI is recorded as null
                winner = (parsedMove.win && parsedMove.whoMoved == 1) ? temp_game.usernames[0] : null;
                dbm.addGame(player1, null, winner); // Record game result in database
                logger.info(`Game concluded. Recorded result in database.`, 201);
                break;

            // If gamemode is unrecognised
            default:
                logger.warn("No Gamemode Passed", 500);
        }
    }
    return move_success;
}

// Handle logic for a player to join an exisiting game
// Returns bool
async function joinExistingGame(gamecode, uuid) {
    // Verify the gamecode matches a game instance
    const code = parseInt(gamecode);
    if (await verifyGameCode(code)) {

        const temp_game = gameMap.get(code); // Get game instance

        const join_success = await temp_game.joinGame(uuid); // Join game with player UUID
        return join_success;
    };
    return false;
}

// Handle logic for resetting a game board for a given gamecode
function resetGame(gamecode) {
    gamecode = parseInt(gamecode);
    const temp_game = gameMap.get(gamecode); // Get game instance

    // Check if game instance exists
    if (temp_game) {
        temp_game.resetBoard(); // reset the game board for the instance
        logger.info(`Game board reset for gamecode: ${gamecode}`, 201);
    }
}

// Check if the game can start
// Returns boolean
function canStart(gamecode) {
    gamecode = parseInt(gamecode);
    const temp_game = gameMap.get(gamecode); // Get game instance
    const canStart = temp_game.canStart(); // Check if game can start
    logger.trace("gameManager.canStart" + canStart, 200);
    return canStart;
}

// Handle logic for ready ups
// Returns boolean
async function set_readyPlayer(gamecode, uuid, username) {
    gamecode = parseInt(gamecode);
    const temp_game = gameMap.get(gamecode); // Get game instance
    const success = await temp_game.readyPlayer(uuid, username); // Set player as ready
    return success;
}

// Retrieve the gamemode for a given gamecode
// Returns string
async function getGamemode(gamecode) {
    gamecode = parseInt(gamecode);
    const temp_game = gameMap.get(gamecode); // Get game instance
    const gamemode = await temp_game.get_gamemode(); // Get gamemode of the game
    return gamemode;
}

// Retrieve the player UUIDs for a given gamecode
// Returns array of UUIDs (max 2), null if no players found
async function getPlayerUUIDs(gamecode) {
    gamecode = parseInt(gamecode);

    logger.debug(`Retrieving player UUIDs for gamecode: ${gamecode}`, 102);

    const temp_game = gameMap.get(gamecode); // Get game instance
    const players = await temp_game.getPlayers(); // Get player UUIDs

    // If no players found, log warning and return null
    if (!players) {
        logger.warn(`No players found for gamecode: ${gamecode}`, 201);
        return null;
    }
    return players;
}

// Handle logic for AI moves based on gamemode
async function moveAi(gamecode, gamemode) {
    let aiMove;
    // Switch logic depending on gamemode
    switch (gamemode) {
        case ("pvain"): // Naive AI
            aiMove = await handleNaiveAI(gamecode);
            break;
        case ("pvaim"): // Medium AI
            aiMove = await handleMediumAI(gamecode);
            break;
        case ("pvaih"): // Hard AI
            aiMove = await handleHardAI(gamecode);
            break;
    }
    // Returns move JSON string for processing on the client side
    return aiMove;
}

// Handle Naive AI moves logic
async function handleNaiveAI(gamecode) {
    logger.debug("Processing Naive AI Move", 102);

    const temp_game = gameMap.get(gamecode); // Get game instance

    let column = Math.floor(Math.random() * 7); // Generate a random column for the AI move

    let aiMove = await temp_game.move(-1, column); // Process the move

    let parsedData = JSON.parse(aiMove); // Parse the move into JSON

    // If the move fails, retry until a valid move is found
    while (!parsedData.success) {
        logger.debug(`Naive AI Move Failed (Column: ${column}). Retrying...`, 102);

        column = Math.floor(Math.random() * 7);
        aiMove = await temp_game.move(-1, column);
        parsedData = JSON.parse(aiMove);
    }
    return aiMove
}


// Handle Medium AI move logic
// Medium AI checks for 3 in a row for itself then the player.
// If no move is found, it defaults to the Naive AI
async function handleMediumAI(gamecode) {

    logger.debug("Processing Medium AI Move", 102);

    const temp_game = gameMap.get(gamecode); // Get game instance

    let board = Array.from(await temp_game.getBoard()); // Get the current board state

    let aiMove = await testAiWinConditions(board, 1, temp_game); // Check for winning moves for AI

    // If no move is found, check for winning moves for the player
    if (!aiMove) {
        aiMove = await testAiWinConditions(board, 0, temp_game);
    }

    // If a winning move is found, return the move
    if (aiMove) {
        return aiMove;
    }

    // Random move if no move found
    aiMove = await handleNaiveAI(gamecode);
    return aiMove;
}


// Handle Hard AI moves using custom Minimax algorithm.
// Algorithm fails if the player garuntees a win in the next move.
// If Minimax fails to find a valid move, falls back to Medium AI logic.
async function handleHardAI(gamecode) {

    const DEPTH = 4 // How many moves ahead the AI should calculate.

    logger.debug("Processing Hard AI Move", 102);

    // Get game state for corresponding game code
    const temp_game = gameMap.get(gamecode); // Get game instance
    let board = Array.from(await temp_game.getBoard()); // Get current board state

    const minimaxAI = new minimax(board, DEPTH, -1, 0); // Initiate Minimax with current board state, desired depth, and player numbers (AI = -1, Player = 0).

    let bestMove = minimaxAI.getBestMove(); // Generate best move using Minimax

    // No best move found. Fall back to Medium AI logic to prevent move failure.
    if (bestMove === null) {
        logger.debug(`Hard AI found no valid move. Falling back to medium AI.`, 102);
        return await handleMediumAI(gamecode);
    }

    // Process the move generated by Minimax or Medium AI
    let aiMove = await temp_game.move(-1, bestMove); // Process move
    let parsedData = JSON.parse(aiMove); // Parse move into JSON

    // If the move fails, retry until a valid move is found.
    while (!parsedData.success) {
        logger.debug(`Hard AI Move Failed (Column: ${bestMove}). Retrying...`, 102);

        bestMove = minimaxAI.getBestMove(); // Generate a new move

        // If move fails again, default to medium ai logic
        if (bestMove === null) {
            logger.debug(`Hard AI found no valid move on retry. Falling back to medium AI.`, 102);
            return await handleMediumAI(gamecode);
        }
        aiMove = await temp_game.move(-1, bestMove); // Process move
    }
    // return the successful move generated by Minimax or Medium AI for processing on the client side.
    return aiMove;
}

// Check all win conditions given a board state, player number, and game instance
async function testAiWinConditions(board, player, temp_game) {

    // For each column and row, check if placing a token in that position results in a win
    for (let col = 0; col < board.length; col++) {
        for (let row = board[col].length - 1; row >= 0; row--) {
            // If position is empty, place token
            if (board[col][row] === null) {
                board[col][row] = player; // place token
                let hasWon = temp_game.checkWin(player, board); // check win for new board state

                // Has winning move been found
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

async function resetConditionals(gamecode) {
    const temp_game = gameMap.get(gamecode);
    await temp_game.resetConditionals();
}

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message} | Stack: ${err.stack}`, 500);
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
    resetConditionals,
    joinExistingGame
};

export { createGame, closeLobby, verifyGameCode, move, getGamemode, joinExistingGame, set_readyPlayer, canStart, getPlayerUUIDs, moveAi, resetGame, resetConditionals, addResetRequest };