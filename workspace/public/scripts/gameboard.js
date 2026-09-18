import * as log from './utils/logger.js';

const url = window.location.origin; // Get base URL for API requests
let colour = ["Red", "Yellow", "--clr-primary-a20"]; // colours for CSS styling announcements
let colourClass = ["button-red", "button-yellow", "button-white"]; // Classes for styling

// Game state variables
let gamecode = null;
let gamemode = null;
let uuid = -1;
let hasWon = false;
let gameStarted = false;
let ws;

// Dictionary of all gamemode codes to titles
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

// HTML elements for logger display
const loggerElement = document.getElementsByClassName("logger-main-container")[0];
const loggerIcon = document.getElementById("logger-icon");
const loggerTitle = document.getElementById("log-title");
const loggerMessage = document.getElementById("log-message");

// Initialise a logger instance
const logger = new log.logger(loggerElement, loggerIcon, loggerTitle, loggerMessage);

// All board buttons (42 total)
const boardButtons = document.querySelectorAll('.board button');

// Action buttons for overlay menu
const acceptButton = document.getElementById('accept');
const declineButton = document.getElementById('decline');



try {

    // Verify gamecode
    verifycode();

    // Set gamecode and gamemode announcements
    document.getElementById("gamecode-announcement").textContent = `${gamecode}`;
    gamemode = localStorage.getItem("gamemode");
    document.getElementById("gamemode-title").textContent = titles[gamemode];

    // Change colours based on theme stored in sessionStorage
    const storedTheme = sessionStorage.getItem('theme');
    switch (storedTheme) {
        case "0":
            colour = ["Red", "Yellow", "--clr-primary-a20"];
            colourClass = ["button-red", "button-yellow", "button-white"];
            break;
        case "1":
            colour = ["Red", "Blue", "--clr-primary-a20"];
            colourClass = ["button-red", "button-blue", "button-white"];
            break;
        case "2":
            colour = ["Purple", "Orange", "--clr-primary-a20"];
            colourClass = ["button-purple", "button-orange", "button-white"];
            break;
        default:
            logger.warn(`Invalid theme value in localStorage: ${storedTheme}. Reverting to default theme.`, 422);
            break;

    }

    // Set messages based on gamemode
    switch (gamemode) {
        case "lpvp":
            messages = [
                [`${colour[0]}'s Turn`, `${colour[0]} Wins!`],
                [`${colour[1]}'s Turn`, `${colour[1]} Wins!`],
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

    // Open WebSocket connection if not local player vs player
    if (gamemode !== "lpvp") {
        wsOpen();
    }

    // Add event listeners for start button (click and keypress)
    const startButton = document.getElementById('game-control');
    startButton.addEventListener('click', (event) => startGame());
    document.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && gameStarted === false) {
            startButton.click();
        }
    });

    // Add event listeners for reset button (click and keypress)
    const resetGameButton = document.getElementById('reset-game');
    resetGameButton.addEventListener('click', (event) => resetGame());
    document.addEventListener('keypress', (event) => {
        if (event.key.toUpperCase() === 'R' && gameStarted === true) {
            resetGameButton.click();
        }
    });

    // Add event listeners for leaving lobby (click and keypress)
    const backButton = document.getElementById('main-menu-control');
    backButton.addEventListener('click', (event) => leaveLobby());
    document.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && hasWon === true) {
            leaveLobby();
        }
    });

    // Leave lobby before unloading page to save memory
    window.addEventListener('beforeunload', (event) => leaveLobby());

    // Add an event listener to each button on the board.
    boardButtons.forEach(button => {
        button.addEventListener('click', (event) => move(event.target.id));

        // Add keyboard support for gameboard columns (keys 1-7)
        // Only active when game is started and no winner is detected
        if (parseInt(button.id) <= 7) {

            logger.debug(`Adding keypress event listener to button with ID ${button.id}`, 200, "OK");

            document.addEventListener('keypress', (event) => {

                // If key pressed matches button id, game is active and no winner, make move for that column
                if (event.key === button.id && gameStarted && !hasWon) {
                    logger.debug(`Keypress event detected for button with ID ${button.id}`, 200, "OK");
                    move(button.id);
                }

            });
        }
    });
    // Catch errors and log them
} catch (error) {
    logger.error(error, 500, "Internal Server Error");
}

