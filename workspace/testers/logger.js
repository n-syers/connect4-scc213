const logger = require('../utils/logger.js');

const error_message = "File or Directory Not Found";
const error_status = "404";

const warn_message = "Response time exceeded threshold: 1200ms";
const warn_status = "200";

const info_message = "Connected to \"leaderboard.db\" successfully";
const info_status = "200";

const debug_message = "Entered function tester(testID=123)";
const debug_status = "100";

const trace_message = "Loop iteration 3: itemId=57, status=processed";
const trace_status = "200";

logger.error(error_message, error_status);
logger.warn(warn_message, warn_status);
logger.info(info_message, info_status);
logger.debug(debug_message, debug_status);
logger.trace(trace_message, trace_status);