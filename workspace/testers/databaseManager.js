const dbm = require('../utils/databaseManager.js');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

dbm.open_connection();
sleep(500);
dbm.create_table();
sleep(500);
dbm.insertFalseData();
sleep(500);
dbm.getMostGamesStarted();