// Handle code verification logic
async function verifycode() {

    gamecode = localStorage.getItem("gamecode"); // Get gamecode from localStorage

    // If no gamecode is detected, log error
    if (gamecode === null) {
        logger.error("No game code detected. Redirecting to main menu.", 102, "Processing");
        window.location.href = './'; // Redirect to main menu
        return;
    }

    logger.info(`Verifying game code ${gamecode}`, 102, "Processing");

    try {

        const textJSON = JSON.stringify({ gamecode: gamecode }); // Convert gamecode to JSON

        // Send POST request to verify gamecode
        const response = await fetch(url + "/verifycode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });

        // If response not OK, log error
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }

        logger.info("Game code verified", response.status, "OK")

        // Catch errors and log them
    } catch (error) {
        logger.error(error, error.status, "Internal Server Error");
    }
}

// Handle decline reset logic
async function declineReset() {
    try {

        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid }); // Convert gamecode and uuid to JSON

        // Send POST request to decline reset
        const response = await fetch(url + "/declineReset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });

        // If response not OK, log error
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }

        // Log successful decline and hide overlay
        logger.info("Reset game declined", response.status, "OK");
        toggleOverlay("hide");

        // Catch errors and log them
    } catch (error) {
        logger.error(`declineReset Error: ${error}`, error.status, "Internal Server Error");
    }
}


// Handle move logic when a column button is pressed
async function move(id) {

    logger.info(`Button with ID ${id} pressed.`);

    // If game is not active, log warning and return without making move
    if (hasWon || !gameStarted) {
        logger.warn("Game inactive.", 200, "OK");
        logger.displayLog("warning", "Game is not active. Please start a new game.", "--clr-primary-a20", "Game Inactive");
        return;
    }

    // Calculate column (y) from button ID (1-42)
    const y = Math.floor((id - 1) % 7); // Column

    try {

        const textJSON = JSON.stringify({ gamecode: gamecode, y: y, UUID: uuid }); // Convert gamecode, column and uuid to JSON

        // Send POST request to make move
        const response = await fetch(url + "/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });

        // If response not OK, log error
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }

        const data = await response.text(); // Get response data as text

        logger.info(`Move processed for column ${y}`, 200, "OK");
        logger.trace(`move() response: ${data}`, 200, "OK");

        const parsedData = JSON.parse(data); // Parse response data as JSON

        // If move was successful
        if (parsedData.success) {

            // Update button colour and game announcements based on move result
            updateButtonColour(parsedData.row, parsedData.column, parsedData.whoMoved);

            handleMessages(parsedData.win, parsedData.draw, [true, parsedData.whoMoved], colour[parsedData.whoNext]);

        } else { // If move was unsuccessful, log warning

            logger.warn("Move Attempted Unsuccessful", 100, true, "Invalid Move")

            logger.displayLog("warning", "Invalid Move. Please Try Again.", "--clr-warning-a10", "Invalid Move")

        };
        // Catch errors and log them
    } catch (error) {
        logger.error(error, error.status, "Internal Server Error");
    }
}


