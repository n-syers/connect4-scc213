import { logger } from './utils/logger.js';

const loggerElement = document.getElementsByClassName("logger-main-container")[0];
const loggerIcon = document.getElementById("logger-icon");
const loggerTitle = document.getElementById("log-title");
const loggerMessage = document.getElementById("log-message");
const log = new logger(loggerElement, loggerIcon, loggerTitle, loggerMessage);

const url = window.location.origin;
log.info(`Connected to Connect4 via ${url}`);

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
            log.info(`Joining Game with Code: ${gamecode}`, 102);
            setlocalStorageItems(gamecode, 'opvp');
            window.location.href = './gameboard';
        } catch (error) {
            log.error(error.message);
        }
    });

} catch (error) {
    log.error(error)
}


function setlocalStorageItems(gamecode, gamemode, uuid = -1) {
    try {
        localStorage.setItem('gamecode', gamecode);
        localStorage.setItem('gamemode', gamemode);
        localStorage.setItem('UUID', uuid);
    } catch (error) {
        log.error(error.message);
    }
}

async function startGame(gamemode) {
    log.info(`Starting New ${gamemode.toUpperCase()} Game`, 102);
    try {
        const response = await fetch(url + `/${gamemode}`);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(JSON.stringify(errData));
        }
        const result = await response.json();
        log.debug(JSON.stringify(result), result.status);
        setlocalStorageItems(result.gameCode, gamemode);
        window.location.href = './gameboard';
    } catch (error) {
        log.error(error.message);
    }
}