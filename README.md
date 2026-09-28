# Taka Tracker

Taka Tracker is a Chrome extension built with Angular for tracking and displaying currency exchange rates, with exchange-rate data sourced from Bangladesh Bank.

The project uses Angular SSR to handle server-side retrieval of the Bangladesh Bank exchange-rate page. Since the source page does not provide browser CORS access, the exchange-rate HTML is retrieved server-side and parsed using Cheerio before being consumed by the Angular application.

## Features

- Chrome extension built with Angular
- Bangladesh Bank exchange-rate integration
- Exchange-rate HTML extraction
- Server-side rendering with Angular SSR
- Server-side HTML parsing with Cheerio
- Five-minute in-memory exchange-rate caching
- RxJS-based HTTP and error handling
- Bootstrap and Bootstrap Icons integration

## Architecture

```text
                    ┌─────────────────────┐
                    │   Angular Extension │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Currency Service   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Cache Service    │
                    │      5 minutes      │
                    └──────────┬──────────┘
                               │
                         Cache miss
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Angular SSR      │
                    │     / Node.js       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Bangladesh Bank   │
                    │   Exchange Rates    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Cheerio        │
                    │   HTML extraction   │
                    └─────────────────────┘
```

## Why SSR?

The Bangladesh Bank exchange-rate page does not expose the required CORS headers for direct browser requests.

A direct Angular browser request therefore results in a CORS error.

SSR moves the request to the Node.js server:

```text
Browser
   │
   │ Angular application
   ▼
SSR Server
   │
   │ HTTP request
   ▼
Bangladesh Bank
```

CORS is a browser security mechanism, so the server-side request can retrieve the HTML without requiring Bangladesh Bank to enable browser CORS access.

## Caching

Exchange-rate data is cached in memory for five minutes.

The flow is:

```text
Request
  │
  ├── Cached and valid ──► Return cached data
  │
  └── Cache miss/expired
             │
             ▼
       Fetch Bangladesh Bank
             │
             ▼
        Update cache
             │
             ▼
        Return new data
```

The cache is implemented by `CacheService`.

```ts
cacheService.put('rate', data);
```

A cached value remains valid for five minutes.

The cache is process-local and is cleared when the SSR process restarts.

## Technology Stack

- Angular
- TypeScript
- Angular SSR
- RxJS
- Cheerio
- Bootstrap
- Bootstrap Icons
- Node.js

## Requirements

- Node.js
- npm
- Angular CLI

Check your installed versions:

```bash
node --version
npm --version
ng version
```

## Installation

Clone the repository:

```bash
git clone https://github.com/sadatrafsanjani/Taka-Tracker.git
```

Enter the project directory:

```bash
cd Taka-Tracker
```

Install dependencies:

```bash
npm install
```

## Development

Start the Angular development server:

```bash
npm start
```

The application will be available through the Angular development server.

## Build

Create a production build:

```bash
npm run build
```

The generated files are placed in the `dist` directory.

## SSR

The project includes an Angular SSR entry point and a Node.js server.

After building the project, the generated SSR application can be started using the project's SSR configuration.

The SSR server is responsible for server-side operations that cannot be performed directly in the browser, including retrieving the Bangladesh Bank exchange-rate page.

## Chrome Extension

After creating the production build:

1. Open Chrome.
2. Navigate to:

```text
chrome://extensions/
```

3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the directory containing the generated extension files and `manifest.json`.

## Project Structure

```text
Taka-Tracker/
├── src/
│   ├── app/
│   │   ├── services/
│   │   │   ├── cache.service.ts
│   │   │   └── currency.service.ts
│   │   └── ...
│   ├── main.ts
│   └── main.server.ts
│
├── server.ts
├── angular.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
└── README.md
```

## Exchange Rate Data

The exchange-rate source is the Bangladesh Bank exchange-rate page:

```text
https://www.bb.org.bd/en/index.php/econdata/exchangerate
```

The application retrieves the HTML and extracts the relevant exchange-rate table data.

## Error Handling

The currency service uses RxJS operators including:

- `retry()` for transient request failures
- `catchError()` for request errors
- `throwError()` for propagating application errors

Network failures are reported separately from HTTP errors.

## License

This project does not currently specify a license.

If you intend to make the project open source, add an appropriate `LICENSE` file and update this section accordingly.
