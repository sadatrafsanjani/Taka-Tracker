import { CONFIG } from "../config.js";


(function () {

    "use strict";

    const HISTORY_DAYS = 7;
    const HIDDEN_CURRENCIES = ["LKR", "SEK"];

    const HISTORY_CACHE_KEY = "historyCache";
    const HISTORY_CACHE_TTL = 6 * 60 * 60 * 1000;
    const HISTORY_TIMEOUT = 8000;

    const $loading = $("#loading");
    const $errorContainer = $("#errorContainer");
    const $errorMessage = $("#errorMessage");
    const $rateContainer = $("#rateContainer");
    const $rateBody = $("#rateBody");
    const $updatedAt = $("#updatedAt");
    const $refreshButton = $("#refreshButton");
    const $retryButton = $("#retryButton");

    let selectedCurrency = null;
    let currentSeries = null;
    let historyFailed = false;
    let historyRequestId = 0;

    $(document).ready(function () {

        loadRates();

        $refreshButton.on("click", function () {
            loadRates(true);
        });

        $retryButton.on("click", function () {
            loadRates(true);
        });

        $rateBody.on("click", "tr", function () {

            selectedCurrency = $(this).attr("data-currency");

            updateSelectedRow();
            renderChart();
        });
    });

    function loadRates(forceRefresh) {

        showLoading();

        if (forceRefresh) {
            clearBackgroundCache();
        }

        chrome.runtime.sendMessage({type: "GET_EXCHANGE_RATE"}).then(function (response) {

            if (!response || !response.success) {
                showError(response && response.error ? response.error : "Unable to retrieve exchange rates.");
                return;
            }

            try {

                const rates = extractRates(response.data);

                if (!rates.length) {
                    throw new Error("No exchange rate data was found.");
                }

                renderRates(rates);

            }
            catch (error) {

                showError(error instanceof Error ? error.message : "Unable to parse exchange rates.");
            }
        })
            .catch(function (error) {

                showError(error.message || "Unable to communicate with extension service.");
            });
    }

    function clearBackgroundCache() {

        chrome.storage.local.remove("exchangeRatesCache");
    }

    function extractRates(html) {

        const parser = new DOMParser();
        const document = parser.parseFromString(html, "text/html");

        const result = [];

        $(document)
            .find("table")
            .each(function () {

                $(this)
                    .find("tr")
                    .each(function () {

                        const cells = [];

                        $(this)
                            .find("th, td")
                            .each(function () {

                                const text = $(this)
                                    .text()
                                    .replace(/\s+/g, " ")
                                    .trim();

                                cells.push(text);
                            });

                        if (cells.some(function (cell) {
                            return cell !== "";
                        })) {
                            result.push(cells);
                        }
                    });
            });

        const data = result
            .filter(function (row) {
                return row.length >= 3;
            })
            .filter(function (_, index) {
                return index !== 0 && index !== 2;
            });

        return data
            .map(function (row) {
                return {
                    currency: row[0] || "",
                    buy: row[1] || "",
                    sell: row[2] || ""
                };
            })
            .filter(function (rate) {
                return (
                    rate.currency !== "" ||
                    rate.buy !== "" ||
                    rate.sell !== ""
                );
            })
            .filter(function (rate) {
                return !HIDDEN_CURRENCIES.some(function (code) {
                    return new RegExp("\\b" + code + "\\b").test(rate.currency);
                });
            });
    }

    function pickDefaultCurrency(rates) {

        const usd = rates.filter(function (rate) {
            return /\bUSD\b/.test(rate.currency);
        });

        return usd.length ? usd[0].currency : rates[0].currency;
    }

    function renderRates(rates) {

        const stillExists = rates.some(function (rate) {
            return rate.currency === selectedCurrency;
        });

        if (!stillExists) {
            selectedCurrency = pickDefaultCurrency(rates);
        }

        currentSeries = null;
        historyFailed = false;

        $rateBody.empty();

        $.each(rates, function (index, rate) {

            const borderClass = index < rates.length - 1 ? "" : "border-bottom-0";

            const $row = $("<tr>", {
                class: "text-center",
                role: "button",
                "data-currency": rate.currency
            });

            $("<td>", {
                class: "px-2 py-1 fw-medium " + borderClass,
                text: rate.currency
            }).appendTo($row);

            $("<td>", {
                class: "px-2 py-1 fw-semibold text-primary " + borderClass,
                text: rate.buy
            }).appendTo($row);

            $("<td>", {
                class: "px-2 py-1 fw-semibold text-primary " + borderClass,
                text: rate.sell
            }).appendTo($row);

            $rateBody.append($row);
        });

        $updatedAt.text(
            "Last Updated: " + formatTime(new Date())
        );

        $loading.addClass("d-none");
        $errorContainer.addClass("d-none");
        $rateContainer.removeClass("d-none");
        $refreshButton.prop("disabled", false);

        updateSelectedRow();
        renderChart();
        loadHistory(rates);
    }

    function updateSelectedRow() {

        $rateBody.children("tr").each(function () {

            $(this).toggleClass("table-active", $(this).attr("data-currency") === selectedCurrency);
        });
    }

    function pad(n) {

        return n < 10 ? "0" + n : String(n);
    }

    function dateKey(date) {

        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    }

    function extractCodes(rates) {

        const codes = {};

        rates.forEach(function (rate) {

            const match = rate.currency.match(/\b[A-Z]{3}\b/);

            if (match) {
                codes[rate.currency] = match[0];
            }
        });

        return codes;
    }

    function fetchJson(url) {

        const controller = new AbortController();

        const timer = setTimeout(function () {
            controller.abort();
        }, HISTORY_TIMEOUT);

        return fetch(url, {signal: controller.signal})
            .then(function (response) {

                if (!response.ok) {
                    throw new Error("HTTP " + response.status);
                }

                return response.json();
            })
            .finally(function () {
                clearTimeout(timer);
            });
    }

    function fetchJsonWithRetry(url) {

        return fetchJson(url).catch(function () {
            return fetchJson(url);
        });
    }

    function readHistoryCache() {

        return chrome.storage.local.get(HISTORY_CACHE_KEY)
            .then(function (stored) {

                const cache = stored[HISTORY_CACHE_KEY];

                return cache && cache.data && typeof cache.timestamp === "number" ? cache : null;
            })
            .catch(function () {
                return null;
            });
    }

    function saveHistoryCache(data) {

        return chrome.storage.local
            .set({[HISTORY_CACHE_KEY]: {timestamp: Date.now(), data: data}})
            .catch(function () {
                // Caching is best-effort
            });
    }

    // Primary source: Frankfurter
    function fetchHistory(rates) {

        const codes = extractCodes(rates);

        const quotes = Array.from(new Set(["BDT"].concat(Object.keys(codes).map(function (key) {
            return codes[key];
        }))));

        const from = new Date();
        from.setDate(from.getDate() - 10);

        const url = CONFIG.historyUrl + "?from=" + dateKey(from) + "&quotes=" + quotes.join(",");

        return fetchJsonWithRetry(url).then(function (rows) {

            const byDate = {};

            rows.forEach(function (row) {

                if (!byDate[row.date]) {
                    byDate[row.date] = {};
                }

                byDate[row.date][row.quote] = row.rate;
            });

            const dates = Object.keys(byDate)
                .sort()
                .filter(function (date) {
                    return byDate[date].BDT;
                })
                .slice(-HISTORY_DAYS);

            const result = {};

            Object.keys(codes).forEach(function (currency) {

                const code = codes[currency];

                const validDates = dates.filter(function (date) {
                    return byDate[date][code];
                });

                result[currency] = {
                    dates: validDates,
                    values: validDates.map(function (date) {
                        return byDate[date].BDT / byDate[date][code];
                    })
                };
            });

            return result;
        });
    }

    // Fallback source: fawazahmed0 currency-api (jsDelivr, then Cloudflare mirror)
    function fetchFallbackDay(date) {

        const urls = CONFIG.historyFallbackUrls;

        function attempt(i) {

            if (i >= urls.length) {
                return Promise.resolve(null);
            }

            return fetchJson(urls[i].replace("{date}", date)).catch(function () {
                return attempt(i + 1);
            });
        }

        return attempt(0);
    }

    function fetchFallbackHistory(rates) {

        const codes = extractCodes(rates);

        const days = [];

        for (let i = HISTORY_DAYS; i >= 1; i--) {

            const day = new Date();
            day.setDate(day.getDate() - i);
            days.push(dateKey(day));
        }

        return Promise.all(days.map(fetchFallbackDay)).then(function (results) {

            const valid = results.filter(function (r) {
                return r && r.eur && r.eur.bdt;
            });

            if (valid.length < 2) {
                throw new Error("Fallback history unavailable");
            }

            const result = {};

            Object.keys(codes).forEach(function (currency) {

                const code = codes[currency].toLowerCase();

                const points = valid.filter(function (r) {
                    return r.eur[code];
                });

                result[currency] = {
                    dates: points.map(function (r) {
                        return r.date;
                    }),
                    values: points.map(function (r) {
                        return r.eur.bdt / r.eur[code];
                    })
                };
            });

            return result;
        });
    }

    // Chain: Frankfurter -> fawazahmed0 -> saved history
    function loadHistory(rates) {

        const requestId = ++historyRequestId;

        readHistoryCache()
            .then(function (cache) {

                const age = cache ? Date.now() - cache.timestamp : -1;

                if (cache && age >= 0 && age < HISTORY_CACHE_TTL) {
                    return cache.data;
                }

                return fetchHistory(rates)
                    .catch(function (error) {

                        console.error("Primary history failed:", error);

                        return fetchFallbackHistory(rates);
                    })
                    .then(function (seriesMap) {

                        saveHistoryCache(seriesMap);

                        return seriesMap;
                    })
                    .catch(function (error) {

                        console.error("History error:", error);

                        if (cache) {
                            return cache.data;
                        }

                        throw error;
                    });
            })
            .then(function (seriesMap) {

                if (requestId !== historyRequestId) {
                    return;
                }

                currentSeries = seriesMap;
                renderChart();
            })
            .catch(function (error) {

                console.error("History error:", error);

                if (requestId !== historyRequestId) {
                    return;
                }

                historyFailed = true;
                renderChart();
            });
    }

    function showChartMessage($chartBody, message) {

        $("<div>", {
            class: "px-2 py-3 text-center text-body-secondary",
            text: message
        }).appendTo($chartBody);
    }

    function renderChart() {

        const $chartBody = $("#chartBody");

        $("#chartTitle").text(selectedCurrency || "");
        $chartBody.empty();

        if (historyFailed) {
            showChartMessage($chartBody, "Unable to load rate history.");
            return;
        }

        if (!currentSeries) {
            showChartMessage($chartBody, "Loading history...");
            return;
        }

        const data = currentSeries[selectedCurrency];

        if (!data || data.values.length < 2) {
            showChartMessage($chartBody, "No history available for this currency.");
            return;
        }

        $("<div>", {class: "p-2"})
            .append(buildSparkline(data.values, 80))
            .appendTo($chartBody);

        $chartBody.append(buildSummary(data.values));
    }

    function buildStat(label, value, valueClass) {

        const $col = $("<div>", {class: "col text-nowrap"});

        $("<span>", {
            class: "text-body-secondary",
            text: label + " "
        }).appendTo($col);

        $("<span>", {
            class: "fw-semibold " + (valueClass || ""),
            text: value
        }).appendTo($col);

        return $col;
    }

    function buildSummary(values) {

        const min = Math.min.apply(null, values);
        const max = Math.max.apply(null, values);
        const first = values[0];
        const last = values[values.length - 1];
        const change = ((last - first) / first) * 100;

        const changeClass = change > 0 ? "text-success" : change < 0 ? "text-danger" : "text-body-secondary";
        const changeText = (change > 0 ? "+" : "") + change.toFixed(2) + "%";

        return $("<div>", {class: "row g-0 text-center border-top small px-2 py-1"})
            .append(buildStat("Low", min.toFixed(2)))
            .append(buildStat("High", max.toFixed(2)))
            .append(buildStat("Change", changeText, changeClass));
    }

    function buildSparkline(series, height) {

        const ns = CONFIG.svgUrl;
        const width = 100;
        const padding = 4;

        const min = Math.min.apply(null, series);
        const max = Math.max.apply(null, series);
        const range = max - min || 1;

        const points = series.map(function (value, i) {

            const x = (i / (series.length - 1)) * width;
            const y = height - padding - ((value - min) / range) * (height - padding * 2);

            return x.toFixed(2) + "," + y.toFixed(2);
        });

        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("class", "w-100 text-primary");
        svg.setAttribute("height", height);

        const line = document.createElementNS(ns, "polyline");
        line.setAttribute("points", points.join(" "));
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", "currentColor");
        line.setAttribute("stroke-width", "2");
        line.setAttribute("stroke-linejoin", "round");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("vector-effect", "non-scaling-stroke");

        svg.appendChild(line);

        return svg;
    }

    function showLoading() {

        $loading.removeClass("d-none");
        $errorContainer.addClass("d-none");
        $rateContainer.addClass("d-none");
        $refreshButton.prop("disabled", true);
    }

    function showError(message) {

        $loading.addClass("d-none");
        $rateContainer.addClass("d-none");
        $errorContainer.removeClass("d-none");
        $errorMessage.text(message);
        $refreshButton.prop("disabled", false);
    }

    function formatTime(date) {

        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }

})();
