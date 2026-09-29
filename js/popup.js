(function () {

    "use strict";

    const HISTORY_DAYS = 7;
    const HIDDEN_CURRENCIES = ["LKR", "SEK"];

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

            const borderClass =
                index < rates.length - 1
                    ? ""
                    : "border-bottom-0";

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

    function fetchHistory(rates) {

        const codes = {};

        rates.forEach(function (rate) {

            const match = rate.currency.match(/\b[A-Z]{3}\b/);

            if (match) {
                codes[rate.currency] = match[0];
            }
        });

        const quotes = Array.from(new Set(["BDT"].concat(Object.keys(codes).map(function (key) {
            return codes[key];
        }))));

        const from = new Date();
        from.setDate(from.getDate() - 10);

        const url = "https://api.frankfurter.dev/v2/rates?from=" + dateKey(from) + "&quotes=" + quotes.join(",");

        return fetch(url)
            .then(function (response) {

                if (!response.ok) {
                    throw new Error("HTTP " + response.status);
                }

                return response.json();
            })
            .then(function (rows) {

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

    function loadHistory(rates) {

        const requestId = ++historyRequestId;

        fetchHistory(rates)
            .then(function (seriesMap) {

                if (requestId !== historyRequestId) {
                    return;
                }

                currentSeries = seriesMap;
                renderChart();
            })
            .catch(function () {

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

        const ns = "http://www.w3.org/2000/svg";
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
