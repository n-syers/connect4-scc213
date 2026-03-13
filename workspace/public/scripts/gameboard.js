import * as log from './utils/logger.js';

const url = window.location.origin;
const colour = ["red", "yellow", "--clr-primary-a20"];
const colourClass = ["button-red", "button-yellow", "button-white"];
let gamecode = null;
let gamemode = null;
let uuid = -1;
let hasWon = false;
let gameStarted = false;
let ws;

const titles = {
    "lpvp": "Local Player vs Player",
    "opvp": "Online Player vs Player",
    "pvain": "Player vs Ai (Naive)",
    "pvaim": "Player vs Ai (Medium)",
    "pvaih": "Player vs Ai (Hard)"
};

// Default Messages (Overridden based on gamemode)
let messages = [
    ["Red's Turn", "Red Wins!"],
    ["Yellow's Turn", "Yellow Wins!"],
    ["Waiting For Opponent", "Draw!"]
];

const loggerElement = document.getElementsByClassName("logger-main-container")[0];
const loggerIcon = document.getElementById("logger-icon");
const loggerTitle = document.getElementById("log-title");
const loggerMessage = document.getElementById("log-message");

const boardButtons = document.querySelectorAll('.board button');

const acceptButton = document.getElementById('accept');
const declineButton = document.getElementById('decline');


const logger = new log.logger(loggerElement, loggerIcon, loggerTitle, loggerMessage);

try {
    verifycode();
    document.getElementById("gamecode-announcement").textContent = `Game Code: ${gamecode}`;
    gamemode = localStorage.getItem("gamemode");
    document.getElementById("gamemode-title").textContent = titles[gamemode];
    switch (gamemode) {
        case "lpvp":
            messages = [
                ["Red's Turn", "Red Wins!"],
                ["Yellow's Turn", "Yellow Wins!"],
                ["Waiting For Opponent", "Draw!"]
            ];
            break;
        case "opvp":
            messages = [
                ["Your Turn", "You Win!"],
                ["Opponent's Turn", "You Lose!"],
                ["Waiting For Opponent", "Draw!", "Opponent Want To Restart!", "Opponent Wants To Play Again!"]
            ];
            break;
        case "pvain":
        case "pvaim":
        case "pvaih":
            messages = [
                ["Your Turn", "You Win!"],
                ["Ai's Turn", "Ai Wins!"],
                ["Waiting For Opponent", "Draw!"]
            ];
            break;
    }
    if (gamemode !== "lpvp") {
        wsOpen();
    }

    const controlButton = document.getElementById('game-control');
    controlButton.addEventListener('click', (event) => startGame());

    const resetGameButton = document.getElementById('reset-game');
    resetGameButton.addEventListener('click', (event) => resetGame());

    const backButton = document.getElementById('main-menu-control');
    backButton.addEventListener('click', (event) => leaveLobby());

    window.addEventListener('beforeunload', (event) => leaveLobby());

    // Add an event listener to each button on the board.
    boardButtons.forEach(button => {
        button.addEventListener('click', (event) => move(event.target.id));
    });
} catch (error) {
    logger.error(error)
}


async function verifycode() {
    gamecode = localStorage.getItem("gamecode");
    if (gamecode === null) {
        logger.error("No game code detected. Redirecting to main menu.", 102);
        logger.displayLog("error", "No game code detected. Redirecting to main menu.", "--clr-danger-a10", "No Game Code Detected");
        window.location.href = './';
        return;
    }
    logger.info(`Verifying game code ${gamecode}`, 102);
    try {
        const textJSON = JSON.stringify({ gamecode: gamecode });
        const response = await fetch(url + "/verifycode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }
        logger.info("Game code verified", response.status)
    } catch (error) {
        logger.error(error, error.status)
    }
}

async function declineReset() {
    try {
        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid });
        const response = await fetch(url + "/declineReset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }
        toggleOverlay("hide");
    } catch (error) {
        logger.error(`declineReset Error: ${error}`, error.status);
    }
}

