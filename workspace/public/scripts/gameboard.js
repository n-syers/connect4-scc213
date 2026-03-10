import { logger } from './utils/logger.js';

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

let messages = [];

const loggerElement = document.getElementsByClassName("logger-main-container")[0];
const loggerIcon = document.getElementById("logger-icon");
const loggerTitle = document.getElementById("log-title");
const loggerMessage = document.getElementById("log-message");

const boardButtons = document.querySelectorAll('.board button');


const log = new logger(loggerElement, loggerIcon, loggerTitle, loggerMessage);

try {
    verifycode();
    document.getElementById("gamecode-announcement").textContent = `Game Code: ${gamecode}`;
    gamemode = sessionStorage.getItem("gamemode");
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
    if (gamemode === "opvp") {
        wsOpen();
        document.getElementById("gamecode-announcement").style.display = "flex";

    }

    const controlButton = document.getElementById('game-control');
    controlButton.addEventListener('click', (event) => startGame());

    const resetAcceptButton = document.getElementById('accept');
    const resetGameButton = document.getElementById('reset-game');
    resetGameButton.addEventListener('click', (event) => resetGame());
    resetAcceptButton.addEventListener('click', (event) => resetGame());

    const resetDeclineButton = document.getElementById('decline');
    resetDeclineButton.addEventListener('click', (event) => declineReset());

    // Add an event listener to each button on the board.
    boardButtons.forEach(button => {
        button.addEventListener('click', (event) => move(event.target.id));
    });
} catch (error) {
    log.error(error)
}


