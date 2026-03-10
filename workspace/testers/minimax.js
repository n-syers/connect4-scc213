import minimax from "../modules/minimax.js";
import { game } from '../modules/gameClass.js';
import logger from '../utils/logger.js';

const newGame = new game("pvaih");

const playerUUID = 123;
const aiUUID = -1;

newGame.joinGame(playerUUID, "Player");
newGame.joinGame(aiUUID, "Ai");

newGame.set_activePlayer(); // Set active player to playerUUID (123)

// List of 15 moves to simulate a game
let moves = [
    { player: playerUUID, column: 3 }, // 1
    { player: aiUUID, column: 2 },     // 2
    { player: playerUUID, column: 4 }, // 3
    { player: aiUUID, column: 4 },     // 4
    { player: playerUUID, column: 1 }, // 5
    { player: aiUUID, column: 3 },     // 6
    { player: playerUUID, column: 1 }, // 7
    { player: aiUUID, column: 2 },     // 8
    { player: playerUUID, column: 6 }, // 9
    { player: aiUUID, column: 5 },     // 10
    { player: playerUUID, column: 6 }, // 11
    { player: aiUUID, column: 1 }, // 12
    { player: playerUUID, column: 5 }
];
async function generateRandomBoard(premoves) {

    let currentPlayer = (moves.length % 2 === 0) ? playerUUID : aiUUID;

    for (let i = 0; i < premoves; i++) {
        let column = Math.floor(Math.random() * 7);
        await newGame.move(currentPlayer, column);
        moves.push({ player: currentPlayer, column: column });
        currentPlayer = (currentPlayer === playerUUID) ? aiUUID : playerUUID;
    }
    // moves.forEach(move => {
    //     newGame.move(move.player, move.column);
    // });
}

// minimax(game instance, depth)
generateRandomBoard(15).then(async () => {
    let board = await newGame.getBoard();
    logger.table(board, "Generated Board State");
    const minimaxTester = new minimax(board, 3, playerUUID, aiUUID);
    minimaxTester.getBestMove();
    logger.info(`Best Move for AI: Column ${minimaxTester.bestColumn}`);
});