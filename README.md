# Connect4

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript\&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js\&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?logo=express\&logoColor=white)
![WebSockets](https://img.shields.io/badge/WebSockets-010101?logo=socketdotio\&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite\&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5\&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css\&logoColor=white)

A browser-based Connect 4 game built with JavaScript, Node.js, Express, WebSockets, and SQLite. Play against another person on the same device, join an online lobby with a six-digit game code, or challenge one of three computer opponents.

Originally developed for Lancaster University's **SCC213** module, this repository is now maintained as a portfolio project following completion of the original submission.

## Features

- Standard **7-column × 6-row** board with horizontal, vertical, and diagonal win detection and full-board draw detection.
- Local multiplayer, online multiplayer, and three AI difficulties, including a custom minimax implementation.
- Server-managed boards, turns, and move validation, with real-time opponent and AI updates.
- Turn announcements, invalid-move notifications, win/loss/draw feedback, and reset controls.
- Keyboard shortcuts and three board colour themes.
- A SQLite-backed top-10 leaderboard populated with demonstration data.
- Separate server and browser logging utilities.

The current configuration is intended for local development. See [Security and deployment](#security-and-deployment) before adapting it for public hosting.

## Getting started

### Requirements

- Node.js and npm.
- A browser with JavaScript, WebSocket, `localStorage`, and `sessionStorage` support.
- Available ports **3000**, **3001**, and **3030** in the default configuration.

The server mixes CommonJS (`require`) and ES modules (`import`/`export`). Use a Node.js runtime that supports automatic ES module syntax detection and loading synchronous ES modules through `require()`. The repository does not pin a Node.js version or declare a minimum in `package.json`; older runtimes may fail to load the modules.

### Install and run

From the repository root:

```bash
npm install
node workspace/webserver.js
```

Open **[http://localhost:3000](http://localhost:3000)**. Stop the server with **Ctrl+C**.

There is no frontend build step: Express serves the HTML, CSS, and browser JavaScript directly from `workspace/public/`.

You can also launch the server with `npm start` or `npm run dev`; both run `workspace/webserver.js`.

The `/gameboard` route redirects to `gameboard.html`. Create or join a game through the main menu first, because the board expects game information in browser storage.

### Development container

[.devcontainer.json](.devcontainer.json) defines the original SCC213 environment using `scc-registry.lancs.ac.uk/teaching/scc_213/web:25.1`, with the repository mounted at `/workspace`. Using it requires access to that registry; the local startup instructions above do not depend on the container.

## Playing the game

Choose a mode from **Select Gamemode**, enter a username, and select **Start Game**. In online mode, both players must join and ready up before play begins.

Click a board cell to drop a disc into that cell's column, or press **1–7** to select a column. Discs occupy the lowest available space. Connect four horizontally, vertically, or diagonally to win; a full board without a winner is a draw.

| Mode | Internal code | Behaviour |
| --- | --- | --- |
| Local Player vs Player | `lpvp` | Two people alternate turns in one browser on the same device. |
| Online Player vs Player | `opvp` | Two browser clients join a shared lobby using a six-digit game code. |
| Player vs Naive AI | `pvain` | The computer chooses random columns, retrying unsuccessful moves. |
| Player vs Medium AI | `pvaim` | The computer looks for an immediate win, then an immediate opponent threat to block, and otherwise uses the naive AI. |
| Player vs Hard AI | `pvaih` | The computer searches up to four moves ahead using minimax, with a fallback to the medium AI when no column is returned. |

During an active game, **Reset Game** or **R** requests a reset. Local and AI games reset directly; online games ask the opponent to accept or decline. After a win or draw, use **Main Menu** to create another game.

### Online multiplayer on one computer

1. Open [http://localhost:3000](http://localhost:3000) for the first player.
2. Select **Online Player vs Player** and note the displayed game code.
3. Open [http://localhost:3001](http://localhost:3001) for the second player.
4. Select **Join Online Game**, enter the code, and choose **JOIN**.
5. Enter a username and select **Start Game** in each client.

Both HTTP listeners serve the same application and share the same games. Their different ports provide separate browser origins, preventing the players' `localStorage` values from overwriting each other. Separate browser profiles can also provide storage isolation.

### Ports and playing across devices

The defaults are defined near the top of [workspace/webserver.js](workspace/webserver.js):

| Setting | Default | Purpose |
| --- | --- | --- |
| `port` | `3000` | Main HTTP listener. |
| `openAdditionalPort` | `true` | Enables a second HTTP listener at `port + 1` for local multiplayer testing. |
| `wsPort` | `3030` | WebSocket listener for game events. |
| `ip` | `0.0.0.0` | Binds the listeners to all IPv4 interfaces. |

Set `openAdditionalPort` to `false` to disable port 3001.

For cross-device play on a local network, open `http://<server-ip>:3000` from each device. Create an online game on one device and join with its game code on the other. Both devices must be able to reach the host on HTTP port 3000 and WebSocket port 3030.

In [workspace/public/scripts/gameboard.js](workspace/public/scripts/gameboard.js), `wsOpen()` uses the page's hostname automatically. It selects `ws://` for HTTP pages and `wss://` for HTTPS pages. If you change `wsPort`, update the browser's WebSocket port too. The supplied server uses plain HTTP; HTTPS hosting requires TLS termination for both HTTP and WebSocket traffic.

## How it works

The browser handles presentation and submits game actions through HTTP requests. Express routes those actions to the game manager, which stores active games in an in-memory `Map`. Each game instance owns its board, player identifiers, usernames, turn, and start/reset conditions.

The server checks whose turn it is and whether a column can accept a disc, then returns the move result. Browser updates do not determine the authoritative board state.

WebSockets carry server-to-client events: connection identifiers, opponent and AI moves, game starts, reset requests, and reset declines. Moves and other player actions are submitted over HTTP; the server only logs incoming WebSocket messages. AI responses are scheduled after a one-second delay. Local multiplayer does not open a WebSocket connection.

### AI fallback

```text
Hard AI → Medium AI → Naive AI
```

Hard mode falls back when minimax returns `null`. Medium mode falls back when it finds no winning or blocking move. The naive implementation retries random columns until a move succeeds.

This is a move-selection fallback, not a general error-recovery mechanism. There is no final “all strategies failed” error or retry limit; invalid game states can leave an AI retry loop running indefinitely.

### Hard AI: minimax

[workspace/modules/minimax.js](workspace/modules/minimax.js) implements the search. The game manager supplies a depth of **4**, including the initial candidate AI move; the class itself defaults to depth 3 when no depth is supplied.

For each available column, the algorithm:

1. Copies the board and simulates the AI's move.
2. Checks for a win, loss, or full-board draw.
3. Recursively explores the opponent's replies and subsequent AI moves.
4. Alternates between minimising and maximising the score.
5. Evaluates unfinished positions when the remaining search depth reaches zero.
6. Returns the column with the highest resulting score.

The heuristic examines horizontal, vertical, and diagonal four-cell sections, with an additional evaluation of the centre column. Uncontested groups of two and three pieces contribute scores of 10 and 100 respectively; four pieces contribute 100,000, with negative scores for the opponent's patterns.

Terminal wins and losses return `±100000 × (remainingDepth + 1)`; draws return zero. This weighting favours earlier wins and delays unavoidable losses: an earlier win leaves more search depth and earns a larger positive score. Adding one keeps wins and losses distinct from draws even at the depth limit. Search scores start at negative or positive infinity so these depth-weighted values are not clipped. The implementation has no alpha–beta pruning.

## Themes and accessibility

The interface was developed with **WCAG 2.1 Level AA as a design target**. This is not a claim of verified conformance or formal certification.

Implemented support includes:

- Headings, main/navigation landmarks, and labels for inputs and controls.
- Focusable controls, menu visibility through `:focus-within`, and Enter-key handlers for mode selection and leaderboard refresh.
- Number-key column selection and the **R** reset shortcut.
- Alert notifications and polite live regions for the leaderboard and game code.
- Three board palettes: **red/yellow**, **red/blue**, and **purple/orange**. The last is labelled “Universal Colourblindness” in the menu.

Select a theme on the main menu before entering a game. The choice is stored in `sessionStorage` and applied to the board.

Accessibility work remains: tokens are distinguished by colour without additional shapes or patterns, turn announcements are not live regions, and the game dialog's `aria-labelledby` references a misspelled ID. The theme label should therefore not be taken as a guarantee of accessibility for every type of colour-vision deficiency.

## Leaderboard and storage

The main menu displays up to ten entries, ranked by the database's `games_started` count, with username and wins alongside it. Use the refresh control to reload the table.

[workspace/utils/databaseManager.js](workspace/utils/databaseManager.js) creates a `games` table with `gameID`, `player1`, `player2`, and `winner` columns. On startup it loads **75 demonstration records** from [workspace/cache/fakeData.json](workspace/cache/fakeData.json).

### What the statistics represent

Despite the **Games Started** label, the application inserts gameplay records when a result is processed, not when a game starts. The leaderboard counts appearances in both player columns of those records.

- **Online games:** records contain both usernames and the winner, or a null winner for a draw.
- **Local games:** the same username is stored in both player columns, so one recorded game contributes two appearances. No named winner is recorded.
- **AI games:** the opponent is stored as null. Current result handling is incomplete: the human-win check uses the AI's player index, and AI-generated terminal moves bypass the result-recording path. AI statistics should not be treated as reliable.

Null player entries are included by the aggregation query and displayed as `N/A`. The browser requests ranking by games started; the server's `mostWins` branch calls a database function that has not been implemented.

### In-memory and file-backed databases

The active configuration is:

```js
const dbPath = ":memory:";
```

This was chosen for the original lab environment, where file-backed database access did not work. Each server start creates a fresh database and reloads the demonstration records, so changes made during a session are lost on shutdown. Active games are also stored only in memory.

A commented alternative points to the bundled database file:

```js
const dbPath = path.join(__dirname, "../cache/leaderboard.db");
```

To experiment with persistence, enable that declaration and disable the `:memory:` declaration, leaving exactly one `dbPath`. File-backed operation remains unverified. Startup currently inserts the seed records unconditionally, so persistent use also requires changing the seeding logic to avoid inserting another copy on each restart. The bundled `leaderboard.db` is not used by the default configuration.

## Project structure

```text
.
├── README.md
├── package.json
├── package-lock.json
├── .devcontainer.json
└── workspace/
    ├── webserver.js
    ├── cache/
    │   ├── fakeData.json
    │   └── leaderboard.db
    ├── modules/
    │   ├── gameClass.js
    │   └── minimax.js
    ├── utils/
    │   ├── databaseManager.js
    │   ├── gameManager.js
    │   └── logger.js
    ├── public/
    │   ├── index.html
    │   ├── gameboard.html
    │   ├── favicon.ico
    │   ├── scripts/
    │   │   ├── index.js
    │   │   ├── gameboard.js
    │   │   └── utils/logger.js
    │   └── styles/
    │       ├── base.css
    │       ├── variables.css
    │       ├── index.css
    │       ├── gameboard.css
    │       └── logger.css
    └── testers/
        ├── databaseManager.js
        ├── gameManager.js
        ├── game_module.js
        ├── logger.js
        └── minimax.js
```

| Component | Responsibility |
| --- | --- |
| `webserver.js` | HTTP routes, static files, WebSocket connections, and event delivery. |
| `modules/gameClass.js` | Individual game state, gravity, turns, win/draw detection, readiness, and resets. |
| `modules/minimax.js` | Hard AI search, simulated moves, and board evaluation. |
| `utils/gameManager.js` | Game codes, active lobbies, player joins, AI selection, and result recording. |
| `utils/databaseManager.js` | SQLite connection, schema, seed data, inserts, and leaderboard aggregation. |
| `utils/logger.js` | Coloured console output with severity, status codes, and table formatting. |
| `public/scripts/` | Menu and board interactions, browser storage, HTTP requests, WebSocket events, and notifications. |
| `public/styles/` | Shared colours, layout, board palettes, menus, and notification styling. |

The application uses `express`, `cors`, `ws`, and `sqlite3`. Although `axios`, `prompt-sync`, `react`, and `react-dom` are also declared dependencies, the current application source does not use them. The frontend uses browser APIs directly.

## Testing

The files in `workspace/testers/` are standalone development utilities, not a complete automated test suite. They print output rather than providing comprehensive assertions, and there is no `npm test` script.

Run the working utilities from the repository root:

```bash
node workspace/testers/logger.js
node workspace/testers/databaseManager.js
node workspace/testers/minimax.js
node workspace/testers/gameManager.js
node workspace/testers/game_module.js
```

The logger utility deliberately prints sample errors and warnings. The database utility loads seed data a second time after `open_connection()` has already seeded the database, so its counts differ from a normal server session. The minimax utility generates a random board and uses depth 3, so its output varies.

The game manager and game class utilities check basic game creation; they do not exercise full games.

For application testing, run the server and check each game mode, alternating turns, full-column rejection, all win directions, draws, AI replies, reset acceptance/decline, theme selection, keyboard controls, and leaderboard updates. Use the two HTTP origins for online testing. Browser rendering, assistive-technology behaviour, and complete multiplayer flows require separate end-to-end verification.

## Security and deployment

Implemented controls include server-owned game state, turn and full-column checks, parameterised SQL inserts for player data, static serving from the designated public directory, and `textContent` updates for displayed usernames and notifications. Console logging covers requests, game activity, database operations, and errors.

These controls do not make the default configuration ready for public deployment:

- Traffic uses HTTP and `ws://`, and CORS accepts all origins.
- The listeners bind to `0.0.0.0`; WebSocket upgrade requests have no origin validation.
- Usernames are not authenticated accounts. Game codes and client-supplied connection identifiers do not establish a trusted identity.
- Request validation and lifecycle checks are incomplete; application rate limiting and dedicated security-header middleware are absent.
- Active games and the default leaderboard database are temporary.

Public hosting would require HTTPS/WSS, appropriate origin restrictions, stronger validation and authorisation, rate limiting, security headers, and a reviewed persistence strategy with suitable access controls.