// Handle WebSocket connection logic
async function wsOpen() {

    // If a WebSocket connection already exists, close it before opening a new one
    if (ws) {
        ws.onerror = ws.onopen = ws.onclose = null;
        ws.close();
    }

    // Connect to the same host as the page, including when playing across devices
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${wsProtocol}//${window.location.hostname}:3030`);

    // Log WebSocket connection status
    ws.onopen = function () {
        logger.info("WebSocket connection established.", 200, "OK");
    };

    // Handle incoming WebSocket messages
    ws.onmessage = function (event) {
        logger.trace(`WebSocket Message Received: ${event.data}`, 200, "OK");

        const message = JSON.parse(event.data) // Parse incoming message data as JSON

        // Switch based on message type
        switch (message.type) {
            case "setUUID": // Set UUID for client and attempt to join game with it

                logger.info(`Web Socket UUID: ${event.data}`, 200, "OK");

                let socketId = message.socketId; // Get socket ID from message data
                localStorage.setItem('UUID', socketId); // Set localStorage UUID to socket ID

                uuid = socketId;
                joinGameWithUUID(); // Join game with UUID
                break;

            case "newMove": // Handle opponent move by updating button colour and game announcements
                logger.info(`New Move Detected`, 200, "OK");

                // Update button colours
                updateButtonColour(message.row, message.column, message.whoMoved);

                // If move was successful, update game announcements
                if (message.success) {
                    handleMessages(message.win, message.draw, [false, message.whoMoved], colour[message.whoNext]);
                };
                break;

            case "startGame": // Handle game start

                logger.info(`Start Game Detected: ${event.data}`, 200, "OK");
                logger.displayLog("info", "Game Has Started! Good Luck!", "--clr-success-a10", "Game Started")

                // Hide overlay, update announcements and show reset button
                toggleOverlay("hide");
                updateGameAnnouncements(messages[message.setMessage][0], true, false);

                // Show reset button
                document.getElementById('reset-game').style.display = "flex";

                gameStarted = true; // Set game started to true
                break;

            case "resetReq": // Handle reset requests
                logger.info(`Reset Game Request Detected: ${event.data}`, 200, "OK");

                // Has game reset occured
                if (message.hasReset) {

                    // Log successful reset
                    logger.displayLog("info", "Game has reset. Good Luck!", "--clr-success-a10", "Resetting Game")

                    // Hide overlay
                    toggleOverlay("hide");

                    // Reset button colours
                    boardButtons.forEach(button => {
                        button.className = colourClass[2];
                    });

                    // Update announcements
                    updateGameAnnouncements(messages[message.setMessage[0]][0], false, true, colour[message.setMessage[0]]);

                } else { // Unsuccessful reset request, show waiting screen

                    // Update announcements
                    updateGameAnnouncements(messages[message.setMessage[0]][message.setMessage[1]], false, true);

                    // Remove event listeners for reset confirmation buttons
                    acceptButton.removeEventListener('click', (event) => resetGame());
                    declineButton.removeEventListener('click', (event) => declineReset());
                    acceptButton.addEventListener('click', (event) => resetGame());
                    declineButton.addEventListener('click', (event) => declineReset());

                    // Toggle reset confirmation overlay
                    toggleOverlay("reset");
                }
                break;

            case "declineReset": // Handle declined reset
                logger.info("info", "Reset game declined by Opponent", "--clr-danger-a10", "Reset Declined");

                // Hide overlay
                toggleOverlay("hide");
                break;

            default: // If message type is unrecognized, log warning
                logger.warn(`Unable to determine WebSocket message type. ${message.type}`, 422);
        }
    };

    // Log WebSocket errors
    ws.onerror = function (error) {
        logger.error("WebSocket error:", error);
    };

    // Handle WebSocket connection closures
    ws.onclose = function () {
        logger.warn("WebSocket connection closed. Redirecting to main menu.", 200, "OK");
        leaveLobby(); // Close lobby
        window.location.href = './'; // Redirect to main menu
    }
}

// Update button colours based on move made
function updateButtonColour(row, column, activePlayer) {

    let button_id = Math.floor((row * 7) + column + 1); // calulcate button ID from row and column

    logger.info(`Move Successful. Button ID {${button_id}} Updated.`)

    // Get button element by ID
    let button = document.getElementById(button_id);

    // Ensure button exists
    if (button) {
        // Update class of button with active player's colour
        button.className = colourClass[activePlayer];
    } else { // Log errors
        logger.error(`Invalid Button Id ${button_id}`);
    }
}

// Update game announcements based on game state
function updateGameAnnouncements(message, small, large, colour = `--clr-primary-a20`) {

    // Get large and small announcement elements
    const announcer_small = document.getElementById('small-game-announcements');
    const announcer_large = document.getElementById('large-game-announcements');

    // Toggle small and large announcements text and colour
    if (small) {
        announcer_small.style.color = colour;
        announcer_small.textContent = message;
    }
    if (large) {
        announcer_large.style.color = colour;
        announcer_large.textContent = message;
    }
}

