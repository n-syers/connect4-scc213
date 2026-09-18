import logger from '../utils/logger.js';
import { createGame } from '../utils/gameManager.js';


try {
    logger.trace("Starting gameManager.js Test", 102);
    await createGame("lpvp");
    logger.trace("gameManager.js Test Complete.", 200);
} catch (error) {
    logger.error(`Test Stopped. ${error}`, 500);
}
