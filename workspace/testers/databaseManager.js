const dbm = require('../utils/databaseManager.js');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* Main function to test database operations */

function main() {
    dbm.open_connection();
    dbm.create_table();
    dbm.insertFalseData();
    dbm.getMostGamesStarted();
    dbm.addGame("Test", "Test2", "Test");
    dbm.addGame("Test", "Test4", "Test");
    dbm.getMostGamesStarted();

}

main();