// Handle leaving lobby logic
async function leaveLobby() {

    try {
        // Close websocket connection
        ws.close(1000, "Client Leaving Lobby");
    } catch (error) {
        logger.warn('No WebSocket connection to close.', 400);
    }

    // Clear local storage
    localStorage.clear();

    logger.info("Leaving lobby and clearing session storage.", 200, "OK");

    window.location.href = './'; // Redirect to main menu
}

// Handle start game logic
async function startGame() {
    logger.debug("Start Game Button Pressed", 200, "OK");

    try {
        // Get username from input field and validate
        const usernameInput = document.getElementById("username-input");
        const username = usernameInput.value.trim(); // Remove leading/trailing whitespace

        // Ensure username is not empty
        if (username === "") {
            logger.error("Username cannot be empty.", 422, "Empty Username");
            return;
        }

        // Set username in localStorage
        localStorage.setItem("username", username);

        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid, username: username }); // Generate JSON for request body

        // Send POST request to start game
        const response = await fetch(url + "/startGame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });

        // If response not OK, log error
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }

        const data = await response.text(); // Get response data as text

        const parsedData = JSON.parse(data); // Parse response data as JSON

        logger.trace(`startGame() ${data}`, 200, "OK");

        // If game can start, hide overlay and update announcements
        if (parsedData.startStatus) {

            toggleOverlay("hide"); // Hide overlay

            updateGameAnnouncements(messages[parsedData.setMessage][0], true, false, colour[parsedData.setMessage]); // Update announcements

            document.getElementById('reset-game').style.display = "flex"; // Show reset button

            gameStarted = true; // Set game started to true

        } else { // If game can't start, show waiting screen
            updateGameAnnouncements(messages[2][0], false, true);
        }
        // Catch errors and log them
    } catch (error) {
        logger.error(error)
    }
}

// Handle add reset request logic
async function resetGame() {
    try {

        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid }); // Convert gamecode and uuid to JSON

        // Send POST request to add reset request
        const response = await fetch(url + "/restartGame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });

        // If response not OK, log error
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }

        const data = await response.text(); // Get response data as text

        let parsedData = JSON.parse(data); // Parse response data as JSON

        logger.trace(`resetGame() ${data}`, 200, "OK");

        // If reset successful, reset gameboard and update announcements
        if (parsedData.hasReset) {

            // For each button on the board, reset class to default
            boardButtons.forEach(button => {
                button.className = colourClass[2];
            });
            toggleOverlay("hide"); // Hide overlay

            updateGameAnnouncements(messages[parsedData.setMessage[0]][0], true, false, colour[parsedData.setMessage[0]]); // Update announcements

            logger.info("Game has reset", 200, "OK");
            logger.displayLog("info", "Game has reset. Good Luck!", "--clr-success-a10", "Resetting Game")

        } else { // Game not reset yet, show waiting screen

            toggleOverlay("reset"); // Show reset overlay

            document.getElementsByClassName("approval-menu")[0].classList.replace("shown", "hidden"); // Hide approval menu buttons

            updateGameAnnouncements(messages[parsedData.setMessage[0]][parsedData.setMessage[1]], false, true); // Update announcements
        }

        // Catch errors and log them
    } catch (error) {
        logger.error(`resetGame Error: ${error}`, 500, "Internal Server Error");
    }
}

// Handle join game with UUID logic
async function joinGameWithUUID() {
    try {
        logger.info(`Joining Game: ${gamecode}, with UUID: ${uuid}`, 200, "OK");

        const textJSON = JSON.stringify({ gamecode: gamecode, uuid: uuid }); // Convert gamecode and uuid to JSON

        // Send POST request to join game with UUID
        const response = await fetch((url + "/joinGame"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });

        const result = await response.json(); // Get response data as JSON

        // If response not OK, log error
        if (!response.ok) {
            throw new Error(JSON.stringify(result));
        }

        // If join was unsuccessful, log error
        if (!result.joinStatus) {
            logger.error("Failed to join game.", 403, "Forbidden");

            localStorage.clear(); // Clear local storage

            window.location.href = './'; // Redirect to main menu

        } else { // Join success
            logger.info(`Successfully joined game ${gamecode}`, 200, "OK");
        }
        // Catch errors and log them
    } catch (error) {
        logger.error(error.message);
    }
}

