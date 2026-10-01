export const CONFIG = Object.freeze({

    ratesUrl: "https://www.bb.org.bd/en/index.php/econdata/exchangerate",
    historyUrl: "https://api.frankfurter.dev/v2/rates",
    historyFallbackUrls: [
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date}/v1/currencies/eur.min.json",
        "https://{date}.currency-api.pages.dev/v1/currencies/eur.min.json"
    ],
    svgUrl: "http://www.w3.org/2000/svg"
});
