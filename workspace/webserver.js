const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const logger = require('./utils/logger.js');
const gameManager = require('./utils/gameManager.js');

const port = 3000;
const wsPort = 3030;
const ip = "0.0.0.0";

const app = express()
const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

const socketMapUUID = new Map();

wss.on('connection', (ws, req) => {
    logger.info("Client Connected to WebSocket");
    let uuid = generateSocketUUID();
    ws.id = uuid;
    socketMapUUID.set(uuid, ws);
    ws.send(JSON.stringify({ type: "setUUID", socketId: uuid }));
    ws.on('message', (message) => {
        logger.info("Received:", message.toString());
        ws.send(`Echo: ${message}`);
    });
    ws.on('close', () => {
        socketMapUUID.delete(ws.id);
        logger.info("Client Disconnected");
    });
})

server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
    });
});

function generateSocketUUID() {
    // generate unique code
    let temp_uuid = Math.floor(Math.random() * 900_000) + 100_000;
    while (socketMapUUID.has(temp_uuid)) {
        temp_uuid = Math.floor(Math.random() * 900_000) + 100_000;
    }
    logger.trace(`Generated WebSocket UUID: ${temp_uuid}`, 201);
    return temp_uuid;
};

function getWebSocketByUUID(uuid) {
    return socketMapUUID.get(uuid);
}

// Ignore cors
app.use(cors());

// Log all requests
app.use((req, res, next) => {
    logger.info(`Client connected from ${req.ip}:${req.socket.remotePort} | ${req.method} ${req.url}`, 200);
    next();
})
// Use JSON
app.use(express.json());

// Redirect to gameboard
app.get('/gameboard', (req, res) => {
    res.redirect(path.join('gameboard.html'));
});

// Redirect to index.html
app.use('/', express.static(path.join(__dirname, 'public')));

// Update leaderboard information
app.get("/leaderboard", (req, res) => {
    logger.info(`Processing leaderboard request.`, 102);
    res.json({
        message: "Leaderboard",
    });
})