let lpvpMessageToggle = 0;

// Handle game state messages and update announcements and overlays accordingly
function handleMessages(win, draw, justMoved, colour = `--clr-primary-a20`) {

    let justMovedPlayer = justMoved[1]
    let justMovedBool = justMoved[0]
    let winner;

    // If win detected
    if (win) {
        // Determine winner based on gamemode and who just moved
        if (justMovedBool && gamemode === "lpvp") {
            winner = (justMovedPlayer === 0) ? messages[0][1] : messages[1][1]; // Local PVP winner based on player index
        } else {
            winner = (justMovedBool) ? messages[0][1] : messages[1][1]; // Winner based on justMoved bool
        }

        // Toggle win overlay
        toggleOverlay("win");

        // Update announcements with winner
        updateGameAnnouncements(winner, true, true, colour[2]);

        hasWon = true; // End game
        return;

        // If draw detected
    } else if (draw) {
        // toggle draw overlay
        toggleOverlay("draw");

        // Update announcements
        updateGameAnnouncements(messages[2][1], true, true, colour[2]);
        return;
    }

    // if no win/draw detected set next players turn message based on gamemode and who just moved
    if (gamemode === "opvp") {

        // Based on justMoved bool
        let nextMoveMessage = (justMovedBool) ? messages[1][0] : messages[0][0];

        // Update announcements
        updateGameAnnouncements(nextMoveMessage, true, false, colour);

        logger.debug(`Message Update: ${nextMoveMessage} with colour ${colour}`, 200, "OK");
        return;
    } else {
        // Based on who just moved
        lpvpMessageToggle = (lpvpMessageToggle === 0) ? 1 : 0;

        // Update announcements
        updateGameAnnouncements(messages[lpvpMessageToggle][0], true, false, colour);
        logger.debug(`Message Update: ${messages[lpvpMessageToggle][0]} with colour ${colour}`, 200, "OK");
        return;
    }
}

// Handle game overlay states
function toggleOverlay(state) {

    // Get all overlay state elements
    const overlay = document.getElementsByClassName("overlay")[0];
    const startGame = document.getElementsByClassName("start-game")[0];
    const gameOverMenu = document.getElementsByClassName("game-over-menu")[0];
    const approvalMenu = document.getElementsByClassName("approval-menu")[0];
    const resetGame = document.getElementById('reset-game');

    // Switch based on which state is active
    switch (state) {

        // Show overlay with current state
        case "show":
            overlay.classList.replace("hidden", "shown");
            logger.info("Showing Overlay.", 200, "OK");
            break;

        // Hide all overlay elements
        case "hide":
            overlay.classList.replace("shown", "hidden");
            startGame.classList.replace("shown", "hidden");
            gameOverMenu.classList.replace("shown", "hidden");
            resetGame.classList.replace("shown", "hidden");
            approvalMenu.classList.replace("shown", "hidden");
            logger.info("Hiding Overlay.", 200, "OK");
            break;

        // Show win/draw overlay
        case "draw":
        case "win":
            overlay.classList.replace("hidden", "shown");
            startGame.classList.replace("shown", "hidden");
            gameOverMenu.classList.replace("hidden", "shown");
            resetGame.classList.replace("shown", "hidden");
            approvalMenu.classList.replace("shown", "hidden");
            logger.info(`Displaying Win Overlay.`, 200, "OK");
            break;

        // Show reset confirmation overlay
        case "reset":
            overlay.classList.replace("hidden", "shown");
            resetGame.classList.replace("hidden", "shown");
            approvalMenu.classList.replace("hidden", "shown");
            startGame.classList.replace("shown", "hidden");
            gameOverMenu.classList.replace("shown", "hidden");
            resetGame.disabled = false;
            logger.info("Displaying Reset Confirmation Overlay.", 200, "OK");
            break;

        // Handle unknown states
        default:
            logger.warn(`Invalid overlay state: ${state}`, 422);
    }
}
