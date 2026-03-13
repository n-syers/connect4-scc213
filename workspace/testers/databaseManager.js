const dbm = require('../utils/databaseManager.js');
const logger = require('../utils/logger.js');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* Main function to test database operations */

async function main() {
    dbm.open_connection();
    dbm.create_table();
    dbm.insertFalseData();
    logger.table(await dbm.getMostGamesStarted());
    dbm.addGame("Test", "Test2", "Test");
    dbm.addGame("Test", "Test4", "Test");
    logger.table(await dbm.getMostGamesStarted());
    dbm.close_connection();
}

try {
    main();
} catch (error) {
    console.error(`Error in testing databaseManager.js: ${error}`)
}