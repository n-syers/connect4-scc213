// Imports for the webserver
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Custom modules imported for logging, game management, and database management
const logger = require('./utils/logger.js');
const gameManager = require('./utils/gameManager.js');
const dbm = require('./utils/databaseManager.js');

// Server configuration
const port = 3000; // HTTP server port.
const openAdditionalPort = true; // Open additional port for testing (port + 1)
const wsPort = 3030; // WebSocket port
const ip = "0.0.0.0"; // IP address to listen on (localhost)

// Initiate the Express app, HTTP server, and WebSocket server
const app = express()
const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

// Map to store WebSocket connections with their corresponding UUIDs
const socketMapUUID = new Map();

dbm.open_connection(); // Keep database connection open for duration of server uptime.

// WebSocket connection handling
// Assigns each new connection a unique UUID and sets up message and close event handlers
wss.on('connection', (ws, req) => {
    logger.info("Client Connected to WebSocket");

    let uuid = generateSocketUUID(); // Generates a unique UUID

    ws.id = uuid; // Assign the websocket the ID
    socketMapUUID.set(uuid, ws); // Store the connection

    ws.send(JSON.stringify({ type: "setUUID", socketId: uuid })); // Send the UUID to the client
    logger.info(`Assigned UUID ${uuid} to new WebSocket connection`, 201);

    // WS message handler. No messages are expected from the client
    ws.on('message', (message) => {
        logger.trace(`Received WebSocket message from ${uuid}: ${message}`, 102);
    });

    // WS close handler. Removes the connection from the map on disconnect to save memory
    ws.on('close', () => {
        socketMapUUID.delete(ws.id);
        logger.info(`WebSocket connection with UUID ${uuid} closed`, 200);
    });
})

// Handle HTTP upgrade to websocket connection
server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
    });
});

// Generate a unique UUID for a client
// Returns a random 6 digit number
function generateSocketUUID() {

    // Generate a random number between 100000 and 999999
    let temp_uuid = Math.floor(Math.random() * 900_000) + 100_000;

    // Ensure the number is unique. If not, generate a new one.
    while (socketMapUUID.has(temp_uuid)) {
        temp_uuid = Math.floor(Math.random() * 900_000) + 100_000;
    }
    logger.trace(`Generated unique UUID for WebSocket connection: ${temp_uuid}`, 201);
    return temp_uuid;
};

// Retrieve a WebSocket connection with a specific UUID
// Returns a websocket object if found, otherwise returns undefined
function getWebSocketByUUID(uuid) {
    return socketMapUUID.get(uuid);
}

// Configure app to ignore cors and parse JSON automatically
app.use(cors());
app.use(express.json());

// Log all requests
// Logs the IP, request method, and URL of each incoming requests
// Set to non-blocking with next()
app.use((req, res, next) => {
    logger.info(`[${req.ip}] has requested [${req.method}] for [${req.url}]`, 102);
    next();
})

// Redirect to gameboard
app.get('/gameboard', (req, res) => {
    res.redirect(path.join('gameboard.html'));
});

// Redirect to index.html. Provides read-only access to public folder for static files
app.use('/', express.static(path.join(__dirname, 'public')));

// Retrieve leaderboard data based on specified criteria
// Returns JSON with leaderboard data or error message
app.post("/leaderboard", async (req, res) => {
    logger.info(`Processing leaderboard request.`, 102);
    const leaderboardBy = req.body.leaderboardBy; // Criteria to rank
    let leaderboardData;
    // Depending on criteria, run different SQL queries and get leaderboard data
    switch (leaderboardBy) {
        case "mostGamesStarted":
            leaderboardData = await dbm.getMostGamesStarted();
            break;
        case "mostWins":
            logger.warn("Most Wins Not Implemented.", 400);
            leaderboardData = await dbm.getMostWins();
            break;
        default:
            logger.warn(`Invalid leaderboardBy value: ${leaderboardBy}. Defaulting to mostGamesStarted.`, 400);
            leaderboardData = await dbm.getMostGamesStarted();
    }
    // Check leaderboard data is not empty
    if (leaderboardData) {
        logger.debug(`Leaderboard data retrieved successfully.`, 200);
        res.status(200).json(leaderboardData); // Return leaderboard data as JSON object
    } else { // If leaderboard data is empty, log error and return same error message
        logger.error(`Failed to retrieve leaderboard data.`, 500);
        res.status(500).json({ error: 'Failed to retrieve leaderboard data' }); // Return error message
    }
})

