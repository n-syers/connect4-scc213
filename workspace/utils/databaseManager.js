const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./logger.js');

const falseDataPath = path.join(__dirname, "../cache/fakeData.json"); // Path to fake json file.

/* ONLY ASSIGN ONE dbPath. If file DBs start working. Switch*/
//const dbPath = path.join(__dirname, "../cache/leaderboard.db");
const dbPath = ":memory:"; // Use in-memory database as file-based db does not work on LAB machines
let db = null;

/* Open a database connection if not already open */
function open_connection() {
    try {
        // Check if a connection is already open
        if (db !== null) {
            logger.warn("Database connection already open.", 102);
            return;
        };

        // Open a new database connection at the specified path
        db = new sqlite3.Database(dbPath, (err) => {
            // If an error occurs, log message
            if (err) {
                logger.error(err.message, err.errno);
            } else {
                logger.info('Connected to games.db successfully.');
            }
        });

        // Create the "games" table
        create_table();

        // Insert fake data for testing purposes
        insertFalseData();
    } catch (error) {
        logger.error(error.message, 500);
    }
}


// Close the database connection if it is open
function close_connection() {
    // Check if db connection exists
    if (db) {
        // Close connection
        db.close((err) => {
            // If an error occurs, log message
            if (err) {
                logger.error(err.message, err.errno);
            } else {
                logger.info("Database connection closed successfully.", 200);
            }
        });
    } else {
        logger.warn("No database connection to close.", 400);
    }
}

// Create the games table if it doesn't exist
function create_table() {
    // Execute SQL command to create "games" table with gameID, player1, player2, and winner columns
    db.serialize(() => {
        db.run(
            'CREATE TABLE IF NOT EXISTS games (\
                    gameID INTEGER PRIMARY KEY AUTOINCREMENT,\
                    player1 TEXT NOT NULL,\
                    player2 TEXT,\
                    winner TEXT\
                )', (err) => {
            // If an error occurs, log
            if (err) {
                logger.error(err.message, err.errno)
            } else {
                logger.info("Table \"games\" created or already exists", 200);
            }
        });
    });
}


// Get the top 10 players with the most games started
// Tracked via "player1"
// Returns a promise with SQL results
async function getMostGamesStarted(orderby = "games_started") {
    logger.debug('Retrieving 10 players with most games started.', 102);

    const RECORD_LIMIT = 10; // Limit for number of records to retrieve

    // Select top 10 players with count of games started and count of wins, ordered by games started.
    // Uses one query to simplify data retrieval and reduce resource load.
    // Player Name from player1 and player2 column. Count of player names in player1 and player2 column. Count of player names in winner column.
    const query = `
    SELECT player,
    COUNT(*) AS games_started, (SELECT COUNT(*) FROM games g2 WHERE g2.winner = player) AS games_won
    FROM (SELECT player1 AS player FROM games UNION ALL SELECT player2 AS player FROM games) AS combined_players
    GROUP BY player
    ORDER BY ${orderby} DESC
    LIMIT ${RECORD_LIMIT};`;

    // Returns a promise for asynchronous handling
    return new Promise((resolve, reject) => {
        // Execute the query and resolve with data or reject with error
        db.serialize(() => {
            db.all(query, (err, data) => {
                if (err) reject(err);
                resolve(data);
            });
        });
    });
}

// Add a new game record to the datebase.
function addGame(player1, player2, winner) {

    // Ensure player1 is never NULL
    if (player1 === null || player1 === undefined) {
        player1 = "Unknown";
    }
    if (player2 === undefined) {
        player2 = null;
    }
    if (winner === undefined || winner === null) {
        winner = null;
    }

    // Create insert query with parameters to prevent SQL injection
    const query = "INSERT INTO games (player1, player2, winner) VALUES (?, ?, ?)";

    // Execute the query with provided parameters
    db.serialize(() => {
        db.run(query, [player1, player2, winner], (err) => {
            // On error log message
            if (err) {
                logger.error(`addGame Error: ${err.message}`, err.errno);
            } else {
                logger.info(`Game record added: ${player1} vs ${player2} | Winner: ${winner}`, 201);
            }
        });
    });
}

// Insert fake data from JSON file into the database for testing
function insertFalseData() {
    logger.debug(`Inserting fake data from '${falseDataPath}'`, 102);

    // Read the JSON file contents and parse it into a JSON object
    const rawData = fs.readFileSync(falseDataPath, 'utf8');
    const jsonData = JSON.parse(rawData);

    // Create the insert query
    const query = "INSERT INTO games (player1, player2, winner) VALUES (?, ?, ?)";

    // For each entry inside of JSON, insert new record into the database
    // There is a total of 75 records in fakeData.json
    db.serialize(() => {
        // Loop through each element in the JSON data
        jsonData.forEach(element => {

            // Get the player data from JSON element
            let player1 = element.player1;
            let player2 = element.player2;
            let winner = element.winner;

            // Run the query with parameters
            db.run(query, [player1, player2, winner], (err) => {
                // Log errors
                if (err) {
                    logger.error(err.message, err.errno);
                }
            });
        });
        logger.info(`Added ${jsonData.length} fake records to database.`, 201);
    });

}

module.exports = {
    open_connection,
    close_connection,
    create_table,
    getMostGamesStarted,
    insertFalseData,
    addGame
};