async function verifycode() {
    gamecode = sessionStorage.getItem("gamecode");
    if (gamecode === null) {
        log.error("No game code detected. Redirecting to main menu.", 102, true, "No Game Code Detected");
        window.location.href = './'
    }
    log.info(`Verifying game code ${gamecode}`, 102);
    try {
        const textJSON = JSON.stringify({ gamecode: gamecode });
        const response = await fetch(url + "/verifycode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });
        if (!response.ok) {
            throw new Error(response.body, response.status);
        }
        log.info("Game code verified", response.status)
    } catch (error) {
        log.error(error, error.status)
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
        if (!response.ok) { throw new Error(response.text(), response.status); }
        toggleOverlay("hide");
    } catch (error) {
        log.error(`declineReset Error: ${error}`, error.status);
    }
}

async function move(id) {
    log.info(`Button with ID ${id} pressed.`);
    if (hasWon || !gameStarted) {
        log.info("Game inactive.", 200);
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
        if (!response.ok) { throw new Error(response.text(), response.status); }
        const data = await response.text();
        log.trace(`Move Response: ${data}`, 200);
        const parsedData = JSON.parse(data);
        if (parsedData.success) {
            updateButtonColour(parsedData.row, parsedData.column, parsedData.whoMoved);
            handleMessages(parsedData.win, parsedData.draw, true, colour[parsedData.whoNext]);
        } else {
            log.warn("Move Attempted Unsuccessful", 100, true, "Invalid Move")
        };
    } catch (error) {
        log.error(error, error.status)
    }
}

async function wsOpen() {
    if (ws) {
        ws.onerror = ws.onopen = ws.onclose = null;
        ws.close();
    }
    ws = new WebSocket(`ws://127.0.0.1:3030`);

    ws.onopen = function () {
        log.info("WebSocket connected", 200);
        log.info(`WebSocket URL: ${ws.url}`, 200);
    };

    ws.onmessage = function (event) {
        const message = JSON.parse(event.data)
        log.info(`WebSocket message received: ${message.type} | ${event.data}`, 200, true, "WebSocket Message Received");
        switch (message.type) {
            case "setUUID":
                log.info(`Web Socket UUID: ${event.data}`, 200);
                let socketId = JSON.parse(event.data).socketId;
                sessionStorage.setItem('UUID', socketId);
                uuid = socketId;
                joinGameWithUUID();
                break;
            case "newMove":
                log.info(`New Move Detected`, 200);
                updateButtonColour(message.row, message.column, message.whoMoved);
                if (message.success) {
                    handleMessages(message.win, message.draw, false, colour[message.whoNext]);
                };
                break;
            case "startGame":
                log.info(`Start Game Detected: ${event.data}`, 200);
                toggleOverlay("hide");
                updateGameAnnouncements(messages[message.setMessage][0], true, false);
                document.getElementById('reset-game').style.display = "flex";
                gameStarted = true;
                break;
            case "resetReq":
                log.info(`Reset Game Request Detected: ${event.data}`, 200);
                if (message.hasReset) {
                    log.displayLog("info", "Game has reset. Good Luck!", 200, "--clr-success-a10", "Resetting Game")
                    toggleOverlay("hide");
                    boardButtons.forEach(button => {
                        button.className = colourClass[2];
                    });
                    updateGameAnnouncements(messages[message.setMessage[0]][0], false, true, colour[message.setMessage[0]]);
                } else {
                    updateGameAnnouncements(messages[message.setMessage[0]][message.setMessage[1]], false, true);
                    toggleOverlay("reset");
                }
                break;
            case "declineReset":
                log.info(`Reset game declined by Opponent`, 200, true, "Reset Declined");
                toggleOverlay("hide");
                break;
            default:
                log.warn(`Unable to determine WebSocket message type. ${message.type}`, 422);
        }
    };
    ws.onerror = function (error) {
        log.error("WebSocket error:", error);
    };
}

function updateButtonColour(row, column, activePlayer) {
    let button_id = Math.floor((row * 7) + column + 1);
    log.info(`Move Successful. Button ID {${button_id}} Updated.`)
    let button = document.getElementById(button_id);
    if (button) {
        button.className = colourClass[activePlayer];
    } else {
        log.error(`Invalid Button Id ${button_id}`);
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

async function startGame() {
    log.debug("Start Game Button Pressed", 200);
    try {
        const usernameInput = document.getElementById("username-input");
        const username = usernameInput.value.trim();
        if (username === "") {
            log.error("Username cannot be empty.", 422, true, "Empty Username");
            return;
        }
        sessionStorage.setItem("username", username);
        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid, username: username });
        const response = await fetch(url + "/startGame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });
        if (!response.ok) {
            throw new Error(response.body, response.status);
        }
        log.info("Game code verified", response.status);
        const data = await response.text();
        const parsedData = JSON.parse(data);
        log.trace(`startGame() ${data}`, 200);
        if (parsedData.startStatus) {
            toggleOverlay("hide");
            updateGameAnnouncements(messages[parsedData.setMessage][0], true, false, colour[parsedData.setMessage]);
            document.getElementById('reset-game').style.display = "flex";
            gameStarted = true;
        } else {
            updateGameAnnouncements(messages[2][0], false, true);
        }
    } catch (error) {
        log.error(error)
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
        if (!response.ok) { throw new Error(response.text(), response.status); }
        const data = await response.text();
        let parsedData = JSON.parse(data);

        if (parsedData.hasReset) {
            // Game has reset
            boardButtons.forEach(button => {
                button.className = colourClass[2];
            });
            toggleOverlay("hide");
            updateGameAnnouncements(messages[parsedData.setMessage[0]][0], true, false, colour[parsedData.setMessage[0]]);
            log.info("Game has reset. Good Luck!", 200, true, "Reset Game");
        } else {
            toggleOverlay("reset");
            document.getElementsByClassName("approval-menu")[0].classList.replace("shown", "hidden");
            updateGameAnnouncements(messages[parsedData.setMessage[0]][parsedData.setMessage[1]], false, true);
        }

    } catch (error) {
        log.error(`resetGame Error: ${error}`, error.status);
    }
}


async function joinGameWithUUID() {
    try {
        log.info(`Joining Game: ${gamecode}, with UUID: ${uuid}`, 200);
        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid });
        const response = await fetch((url + "/joinGame"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });
        if (!response.ok) {
            throw new Error(`${response.json()}`, response.status);
        }
        const result = await response.json();
        if (!result.joinStatus) {
            sessionStorage.clear();
            throw new Error("Unable to join game. Redirecting to main menu.", 403);
        }
        log.info(`Successfully joined game ${gamecode}`, 200);
    } catch (error) {
        log.error(error.message);
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
        log.debug(`Message Update: ${nextMove} with colour ${colour}`, 200);
        return;
    } else {
        lpvpMessageToggle = (lpvpMessageToggle === 0) ? 1 : 0;
        updateGameAnnouncements(messages[lpvpMessageToggle][0], true, false, colour);
        log.debug(`Message Update: ${messages[lpvpMessageToggle][0]} with colour ${colour}`, 200);
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
            log.info("Showing Overlay.", 200);
            break;
        case "hide":
            overlay.classList.replace("shown", "hidden");
            startGame.classList.replace("shown", "hidden");
            gameOverMenu.classList.replace("shown", "hidden");
            resetGame.classList.replace("shown", "hidden");
            approvalMenu.classList.replace("shown", "hidden");
            log.info("Hiding Overlay.", 200);
            break;
        case "draw":
        case "win":
            overlay.classList.replace("hidden", "shown");
            startGame.classList.replace("shown", "hidden");
            gameOverMenu.classList.replace("hidden", "shown");
            resetGame.classList.replace("shown", "hidden");
            approvalMenu.classList.replace("shown", "hidden");
            log.info(`Displaying Win Overlay.`, 200);
            break;
        case "reset":
            overlay.classList.replace("hidden", "shown");
            resetGame.classList.replace("hidden", "shown");
            approvalMenu.classList.replace("hidden", "shown");
            startGame.classList.replace("shown", "hidden");
            gameOverMenu.classList.replace("shown", "hidden");
            log.info("Displaying Reset Confirmation Overlay.", 200);
            break;
        default:
            log.warn(`Invalid overlay state: ${state}`, 422);
    }
}