// Start new local player vs player game.
app.get("/lpvp", async (req, res) => {
    try {
        const gamecode = await gameManager.createGame("lpvp", -1);
        const successP1 = await gameManager.joinExistingGame(parseInt(gamecode), -1);
        const successP2 = await gameManager.joinExistingGame(parseInt(gamecode), -1);

        res.status(200).json({
            gamemode: "lpvp",
            gameCode: gamecode,
        });
    } catch (error) {
        logger.error(error, 500);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Start new player vs naive AI game.
app.get("/pvain", async (req, res) => {
    try {
        const gamecode = await gameManager.createGame("pvain", -1);
        const success = await gameManager.joinExistingGame(parseInt(gamecode), -1);

        res.status(200).json({
            gamemode: "pvain",
            gameCode: gamecode,
        });
    } catch (error) {
        logger.error(error, 500);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Start new player vs medium AI game.
app.get("/pvaim", async (req, res) => {
    try {
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

        res.status(200).json({
            gamemode: "pvaih",
            gameCode: gamecode,
        });
    } catch (error) {
        logger.error(error, 500);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Start new ONLINE pvp game.
app.get("/opvp", async (req, res) => {
    try {
        const gamecode = await gameManager.createGame("opvp");

        res.status(200).json({
            gamemode: "opvp",
            gameCode: gamecode
        });
    } catch (error) {
        logger.error(error, 500);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// verify game code.
app.post("/verifycode", async (req, res) => {
    logger.trace(`Verifying Game Code.`, 102);
    const gamecode = req.body.gamecode;
    try {
        const validcode = await gameManager.verifyGameCode(gamecode);
        res.status(200).json({
            verify: validcode
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify game' });
    }
});

// Make a move for a given game code.
app.post("/move", async (req, res) => {
    logger.trace(`Processing Move.`, 102);
    const y = req.body.y;
    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.UUID);
    const gamemode = await gameManager.getGamemode(gamecode);
    try {
        let move = await gameManager.move(gamecode, y, uuid);
        parsedData = JSON.parse(move);
        if (move !== null) {
            logger.trace(move, 200);
            if (gamemode === "opvp") {
                sendWS(uuid, gamecode, parsedData);
            } else if (gamemode !== "lpvp" && gamemode !== "opvp") {
                logger.debug(`Processing AI Move for game ${gamecode}`, 102);
                const aiMove = await gameManager.moveAi(gamecode, gamemode);
                const ws = getWebSocketByUUID(uuid);
                logger.debug(`Gamecode: ${gamecode} AI Move: ${aiMove}`);
                logger.debug(`Sending AI move to player ${uuid}`);
                if (ws) {
                    ws.send(aiMove);
                    logger.info(`Ai player move message sent to ${uuid}`);
                } else {
                    logger.error(`WebSocket for player ${uuid} not found. Unable to send AI move message.`, 500);
                }
            }
            // Close lobby if game won. before sending response.
            if (parsedData.win) {
                await gameManager.closeLobby(gamecode);
            }
            res.status(200).send(move);
        } else {
            throw new Error(`Move failed for gamecode: ${gamecode}`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error });
    }
});

app.post("/startGame", async (req, res) => {

    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.uuid);
    const username = req.body.username;
    const gamemode = await gameManager.getGamemode(gamecode);
    const readyUp = await gameManager.set_readyPlayer(gamecode, uuid, username);
    const canStart = await gameManager.canStart(gamecode);

    logger.debug(`${canStart}`)

    const parsedData = JSON.parse(canStart);
    let setMessage = (parsedData.firstPlayerUUID == uuid) ? 0 : 1;
    let jsonMessage = {
        type: "startGame",
        startStatus: parsedData.startStatus,
        readyStatus: readyUp,
        setMessage: setMessage
    };
    if (parsedData.startStatus) {
        logger.info(`Game ${gamecode} is ready to start!`, 200);

        if (gamemode === "opvp") {
            let wsMessage = { ...jsonMessage }; // Copy jsonMessage as new object
            wsMessage.setMessage = (parsedData.firstPlayerUUID == uuid) ? 1 : 0;
            sendWS(uuid, gamecode, wsMessage)
        }

        res.status(200).send(jsonMessage);
        return;
    } else {
        logger.info(`Player ${uuid} is ready. Waiting for opponent...`, 200);
        res.status(200).send(jsonMessage)
    }
});

app.post("/joinGame", async (req, res) => {
    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.uuid);
    logger.info(`Join Game Requested [uuid: ${uuid} | gamecode: ${gamecode}]`, 102);
    const joinGame = await gameManager.joinExistingGame(gamecode, uuid);
    logger.trace(`{joinSuccess: ${joinGame}, gamecode: ${gamecode}}`)
    res.status(200).json({
        joinStatus: joinGame,
        gamecode: gamecode
    })
});

app.post("/restartGame", async (req, res) => {
    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.uuid);
    logger.trace(`Request Body: ${JSON.stringify(req.body)}`, 102);
    logger.debug(`Game reset requested by ${uuid}`, 102);

    let hasReset = false;
    let messageNum = [];

    const gamemode = await gameManager.getGamemode(gamecode);
    const resetStatus = await gameManager.addResetRequest(gamecode, uuid);
    let parsedData = JSON.parse(resetStatus);
    logger.trace(`Reset Status: ${resetStatus}`, 102);

    const players = await gameManager.getPlayerUUIDs(gamecode);

    if (parsedData.canReset) {
        await gameManager.resetGame(gamecode);
        hasReset = true;
    }
    logger.debug(`Gamemode: ${gamemode} | Can Reset: ${parsedData.canReset} | Has Reset: ${hasReset}`, 102);
    if (gamemode === "opvp") {
        messageNum = [2, 0]; // "Waiting on Opp"
        wsMessage = {
            type: "resetReq",
            hasReset: hasReset,
            setMessage: messageNum
        };
        if (parsedData.canReset) {
            wsMessage.setMessage = [(uuid === players[0]) ? 1 : 0, 0];
        } else {
            wsMessage.setMessage = [2, 2]; // "Opp wants reset"
        }
        sendWS(uuid, gamecode, wsMessage);
    } else {
        messageNum = [0, 0]; // "P1 Turn"
    }

    res.status(200).json({
        resetStatus: parsedData.requestStatus,
        hasReset: hasReset,
        setMessage: messageNum
    });
});

app.post("/declineReset", async (req, res) => {
    const gamecode = parseInt(req.body.gamecode);
    const uuid = parseInt(req.body.uuid);
    logger.debug(`Reset decline requested by ${uuid}`, 102);

    const gamemode = await gameManager.getGamemode(gamecode);

    if (gamemode === "opvp") {
        const wsMessage = {
            type: "declineReset"
        };
        sendWS(uuid, gamecode, wsMessage);
    }

    res.status(200).json({
        declineStatus: true
    });
});

// Initiate server on 2 ports for testing.
app.listen(port, ip, () => {
    logger.info(`Server listening on port ${port}`, 200);
})

app.listen(port + 1, ip, () => {
    logger.info(`Server listening on port ${port + 1}`, 200);
})

// Initate WebSocket
server.listen(wsPort, ip, () => {
    logger.info(`WebSocket server listening on port 3030`, 200);
});


function sendWS(firstPlayerUUID, gamecode, message) {
    const players = gameManager.getPlayerUUIDs(gamecode);
    logger.trace(`Sending WebSocket message to game ${gamecode} | players: ${players} | firstPlayerUUID: ${firstPlayerUUID}`, 102);
    const sendTo = (firstPlayerUUID === players[0]) ? players[1] : players[0];
    const ws = getWebSocketByUUID(sendTo);
    if (ws) {
        ws.send(JSON.stringify(message));
        logger.info(`WebSocket message sent to player ${sendTo}`);
        logger.trace(`WebSocket Message: ${JSON.stringify(message)}`, 200);
    } else {
        logger.error(`WebSocket for player ${sendTo} not found. Unable to send message.`, 500);
    }
}

process.on('exit', () => {
    logger.info('Server shutting down', 200);
});

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message} | Stack: ${err.stack}`, 500);
    process.exit(1);
});