// Start new local player vs player game.
app.get("/lpvp", async (req, res) => {
    try {
        // Create game and "join" with both players being the same local user (UUID -1)
        const gamecode = await gameManager.createGame("lpvp", -1);
        const successP1 = await gameManager.joinExistingGame(parseInt(gamecode), -1);
        const successP2 = await gameManager.joinExistingGame(parseInt(gamecode), -1);

        // Return gamecode and gamemode to client
        res.status(200).json({
            gamemode: "lpvp",
            gameCode: gamecode,
        });
        // If any errors occur, catch them and return them to the client
    } catch (error) {
        logger.error(error, 500);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Start new player vs naive AI game.
app.get("/pvain", async (req, res) => {
    try {
        // Create game and force AI to join with UUID -1
        const gamecode = await gameManager.createGame("pvain", -1);
        const success = await gameManager.joinExistingGame(parseInt(gamecode), -1);

        // Return gamecode and gamemode to client
        res.status(200).json({
            gamemode: "pvain",
            gameCode: gamecode,
        });
        // Catch any errors and return them to the client
    } catch (error) {
        logger.error(error, 500);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Start new player vs medium AI game.
app.get("/pvaim", async (req, res) => {
    try {

        // Create game and force AI to join with UUID -1
        const gamecode = await gameManager.createGame("pvaim", -1);
        const success = await gameManager.joinExistingGame(parseInt(gamecode), -1);

        res.status(200).json({
            gamemode: "pvaim",
            gameCode: gamecode,
        });
    } catch (error) {
        logger.error(error, 500);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Start new player vs hard AI game.
app.get("/pvaih", async (req, res) => {
    try {
        const gamecode = await gameManager.createGame("pvaih", -1);
        const success = await gameManager.joinExistingGame(parseInt(gamecode), -1);

        // Return gamecode and gamemode to client
        res.status(200).json({
            gamemode: "pvaih",
            gameCode: gamecode,
        });
        // Catch any errors and return them to the client
    } catch (error) {
        logger.error(error, 500);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Start new ONLINE pvp game.
app.get("/opvp", async (req, res) => {
    try {
        // Create game without joining, as players will join separately with their UUIDs
        const gamecode = await gameManager.createGame("opvp");

        // Send gamecode and gamemode back to client
        res.status(200).json({
            gamemode: "opvp",
            gameCode: gamecode
        });

        // Catch any errors and return them to the client
    } catch (error) {
        logger.error(error, 500);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Verify game code.
app.post("/verifycode", async (req, res) => {
    logger.trace(`Verifying Game Code.`, 102);
    const gamecode = req.body.gamecode; // Get game code from request body
    try {
        // Verify gamecode using gameManager
        const validcode = await gameManager.verifyGameCode(gamecode);
        // Return the result as JSON
        res.status(200).json({
            verify: validcode
        });
        // Catch any errors and return them to the client
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify game' });
    }
});

// Make a move for a given game code.
app.post("/move", async (req, res) => {
    logger.trace(`Processing Move.`, 102);
    // Get move data from request body
    const y = req.body.y;
    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.UUID);

    // Get the gamemode of the game
    const gamemode = await gameManager.getGamemode(gamecode);

    try {
        // Process the move using gameManager
        let move = await gameManager.move(gamecode, y, uuid);
        parsedData = JSON.parse(move); // Parse data into JSON

        // Check if move is not empty
        if (move) {
            logger.trace(move, 200); // Log move data for debugging

            // If move is successful and gamemode is online pvp
            if (gamemode === "opvp" && parsedData.success) {
                sendWS(uuid, gamecode, parsedData); // Send opponent the move data

                // If move is successful and gamemode is AI
            } else if (gamemode !== "lpvp" && parsedData.success && !parsedData.win && !parsedData.draw) {
                logger.debug(`Processing AI Move for game ${gamecode}`, 102);
                const ws = getWebSocketByUUID(uuid); // Get a websocket object for given UUID
                if (ws) { // Check websocket exists

                    // Delay AI move by 1000 milisecond to simulate "thinking"
                    setTimeout(async () => {

                        let aiMove = await gameManager.moveAi(gamecode, gamemode); // Generate the AI move

                        logger.debug(`AI Move Processed for game ${gamecode}: ${aiMove}`, 102);
                        ws.send(aiMove); // Send move to the client

                    }, 1000); // Delay AI move by 1 seconds

                } else { // If websocket doesn't exist, log error message
                    logger.error(`WebSocket for player ${uuid} not found. Unable to send AI move message.`, 500);
                }
            }
            // If move results in a win or draw, close the lobby to prevent further game actions
            if (parsedData.win || parsedData.draw) {
                gameManager.closeLobby(gamecode);
            }
            // Return the move data to the client
            res.status(200).send(move);

            // Catch if move is empty and return error message
        } else {
            throw new Error(`Move failed for gamecode: ${gamecode}`);
        }

        // Catch any errors and return them to the client
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error });
    }
});

// Handle a start game request from a client
app.post("/startGame", async (req, res) => {

    // Get gamecode, uuid, and username from request body
    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.uuid);
    const username = req.body.username;

    // Process the ready up request and check if game can start (2 players are ready)
    const readyUp = await gameManager.set_readyPlayer(gamecode, uuid, username);
    const canStart = await gameManager.canStart(gamecode);

    logger.debug(`Start Game Check: ${canStart}`)

    const parsedData = JSON.parse(canStart); // Parse data into JSON

    let setMessage = (parsedData.firstPlayerUUID == uuid) ? 0 : 1; // Set message depending on who readied up

    // Create a JSON message to send to clients
    let jsonMessage = {
        type: "startGame",
        startStatus: parsedData.startStatus,
        readyStatus: readyUp,
        setMessage: setMessage
    };

    // If the game can start, send a WS message to the opponent
    if (parsedData.startStatus) {

        logger.info(`Game ${gamecode} is ready to start!`, 200);

        // Get gamemode for a given gamecode
        const gamemode = await gameManager.getGamemode(gamecode);

        // Check gamemode for online pvp
        if (gamemode === "opvp") {
            let wsMessage = { ...jsonMessage }; // Copy jsonMessage as new object

            wsMessage.setMessage = (parsedData.firstPlayerUUID == uuid) ? 1 : 0; // Switch message for opponent

            sendWS(uuid, gamecode, wsMessage) // Send opponent WS message
        }
        // Return start game status to client
        res.status(200).send(jsonMessage);
        return;
        // If game can't start, return ready status
    } else {
        logger.info(`Player ${uuid} is ready. Waiting for opponent...`, 200);
        res.status(200).send(jsonMessage)
    }
});

// Handle join requests from clients
app.post("/joinGame", async (req, res) => {

    // Get gamecode and uuid from request body
    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.uuid);

    logger.info(`Join Game Requested [uuid: ${uuid} | gamecode: ${gamecode}]`, 102);

    // Attempt to join the game with the provided gamecode and uuid
    const joinGame = await gameManager.joinExistingGame(gamecode, uuid);

    logger.debug(`Join Game Status for [uuid: ${uuid} | gamecode: ${gamecode}]: ${joinGame}`, 102);

    // Return the join status and gamecode to the client
    res.status(200).json({
        joinStatus: joinGame,
        gamecode: gamecode
    })
});

// Handle game restart requests from clients
app.post("/restartGame", async (req, res) => {

    // Get gamecode and uuid from request body
    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.uuid);

    logger.info(`Restart Game Requested [uuid: ${uuid} | gamecode: ${gamecode}]`, 102);

    let hasReset = false;
    let messageNum = [];

    // Process the reset request with gameManager
    const resetStatus = await gameManager.addResetRequest(gamecode, uuid);

    let parsedData = JSON.parse(resetStatus); // Parse results into JSON

    logger.debug(`Reset Request Status for [uuid: ${uuid} | gamecode: ${gamecode}]: ${resetStatus}`, 102);

    const players = await gameManager.getPlayerUUIDs(gamecode); // Get player UUIDs

    // If reset request is successful (both players want reset), reset the game
    if (parsedData.canReset) {
        await gameManager.resetGame(gamecode);
        hasReset = true;
    }

    // If gamemode is online PVP, send WS message to opponent with reset status
    const gamemode = await gameManager.getGamemode(gamecode);
    if (gamemode === "opvp") {
        messageNum = [2, 0]; // "Waiting on Opp"
        wsMessage = {
            type: "resetReq",
            hasReset: hasReset,
            setMessage: messageNum
        };

        // Change message depending on if the game was reset or waiting on opponent
        if (parsedData.canReset) {
            wsMessage.setMessage = [(uuid === players[0]) ? 0 : 1, 0];
            messageNum = [(uuid === players[0]) ? 0 : 1, 0]; // "P1 Turn" or "P2 Turn"
        } else {
            wsMessage.setMessage = [2, 2]; // "Opp wants reset"
        }

        sendWS(uuid, gamecode, wsMessage); // Send WS message to opponent
    } else {
        messageNum = [0, 0]; // If not online PVP, set message to "P1 Turn"
    }

    // Return the reset status to the client
    res.status(200).json({
        resetStatus: parsedData.requestStatus,
        hasReset: hasReset,
        setMessage: messageNum
    });
});


// Handle decline reset requests from clients
app.post("/declineReset", async (req, res) => {

    // Get gamecode and uuid from request body
    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.uuid);

    logger.info(`Decline Reset Requested [uuid: ${uuid} | gamecode: ${gamecode}]`, 102);

    // Reset the conditional variables for the game in gameManager
    // Conditional variables used to start game or reset game
    await gameManager.resetConditionals(gamecode);

    // If gamemode is online PVP, send WS message to opponent
    const gamemode = await gameManager.getGamemode(gamecode);

    if (gamemode === "opvp") {
        // Create WS message
        const wsMessage = {
            type: "declineReset"
        };

        sendWS(uuid, gamecode, wsMessage); // Send WS message to opponent

    }

    // Return decline status to clients
    res.status(200).json({
        declineStatus: true
    });
});

// Initiate server on specified port and IP address
app.listen(port, ip, () => {
    logger.info(`Server listening on port ${port}`, 200);
})

// Initiate server on additional port if openAdditionalPort is true
// Used for testing to prevent conflicts with client-side logic
if (openAdditionalPort) {
    app.listen(port + 1, ip, () => {
        logger.info(`Server listening on port ${port + 1}`, 200);
    })
}

// Initate WebSocket server on specified port and IP address
server.listen(wsPort, ip, () => {
    logger.info(`WebSocket server listening on port ${wsPort}`, 200);
});

// Send websocket message to opponent with given gamecode
async function sendWS(firstPlayerUUID, gamecode, message) {

    const players = await gameManager.getPlayerUUIDs(gamecode); // Get all player UUIDs

    logger.debug(`Sending WebSocket message for game ${gamecode} to opponent.`, 102);
    logger.trace(`WebSocket Message Content: ${JSON.stringify(message)}`, 200);

    // Determine which UUID is the opponent
    const sendTo = (firstPlayerUUID === players[0]) ? players[1] : players[0];

    // Get WS for opponent UUID
    const ws = getWebSocketByUUID(sendTo);

    // Check WS exists and send message
    if (ws) {
        ws.send(JSON.stringify(message));
        logger.info(`WebSocket message sent to player ${sendTo}`);
        logger.trace(`WebSocket Message: ${JSON.stringify(message)}`, 200);

        // If WS doesn't exist, log an error message
    } else {
        logger.error(`WebSocket for player ${sendTo} not found. Unable to send message.`, 500);
    }
}

// Handle server shutdown
process.on('exit', () => {
    logger.info('Server shutting down. Closing database connection.', 200);
    dbm.close_connection(); // Close database connection
});

// Handle uncaught exceptions to prevent server crashes
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message} | Stack: ${err.stack}`, 500);
});