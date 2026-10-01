import { CONFIG } from "./config.js";
import { MESSAGES } from "./js/messages.js";
import { RatesError } from "./js/errors.js";

const CACHE_KEY = "exchangeRatesCache";
const CACHE_DURATION = 5 * 60 * 1000;
const REQUEST_TIMEOUT = 15 * 1000;

const BB_URL = CONFIG.ratesUrl;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (sender.id !== chrome.runtime.id) {
        return false;
    }

    if (!message || message.type !== "GET_EXCHANGE_RATE") {
        return false;
    }

    getExchangeRate()
        .then((html) => {
            reply(sendResponse, {
                success: true,
                data: html
            });
        })
        .catch((error) => {
            console.error("GET_EXCHANGE_RATE failed:", error);

            reply(sendResponse, {
                success: false,
                error: toFriendlyMessage(error)
            });
        });

    return true;
});

function reply(sendResponse, payload) {

    try {
        sendResponse(payload);
    }
    catch (error) {
        console.warn("Unable to send response:", error);
    }
}

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
        console.warn("Unable to read rates cache:", error);
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
        console.warn("Unable to save rates cache:", error);
    }
}

async function fetchRatesPage() {

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {

        let response;

        try {

            response = await fetch(BB_URL, {
                method: "GET",
                cache: "no-store",
                credentials: "omit",
                signal: controller.signal
            });
        }
        catch (error) {
            throw toNetworkError(error);
        }

        if (!response.ok) {
            throw toHttpError(response.status);
        }

        let html;

        try {
            html = await response.text();
        }
        catch (error) {
            throw toNetworkError(error);
        }

        if (!html || html.trim().length === 0) {
            throw new RatesError("emptyResponse");
        }

        if (!/<table/i.test(html)) {
            throw new RatesError("unexpectedPage");
        }

        return html;
    }
    finally {
        clearTimeout(timer);
    }
}

function toNetworkError(error) {

    if (error && error.name === "AbortError") {
        return new RatesError("timeout", {cause: error});
    }

    return new RatesError("network", {cause: error});
}

function toHttpError(status) {

    if (status === 429) {
        return new RatesError("rateLimited");
    }

    if (status >= 500) {
        return new RatesError("serverError", {params: {status: status}});
    }

    return new RatesError("httpError", {params: {status: status}});
}

function toFriendlyMessage(error) {

    if (error instanceof RatesError) {
        return error.message;
    }

    return MESSAGES.unknown;
}
