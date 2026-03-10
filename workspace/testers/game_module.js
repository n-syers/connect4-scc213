const logger = require("../logger.js");

try {
    const game_module = require("../gameClass.js");

    let game = new game_module.game("lpvp", 123456);

} catch (err) {
    logger.error(err, 500)
}