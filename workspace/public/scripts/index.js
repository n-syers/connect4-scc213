import * as log from './utils/logger.js';

// Initialise the logger with UI elements
const loggerElement = document.getElementsByClassName("logger-main-container")[0];
const loggerIcon = document.getElementById("logger-icon");
const loggerTitle = document.getElementById("log-title");
const loggerMessage = document.getElementById("log-message");
const logger = new log.logger(loggerElement, loggerIcon, loggerTitle, loggerMessage);

const url = window.location.origin;
logger.info(`Connected successfully via ${url}`, 200, "OK");

try {
    // Get references to all buttons and interactiable elements
    const join_game = document.getElementById('join-game-button');
    const start_lpvp_a = document.getElementById('start_lpvp_a');
    const start_opvp_a = document.getElementById('start_opvp_a');
    const start_pvain_a = document.getElementById('start_pvain_a');
    const start_pvaim_a = document.getElementById('start_pvaim_a');
    const start_pvaih_a = document.getElementById('start_pvaih_a');
    const refreshButton = document.getElementById('refresh-button');
    const themeChanger = document.getElementById('theme-selector');

    // Add event listener for theme changer (change)
    themeChanger.addEventListener('change', (event) => {
        const selectedTheme = event.target.value;
        sessionStorage.setItem('theme', selectedTheme);
        logger.displayLog("info", `Theme changed to ${selectedTheme}`, "--clr-success-a10", "Theme Change");
    });

    // Add event listeners for game mode buttons (click and keypress for accessibility)
    start_lpvp_a.addEventListener('click', async () => await startGame('lpvp'));
    start_lpvp_a.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            await startGame('lpvp');
        }
    });
    start_opvp_a.addEventListener('click', async () => await startGame('opvp'));
    start_opvp_a.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            await startGame('opvp');
        }
    });
    start_pvain_a.addEventListener('click', async () => await startGame('pvain'));
    start_pvain_a.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            await startGame('pvain');
        }
    });
    start_pvaim_a.addEventListener('click', async () => await startGame('pvaim'));
    start_pvaim_a.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            await startGame('pvaim');
        }
    });
    start_pvaih_a.addEventListener('click', async () => await startGame('pvaih'));
    start_pvaih_a.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            await startGame('pvaih');
        }
    });

    // Add event listeners for refresh button (click and keypress for accessibility)
    refreshButton.addEventListener('click', async () => await fetchLeaderboard(true));
    refreshButton.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            await fetchLeaderboard(true);
        }
    });

    // Add event listeners for join game button (click and keypress for accessibility)
    join_game.addEventListener('click', async () => {
        try {
            let gamecode = document.getElementById('join-code-input').value; // Get user input for game code

            logger.info(`Joining game with code: ${gamecode}`, 102, "Processing");

            setlocalStorageItems(gamecode, 'opvp'); // Store gamecode and gamemode in localStorage for retrieval in gameboard

            window.location.href = './gameboard'; // Redirect to gameboard

            // Catch any errors and log them
        } catch (error) {
            logger.error(`[index.joinGameEvent] Error ${error}`, 500, "Internal Server Error");
        }
    });
    join_game.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            await join_game.click(); // Triggers click logic for performance and code reuse
        }
    });

    // Fetch and display leaderboard data on page load
    fetchLeaderboard(false);

} catch (error) {
    logger.error(`[index.js] Error: ${error}`, 0, "UnknownError")
}

// Handle localStorage information
function setlocalStorageItems(gamecode, gamemode, uuid = -1) {
    try {
        // Set gamecode, gamemode and uuid in localStorage for retrieval in gameboard
        localStorage.setItem('gamecode', gamecode);
        localStorage.setItem('gamemode', gamemode);
        localStorage.setItem('UUID', uuid);

        // Catch errors and log them
    } catch (error) {
        logger.error(`[index.setLocalStorageItems()] Error: ${error}`, 22, "QuotaExceededError");
    }
}

// Handle start new game for specified gamemode
async function startGame(gamemode) {
    logger.info(`Starting New ${gamemode} Game`, 102);

    try {
        // Send GET request to server to create a new game with the specified gamemode
        const response = await fetch(url + `/${gamemode}`);

        // If response is not ok (error) log it
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(JSON.stringify(errData));
        }

        const result = await response.json(); // Parse response as JSON

        logger.debug(JSON.stringify(result), result.status);

        // Set local storage items for gamecode and gamemode
        setlocalStorageItems(result.gameCode, gamemode);

        // Redirect to gameboard page
        window.location.href = './gameboard';

        // Catch errors and log them
    } catch (error) {
        logger.error(`[index.startGame()] Error: ${error}`, 500, "Internal Server Error");
    }
}

// Handle leaderboard logic
async function fetchLeaderboard(display) {
    logger.info(`Fetching Leaderboard Data`, 102, "Processing");
    try {
        // Send POST request to server to get leaderboard data sorted by most games started
        const textJSON = JSON.stringify({ leaderboardBy: "mostGamesStarted" }); // Stringify the request body as JSON

        // Send POST request to server to get leaderboard data sorted by most games started
        const response = await fetch(url + '/leaderboard', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: textJSON
        });

        // If response is not ok (error) log it
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(JSON.stringify(errData));
        }

        const result = await response.json(); // Parse response as JSON

        // If no result is received, throw an error
        if (!result) {
            throw new Error("No data received from server.");
        }

        // Get all table rows in the leaderboard body
        const tr = document.querySelectorAll("#leaderboard-body tr");

        // Set each row to result from leaderboard data
        tr.forEach(row => {
            const rowId = parseInt(row.id) - 1;
            row.querySelector(".username").textContent = result[rowId]['player'] || "N/A";
            row.querySelector(".games-started").textContent = result[rowId]['games_started'] || 0;
            row.querySelector(".games-won").textContent = result[rowId]['games_won'] || 0;

        });

        // If display flag is true, show success message in logger
        if (display) {
            logger.displayLog("info", "Leaderboard Reloaded Successfully", "--clr-success-a10", "Reload");
        }

        // Catch errors and log them
    } catch (error) {
        logger.error(`[index.fetchLeaderboard()] Error: ${error}`, 500, "Internal Server Error");
    }
}