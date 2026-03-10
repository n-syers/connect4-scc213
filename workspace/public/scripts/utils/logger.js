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

// Logger Display Icon Mapping
const iconMap = {
    "error": "dangerous",
    "warning": "error",
    "info": "check_circle",
    "debug": "bug_report",
    "trace": "search"
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

export class logger {
    timer = null;
    // Used to log an error in the console.
    constructor(logger, icon, title, message) {
        this.logger = logger; // DOM element
        this.icon = icon; // DOM element
        this.title = title; // DOM element
        this.message = message; // DOM element

        this.logger.addEventListener('click', (event) => {
            this.logger.style.display = "none";
            clearTimeout(this.timer);
        });
    }

    error(message, status = 500, display = true, title = null) {
        const statusTitle = getStatusCodeTitle(status);
        console.error(
            `${Style.Reset}[${Fg.Red}ERROR${Style.Reset}]${Style.Reset}[${Fg.Red}${status}${Style.Reset}][${Fg.Red}${title || statusTitle}${Style.Reset}] ${Fg.Yellow}~ ${Fg.Red}${message}${Style.Reset}`
        );
        if (display) {
            this.displayLog("error", message, status, '--clr-danger-a10', title);
        }
    }

    // Used to log a warning in the console.
    warn(message, status = 400, display = false, title = null) {
        const statusTitle = getStatusCodeTitle(status);
        console.log(
            `${Style.Reset}[${Fg.Yellow}WARN${Style.Reset}]${Style.Reset}[${Fg.Yellow}${status}${Style.Reset}][${Fg.Yellow}${title || statusTitle}${Style.Reset}] ${Fg.Yellow}~ ${Fg.Yellow}${message}${Style.Reset}`
        );
        if (display) {
            this.displayLog("warning", message, status, '--clr-warning-a10', title);
        }

    }

    // Used to log a standard info.
    info(message, status = 200, display = false, title = null) {
        const statusTitle = getStatusCodeTitle(status);
        console.log(
            `${Style.Reset}[${Fg.Green}INFO${Style.Reset}]${Style.Reset}[${Fg.Green}${status}${Style.Reset}][${Fg.Green}${title || statusTitle}${Style.Reset}] ${Fg.Yellow}~ ${Fg.Green}${message}${Style.Reset}`
        );
        if (display) {
            this.displayLog("info", message, status, '--clr-success-a10', title);
        }
    }

    // Used to log a debug info.
    debug(message, status = 100, display = false, title = null) {
        const statusTitle = getStatusCodeTitle(status);
        console.log(
            `${Style.Reset}[${Fg.Blue}DEBUG${Style.Reset}]${Style.Reset}[${Fg.Blue}${status}${Style.Reset}][${Fg.Blue}${title || statusTitle}${Style.Reset}] ${Fg.Yellow}~ ${Fg.Blue}${message}${Style.Reset}`
        );
        if (display) {
            this.displayLog("debug", message, status, '--clr-info-a10', title || "Debug Information");
        }
    }

    // Used to log a trace of logic flow.
    trace(data, status = 100, display = false, title = null) {
        const statusTitle = getStatusCodeTitle(status);
        console.log(
            `${Style.Reset}[${Fg.Cyan}TRACE${Style.Reset}]${Style.Reset}[${Fg.Cyan}${status}${Style.Reset}][${Fg.Cyan}${title || statusTitle}${Style.Reset}] ${Fg.Yellow}~ ${Fg.Cyan}${data}${Style.Reset}`
        );
        if (display) {
            this.displayLog("trace", data, status, '--clr-info-a10', title || "Trace Information");
        }
    }

    displayLog(type, message, status, colour, title = null) {
        const logTitle = title || getStatusCodeTitle(status);
        const mappedColour = getComputedStyle(document.documentElement).getPropertyValue(colour) || '#ffffff';
        this.icon.textContent = iconMap[type] || "circle";
        this.icon.style.color = mappedColour;
        this.title.textContent = logTitle;
        this.title.style.color = mappedColour;
        this.message.textContent = message;
        this.logger.style.display = "flex";

        this.timer = setTimeout(() => {
            this.logger.style.display = "none";
        }, 5000);
    }
}