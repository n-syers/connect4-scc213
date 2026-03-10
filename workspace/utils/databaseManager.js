const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./logger.js');
const { useDebugValue } = require('react');

const falseDataPath = path.join(__dirname, "../cache/fakeData.json"); // Path to fake json file.

/* ONLY ASSIGN ONE dbPath. If file DBs start working. Switch*/
//const dbPath = path.join(__dirname, "../cache/leaderboard.db");
const dbPath = ":memory:"; // Use in-memory database as file-based db does not work on LAB machines
let db = null;

/* Open a database connection if not already open */
function open_connection() {
    {
        try {
            if (db !== null) { throw new Error("Database connection already open."); };
            db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    logger.error(err.message, err.errno);
                } else {
                    logger.info("Connected to games.db successfully. Creating Tables...", 200);
                }
            });
        } catch (error) {
            logger.error(error.message, 500);
        }
    }
}

/* Close the database connection if it is open */
function close_connection() {
    if (db) {
        db.close((err) => {
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

/* Create the games table if it doesn't exist */
function create_table() {
    db.run(
        'CREATE TABLE IF NOT EXISTS games (\
                gameID INTEGER AUTO_INCREMENT PRIMARY KEY,\
                player1 TEXT NOT NULL,\
                player2 TEXT,\
                winner INTEGER\
            )', (err) => {
        if (err) {
            logger.error(err.message, err.errno)
        } else {
            logger.info("Table \"games\" created or already exists", 200);
        }
    });
}

/*
Get the top 10 players with the most games started
Tracked via "player1"
Returns an array of objects with player's data
*/
function getMostGamesStarted() {
    logger.debug(`Retrieving 10 players with most games started.`, 102);

    const RECORD_LIMIT = 10;

    const query = `
    SELECT player, COUNT(*) AS player_count, (SELECT COUNT(*) FROM games WHERE winner = player) AS winner_count
    FROM (SELECT player1 AS player FROM games UNION ALL SELECT player2 AS player FROM games) AS combined_players
    GROUP BY player
    ORDER BY player_count DESC
    LIMIT ${RECORD_LIMIT};`;
    db.run(query, (err, data) => {
        if (err) {
            logger.error(err.message, err.errno);
        }
        logger.table(data);
    });
}

function insertFalseData() {
    logger.debug(`Inserting fake data from \'${falseDataPath}\'`, 102);

    fs.readFile(falseDataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file: ${err.message}`, err.errno);
        }
        const jsonData = JSON.parse(data);
        const query = "INSERT INTO games (player1, player2, winner) VALUES (?, ?, ?)";
        jsonData.forEach(element => {
            let player1 = element.player1;
            let player2 = element.player1;
            let winner = element.player1;
            db.run(query, [player1, player2, winner], (err) => {
                if (err) {
                    logger.error(err.message, err.errno);
                }
            })
        });
        logger.info(`Added 75 fake records to database.`, 201);
    })
    return;
}

module.exports = {
    open_connection,
    close_connection,
    create_table,
    getMostGamesStarted,
    insertFalseData
};