async function move(id) {
    logger.info(`Button with ID ${id} pressed.`);
    if (hasWon || !gameStarted) {
        logger.warn("Game inactive.", 200);
        logger.displayLog("warning", "Game is not active. Please start a new game.", "--clr-primary-a20", "Game Inactive");
        return;
    }
    const y = Math.floor((id - 1) % 7); // Column
    try {
        const textJSON = JSON.stringify({ gamecode: gamecode, y: y, UUID: uuid });
        const response = await fetch(url + "/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }
        const data = await response.text();
        logger.trace(`Move Response: ${data}`, 200);
        const parsedData = JSON.parse(data);
        if (parsedData.success) {
            updateButtonColour(parsedData.row, parsedData.column, parsedData.whoMoved);
            handleMessages(parsedData.win, parsedData.draw, true, colour[parsedData.whoNext]);
        } else {
            logger.warn("Move Attempted Unsuccessful", 100, true, "Invalid Move")
            logger.displayLog("warning", "Invalid Move. Please Try Again.", "--clr-warning-a10", "Invalid Move")
        };
    } catch (error) {
        logger.error(error, error.status)
    }
}

async function wsOpen() {
    if (ws) {
        ws.onerror = ws.onopen = ws.onclose = null;
        ws.close();
    }
    ws = new WebSocket(`ws://127.0.0.1:3030`);

    ws.onopen = function () {
        logger.info("WebSocket connected", 200);
        logger.info(`WebSocket URL: ${ws.url}`, 200);
    };

    ws.onmessage = function (event) {
        const message = JSON.parse(event.data)
        logger.trace(`WebSocket Message Received: ${event.data}`, 200);
        switch (message.type) {
            case "setUUID":
                logger.info(`Web Socket UUID: ${event.data}`, 200);
                let socketId = JSON.parse(event.data).socketId;
                localStorage.setItem('UUID', socketId);
                uuid = socketId;
                joinGameWithUUID();
                break;
            case "newMove":
                logger.info(`New Move Detected`, 200);
                updateButtonColour(message.row, message.column, message.whoMoved);
                if (message.success) {
                    handleMessages(message.win, message.draw, false, colour[message.whoNext]);
                };
                break;
            case "startGame":
                logger.info(`Start Game Detected: ${event.data}`, 200);
                logger.displayLog("info", "Game Has Started! Good Luck!", "--clr-success-a10", "Game Started")
                toggleOverlay("hide");
                updateGameAnnouncements(messages[message.setMessage][0], true, false);
                document.getElementById('reset-game').style.display = "flex";
                gameStarted = true;
                break;
            case "resetReq":
                logger.info(`Reset Game Request Detected: ${event.data}`, 200);
                if (message.hasReset) {
                    logger.displayLog("info", "Game has reset. Good Luck!", "--clr-success-a10", "Resetting Game")
                    toggleOverlay("hide");
                    boardButtons.forEach(button => {
                        button.className = colourClass[2];
                    });
                    updateGameAnnouncements(messages[message.setMessage[0]][0], false, true, colour[message.setMessage[0]]);
                } else {
                    updateGameAnnouncements(messages[message.setMessage[0]][message.setMessage[1]], false, true);
                    acceptButton.removeEventListener('click', (event) => resetGame());
                    declineButton.removeEventListener('click', (event) => declineReset());
                    acceptButton.addEventListener('click', (event) => resetGame());
                    declineButton.addEventListener('click', (event) => declineReset());
                    toggleOverlay("reset");
                }
                break;
            case "declineReset":
                logger.info("info", "Reset game declined by Opponent", "--clr-danger-a10", "Reset Declined");
                toggleOverlay("hide");
                break;
            default:
                logger.warn(`Unable to determine WebSocket message type. ${message.type}`, 422);
        }
    };
    ws.onerror = function (error) {
        logger.error("WebSocket error:", error);
    };
    ws.onclose = function () {
        logger.warn("WebSocket connection closed. Redirecting to main menu.", 200);
        leaveLobby();
        window.location.href = './';
    }
}

function updateButtonColour(row, column, activePlayer) {
    let button_id = Math.floor((row * 7) + column + 1);
    logger.info(`Move Successful. Button ID {${button_id}} Updated.`)
    let button = document.getElementById(button_id);
    if (button) {
        button.className = colourClass[activePlayer];
    } else {
        logger.error(`Invalid Button Id ${button_id}`);
    }
}

function updateGameAnnouncements(message, small, large, colour = `--clr-primary-a20`) {
    const announcer_small = document.getElementById('small-game-announcements');
    const announcer_large = document.getElementById('large-game-announcements');
    if (small) {
        announcer_small.style.color = colour;
        announcer_small.textContent = message;
    }
    if (large) {
        announcer_large.style.color = colour;
        announcer_large.textContent = message;
    }
}

async function leaveLobby() {
    try {
        ws.close(1000, "Client Leaving Lobby");

    } catch (error) {
        logger.warn('No WebSocket connection to close.', 400);
    }
    localStorage.clear();
    logger.info("Leaving lobby and clearing session storage.", 200);
    window.location.href = './';
}

async function startGame() {
    logger.debug("Start Game Button Pressed", 200);
    try {
        const usernameInput = document.getElementById("username-input");
        const username = usernameInput.value.trim();
        if (username === "") {
            logger.error("Username cannot be empty.", 422, true, "Empty Username");
            return;
        }
        localStorage.setItem("username", username);
        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid, username: username });
        const response = await fetch(url + "/startGame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }
        logger.info("Game code verified", response.status);
        const data = await response.text();
        const parsedData = JSON.parse(data);
        logger.trace(`startGame() ${data}`, 200);
        if (parsedData.startStatus) {
            toggleOverlay("hide");
            updateGameAnnouncements(messages[parsedData.setMessage][0], true, false, colour[parsedData.setMessage]);
            document.getElementById('reset-game').style.display = "flex";
            gameStarted = true;
        } else {
            updateGameAnnouncements(messages[2][0], false, true);
        }
    } catch (error) {
        logger.error(error)
    }
}

