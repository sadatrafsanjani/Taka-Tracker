const CACHE_KEY = "exchangeRatesCache";
const CACHE_DURATION = 5 * 60 * 1000;

const BB_URL = "https://www.bb.org.bd/en/index.php/econdata/exchangerate";

chrome.runtime.onMessage.addListener((message) => {

    if (!message || message.type !== "GET_EXCHANGE_RATE") {
        return;
    }

    return getExchangeRate()
        .then((html) => ({
            success: true,
            data: html
        }))
        .catch((error) => ({
            success: false,
            error: error instanceof Error
                ? error.message
                : "Unable to retrieve exchange rates."
        }));
});

async function getExchangeRate() {

    const cached = await chrome.storage.local.get(CACHE_KEY);

    if (cached[CACHE_KEY]) {

        const cache = cached[CACHE_KEY];

        if (
            cache.timestamp &&
            Date.now() - cache.timestamp < CACHE_DURATION &&
            typeof cache.data === "string" &&
            cache.data.length > 0
        ) {
            return cache.data;
        }
    }

    const response = await fetch(BB_URL, {
        method: "GET",
        cache: "no-store",
        credentials: "omit"
    });

    if (!response.ok) {
        throw new Error(
            "Bangladesh Bank returned HTTP " + response.status
        );
    }

    const html = await response.text();

    if (!html || html.trim().length === 0) {
        throw new Error("Bangladesh Bank returned an empty response.");
    }

    await chrome.storage.local.set({
        [CACHE_KEY]: {
            timestamp: Date.now(),
            data: html
        }
    });

    return html;
}
