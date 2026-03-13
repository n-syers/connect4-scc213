const iconMap = {
    "error": "dangerous",
    "warning": "error",
    "info": "check_circle",
    "debug": "bug_report",
    "trace": "search"
}

const colourMap = {
    // Log Types
    "error": "#ff1e00",
    "warn": "#ffb700",
    "info": "#1ec231",
    "debug": "#2a8bd6",
    "trace": "#2ad6ca",
    "table": "#d62a9b",

    // Element Colours
    "reset": "#ffffff",
    "default": "#686666"
}

// Used to log errors, warnings, info, debug info and trace data in the console.
// Uses CSS to style the logs for better compatibility with browsers.
export class logger {
    timer = null; // Timer for auto-hiding logs

    // Construct the logger with references to the DOM elements for the log container, icon, title and message.
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

    // Used to log information in the console
    // Example: [INFO][200][OK] ~ This is an info message
    info(message, status, statusTitle = "Unknown Status") {
        console.info(
            `%c[%cINFO%c][%c${status}%c][%c${statusTitle}%c] %c~ %c${message}`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.info};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.info};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.info};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.warn};`,
            `color: ${colourMap.info};`
        );
    }

    // Used to log error information in the console. Displayed by default.
    // Example: [ERROR][500][Internal Server Error] ~ This is an error message
    error(message, status, statusTitle = "Unknown Status") {
        console.error(
            `%c[%cERROR%c][%c${status}%c][%c${statusTitle}%c] %c~ %c${message}`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.error};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.error};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.error};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.warn};`,
            `color: ${colourMap.error};`
        );
        displayLog("error", message, '--clr-danger-a10', statusTitle);
    }

    // Used to log warns in the console
    // Example: [WARN][400][Bad Request] ~ This is a warning message
    warn(message, status, statusTitle = "Unknown Status") {
        console.warn(
            `%c[%cWARN%c][%c${status}%c][%c${statusTitle}%c] %c~ %c${message}`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.warn};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.warn};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.warn};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.warn};`,
            `color: ${colourMap.warn};`
        );
    }

    // Used to log debug information in the console
    // Example: [DEBUG][100][Debug Information] ~ This is a debug message
    debug(message, status, statusTitle = "Unknown Status") {
        console.debug(
            `%c[%cDEBUG%c][%c${status}%c][%c${statusTitle}%c] %c~ %c${message}`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.debug};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.debug};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.debug};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.warn};`,
            `color: ${colourMap.debug};`
        );
    }

    // Used to log a trace of logic flow in the console
    // Example: [TRACE][100][Debug Information] ~ This is a trace message
    trace(message, status, statusTitle = "Unknown Status", stringified = null) {
        console.trace(
            `%c[%cTRACE%c][%c${status}%c][%c${statusTitle}%c] %c~ %c${message}`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.trace};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.trace};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.trace};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.warn};`,
            `color: ${colourMap.trace};`
        );
        if (stringified !== null) {
            const parsedData = JSON.parse(stringified);
            console.log(parsedData);
        }
    }

    // Used to log a table in the console
    // Example: [TABLE] ~ Displaying User Data: (table of user data)
    table(data, statusTitle = "Table") {
        console.log(
            `%c[%cTABLE%c] %c~ %cDisplaying ${statusTitle}:`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.table};`,
            `color: ${colourMap.reset};`,
            `color: ${colourMap.warn};`,
            `color: ${colourMap.table};`
        );
        if (typeof data === "object") {
            console.table(data);
        } else {
            this.error(`Invalid data type for table log. Expected object, received ${typeof data}.`, 500, "Invalid Log Data");
        }
    }

    // Displays a log message as a UI element
    // Hides after 5 seconds or when clicked
    displayLog(type, message, colour, title = "No Title Set") {
        const mappedColour = getComputedStyle(document.documentElement).getPropertyValue(colour) || '#ffffff';
        this.icon.textContent = iconMap[type] || "circle";
        this.icon.style.color = mappedColour;
        this.title.textContent = title;
        this.title.style.color = mappedColour;
        this.message.textContent = message;
        this.logger.style.display = "flex";

        this.timer = setTimeout(() => {
            this.logger.style.display = "none";
        }, 5000);
    }
}