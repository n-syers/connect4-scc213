const logger = require("../utils/logger.js");

try {
    const game_module = require("../modules/gameClass.js");

    let game = new game_module.game("lpvp", 123456);

} catch (err) {
    logger.error(err, 500)
}
