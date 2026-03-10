const statusMap = {
    // TRACE CODES
    100: "Continue", // Client can continue with request
    101: "Switching protocols", // Switching to different protocol
    102: "Processing", // Received request and processing
    // INFO CODES
    200: "OK", // success
    201: "Created", // resource created
    202: "Accepted", // track asynchronous tasks
    204: "No content", // Track actions that don't return data
    // DEBUG CODES
    301: "Moved permanently", // File moved permenantly
    304: "Not modified", // No change to the resource
    307: "Temporary redirect", // redirect
    308: "Permanent redirect", // redirec
    // WARN CODES
    400: "Bad request", // Can't understand request
    401: "Unauthorized", // Missing API key, credentials, or token
    403: "Forbidden", // Access Not Allowed
    404: "Not found", // Resource Not Found
    405: "Method not allowed", // Cannot access method
    408: "Request timeout", // Request Timed out
    413: "Payload too large", // Request too large for server
    422: "Unprocessable Entity", // Violation of rules
    426: "Upgrade required", // Upgrade to websocket required
    428: "Too many requests", // Client sending too many requests
    // ERROR CODES
    500: "Internal server error", // Generic Server Side Error
    501: "Not implemented", // Functionality not implemented
    502: "Bad gateway", // Failure in communication between servers.
    503: "Service unavailable", // Unable to handle requests due to overload or maintenance.
    504: "Gateway timeout", // Timeout
    505: "HTTP version not supported", // Unsupported version
    507: "Insufficient storage", // Lack of storage or resources.
    508: "Loop detected", // Infinate Loop Detected
};

function getStatusCodeTitle(status) {
    return statusMap[status] || "Unknown Status";
}

// ANSI Styles
const Style = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m"
};
// ANSI Foreground Colours
const Fg = {
    Black: "\x1b[30m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
    Magenta: "\x1b[35m",
    Cyan: "\x1b[36m",
    White: "\x1b[37m",
    Gray: "\x1b[90m"
};
// ANSI Background Colours
const Bg = {
    Black: "\x1b[40m",
    Red: "\x1b[41m",
    Green: "\x1b[42m",
    Yellow: "\x1b[43m",
    Blue: "\x1b[44m",
    Magenta: "\x1b[45m",
    Cyan: "\x1b[46m",
    White: "\x1b[47m",
    Gray: "\x1b[100m"
};

// Used to log an error in the console.
function error(message, status = 500) {
    const title = getStatusCodeTitle(status);
    console.error(
        `${Style.Reset}[${Fg.Red}ERROR${Style.Reset}]${Style.Reset}[${Fg.Red}${status}${Style.Reset}][${Fg.Red}${title}${Style.Reset}] ${Fg.Yellow}~ ${Bg.Red}${message}${Style.Reset}`
    );
}

// Used to log a warning in the console.
function warn(message, status = 400) {
    const title = getStatusCodeTitle(status);
    console.warn(
        `${Style.Reset}[${Fg.Yellow}WARN${Style.Reset}]${Style.Reset}[${Fg.Yellow}${status}${Style.Reset}][${Fg.Yellow}${title}${Style.Reset}] ${Fg.Yellow}~ ${Bg.Yellow}${message}${Style.Reset}`
    );
}

// Used to log a standard info.
function info(message, status = 200) {
    const title = getStatusCodeTitle(status);
    console.log(
        `${Style.Reset}[${Fg.Green}INFO${Style.Reset}]${Style.Reset}[${Fg.Green}${status}${Style.Reset}][${Fg.Green}${title}${Style.Reset}] ${Fg.Yellow}~ ${Fg.Green}${message}${Style.Reset}`
    );
}

// Used to log a debug info.
function debug(message, status = 102) {
    const title = getStatusCodeTitle(status);
    console.log(
        `${Style.Reset}[${Fg.Blue}DEBUG${Style.Reset}]${Style.Reset}[${Fg.Blue}${status}${Style.Reset}][${Fg.Blue}${title}${Style.Reset}] ${Fg.Yellow}~ ${Fg.Blue}${message}${Style.Reset}`
    );
}

// Used to log a trace of logic flow.
function trace(message, status = 102) {
    const title = getStatusCodeTitle(status);
    console.log(
        `${Style.Reset}[${Fg.Cyan}TRACE${Style.Reset}]${Style.Reset}[${Fg.Cyan}${status}${Style.Reset}][${Fg.Cyan}${title}${Style.Reset}] ${Fg.Yellow}~ ${Fg.Cyan}${message}${Style.Reset}`
    );
}

function table(data, tableTitle = "Table") {
    console.log(
        `${Style.Reset}[${Fg.Magenta}TABLE${Style.Reset}] ${Fg.Yellow}~ ${Fg.Magenta}Displaying ${tableTitle}:${Style.Reset}`
    );
    console.table(data);
}

module.exports = {
    error,
    warn,
    info,
    debug,
    trace,
    table
};