async function resetGame() {
    try {
        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid });
        const response = await fetch(url + "/restartGame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }
        const data = await response.text();
        let parsedData = JSON.parse(data);

        if (parsedData.hasReset) {
            // Game has reset
            boardButtons.forEach(button => {
                button.className = colourClass[2];
            });
            toggleOverlay("hide");
            updateGameAnnouncements(messages[parsedData.setMessage[0]][0], true, false, colour[parsedData.setMessage[0]]);
            logger.info("Game has reset", 200);
            logger.displayLog("info", "Game has reset. Good Luck!", "--clr-success-a10", "Resetting Game")
        } else {
            toggleOverlay("reset");
            document.getElementsByClassName("approval-menu")[0].classList.replace("shown", "hidden");
            updateGameAnnouncements(messages[parsedData.setMessage[0]][parsedData.setMessage[1]], false, true);
        }

    } catch (error) {
        logger.error(`resetGame Error: ${error}`, error.status);
    }
}


async function joinGameWithUUID() {
    try {
        logger.info(`Joining Game: ${gamecode}, with UUID: ${uuid}`, 200);
        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid });
        const response = await fetch((url + "/joinGame"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(JSON.stringify(result));
        }
        if (!result.joinStatus) {
            localStorage.clear();
            throw new Error("Unable to join game. Redirecting to main menu.", 403);
        }
        logger.info(`Successfully joined game ${gamecode}`, 200);
    } catch (error) {
        logger.error(error.message);
    }
}

let lpvpMessageToggle = 0;

function handleMessages(win, draw, justMoved, colour = `--clr-primary-a20`) {
    if (win) {
        let winner = (justMoved) ? messages[0][1] : messages[1][1];
        toggleOverlay("win");
        updateGameAnnouncements(winner, true, true, colour[2]);
        hasWon = true;
        return;
    } else if (draw) {
        toggleOverlay("draw");
        updateGameAnnouncements(messages[2][1], true, true, colour[2]);
        return;
    }
    if (gamemode === "opvp") {
        let nextMove = (justMoved) ? messages[1][0] : messages[0][0];
        updateGameAnnouncements(nextMove, true, false, colour);
        logger.debug(`Message Update: ${nextMove} with colour ${colour}`, 200);
        return;
    } else {
        lpvpMessageToggle = (lpvpMessageToggle === 0) ? 1 : 0;
        updateGameAnnouncements(messages[lpvpMessageToggle][0], true, false, colour);
        logger.debug(`Message Update: ${messages[lpvpMessageToggle][0]} with colour ${colour}`, 200);
    }
}

function toggleOverlay(state) {

    const overlay = document.getElementsByClassName("overlay")[0];
    const startGame = document.getElementsByClassName("start-game")[0];
    const gameOverMenu = document.getElementsByClassName("game-over-menu")[0];
    const approvalMenu = document.getElementsByClassName("approval-menu")[0];
    const resetGame = document.getElementById('reset-game');

    switch (state) {
        case "show":
            overlay.classList.replace("hidden", "shown");
            logger.info("Showing Overlay.", 200);
            break;
        case "hide":
            overlay.classList.replace("shown", "hidden");
            startGame.classList.replace("shown", "hidden");
            gameOverMenu.classList.replace("shown", "hidden");
            resetGame.classList.replace("shown", "hidden");
            approvalMenu.classList.replace("shown", "hidden");
            logger.info("Hiding Overlay.", 200);
            break;
        case "draw":
        case "win":
            overlay.classList.replace("hidden", "shown");
            startGame.classList.replace("shown", "hidden");
            gameOverMenu.classList.replace("hidden", "shown");
            resetGame.classList.replace("shown", "hidden");
            approvalMenu.classList.replace("shown", "hidden");
            logger.info(`Displaying Win Overlay.`, 200);
            break;
        case "reset":
            overlay.classList.replace("hidden", "shown");
            resetGame.classList.replace("hidden", "shown");
            approvalMenu.classList.replace("hidden", "shown");
            startGame.classList.replace("shown", "hidden");
            gameOverMenu.classList.replace("shown", "hidden");
            logger.info("Displaying Reset Confirmation Overlay.", 200);
            break;
        default:
            logger.warn(`Invalid overlay state: ${state}`, 422);
    }
}