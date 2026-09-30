import { CONFIG } from "./config.js";


const CACHE_KEY = "exchangeRatesCache";
const CACHE_DURATION = 5 * 60 * 1000;
const REQUEST_TIMEOUT = 15 * 1000;

const BB_URL = CONFIG.ratesUrl;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (!message || message.type !== "GET_EXCHANGE_RATE") {
        return false;
    }

    getExchangeRate()
        .then((html) => {
            sendResponse({
                success: true,
                data: html
            });
        })
        .catch((error) => {
            sendResponse({
                success: false,
                error: toFriendlyMessage(error)
            });
        });

    return true;
});

async function getExchangeRate() {

    const cache = await readCache();

    if (cache && isFresh(cache)) {
        return cache.data;
    }

    const html = await fetchRatesPage();

    await saveCache(html);

    return html;
}

async function readCache() {

    try {

        const stored = await chrome.storage.local.get(CACHE_KEY);
        const cache = stored[CACHE_KEY];

        if (
            cache &&
            typeof cache.timestamp === "number" &&
            typeof cache.data === "string" &&
            cache.data.length > 0
        ) {
            return cache;
        }
    }
    catch (error) {
        console.log("Cache empty");
    }

    return null;
}

function isFresh(cache) {

    const age = Date.now() - cache.timestamp;

    return age >= 0 && age < CACHE_DURATION;
}

async function saveCache(html) {

    try {

        await chrome.storage.local.set({
            [CACHE_KEY]: {
                timestamp: Date.now(),
                data: html
            }
        });
    }
    catch (error) {
        console.log("Caching failed!");
    }
}

async function fetchRatesPage() {

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {

        const response = await fetch(BB_URL, {
            method: "GET",
            cache: "no-store",
            credentials: "omit",
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error("Bangladesh Bank returned HTTP " + response.status);
        }

        const html = await response.text();

        if (!html || html.trim().length === 0) {
            throw new Error("Bangladesh Bank returned an empty response.");
        }

        if (!/<table/i.test(html)) {
            throw new Error("Bangladesh Bank returned an unexpected page.");
        }

        return html;
    }
    finally {
        clearTimeout(timer);
    }
}

function toFriendlyMessage(error) {

    if (error && error.name === "AbortError") {
        return "The request timed out. Please try again.";
    }

    if (error instanceof TypeError) {
        return "Unable to reach Bangladesh Bank. Check your internet connection.";
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "Unable to retrieve exchange rates.";
}
