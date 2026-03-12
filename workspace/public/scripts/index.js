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
    const join_game = document.getElementById('join-game-button');
    const start_lpvp_a = document.getElementById('start_lpvp_a');
    const start_opvp_a = document.getElementById('start_opvp_a');
    const start_pvain_a = document.getElementById('start_pvain_a');
    const start_pvaim_a = document.getElementById('start_pvaim_a');
    const start_pvaih_a = document.getElementById('start_pvaih_a');

    start_lpvp_a.addEventListener('click', async () => await startGame('lpvp'));
    start_opvp_a.addEventListener('click', async () => await startGame('opvp'));
    start_pvain_a.addEventListener('click', async () => await startGame('pvain'));
    start_pvaim_a.addEventListener('click', async () => await startGame('pvaim'));
    start_pvaih_a.addEventListener('click', async () => await startGame('pvaih'));

    join_game.addEventListener('click', async () => {
        try {
            let gamecode = document.getElementById('join-code-input').value;
            logger.info(`Joining game with code: ${gamecode}`, 102, "Processing");
            setlocalStorageItems(gamecode, 'opvp');
            window.location.href = './gameboard';
        } catch (error) {
            logger.error(`[index.joinGameEvent] Error ${error}`, 500, "Internal Server Error");
        }
    });

} catch (error) {
    logger.error(`[index.js] Error: ${error}`, 0, "UnknownError")
}


function setlocalStorageItems(gamecode, gamemode, uuid = -1) {
    try {
        localStorage.setItem('gamecode', gamecode);
        localStorage.setItem('gamemode', gamemode);
        localStorage.setItem('UUID', uuid);
    } catch (error) {
        logger.error(`[index.setLocalStorageItems()] Error: ${error}`, 22, "QuotaExceededError");
    }
}

async function startGame(gamemode) {
    logger.info(`Starting New ${gamemode} Game`, 102);
    try {
        const response = await fetch(url + `/${gamemode}`);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(JSON.stringify(errData));
        }
        const result = await response.json();
        logger.debug(JSON.stringify(result), result.status);
        setlocalStorageItems(result.gameCode, gamemode);
        window.location.href = './gameboard';
    } catch (error) {
        logger.error(`[index.startGame()] Error: ${error}`, 500, "Internal Server Error");
    }
}

async function fetchLeaderboard() {
    logger.info(`Fetching Leaderboard Data`, 102, "Processing");
    try {
        const response = await fetch(url + '/leaderboard');
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(JSON.stringify(errData));
        }
        const result = await response.json();
        logger.debug(JSON.stringify(result), result.status);
    } catch (error) {
        logger.error(`[index.fetchLeaderboard()] Error: ${error}`, 500, "Internal Server Error");
    }
}