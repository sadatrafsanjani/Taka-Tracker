(function () {

    "use strict";

    const HISTORY_DAYS = 7;

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

    function formatDay(key) {

        const parts = key.split("-");

        return new Date(+parts[0], +parts[1] - 1, +parts[2]).toLocaleDateString([], {
            day: "numeric",
            month: "short"
        });
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

        const values = data.values;
        const lastIndex = values.length - 1;

        const $readout = $("<div>", {
            class: "d-flex justify-content-between align-items-baseline px-2 pt-2"
        });
        const $value = $("<span>", {class: "fw-bold fs-6"}).appendTo($readout);
        const $date = $("<span>", {class: "text-body-secondary"}).appendTo($readout);

        function showPoint(index) {

            const i = index === null ? lastIndex : index;

            $value.text(values[i].toFixed(2) + " BDT");
            $date.text(formatDay(data.dates[i]) + (index === null ? " (latest)" : ""));
        }

        showPoint(null);

        const measured = Math.floor($chartBody.width()) - 16;
        const width = measured > 200 ? measured : 340;

        const svg = buildChart(data, width, 130, showPoint);

        $chartBody.append($readout);
        $("<div>", {class: "px-2 pb-2"}).append(svg).appendTo($chartBody);
        $chartBody.append(buildSummary(values));
    }

    function buildStat(label, value, valueClass) {

        const $col = $("<div>", {class: "col px-2 py-1"});

        $("<div>", {
            class: "small text-body-secondary",
            text: label
        }).appendTo($col);

        $("<div>", {
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

        return $("<div>", {class: "row g-0 text-center border-top"})
            .append(buildStat("Low", min.toFixed(2)))
            .append(buildStat("High", max.toFixed(2)))
            .append(buildStat("Change", changeText, changeClass));
    }

    function svgEl(name, attrs) {

        const el = document.createElementNS("http://www.w3.org/2000/svg", name);

        Object.keys(attrs || {}).forEach(function (key) {
            el.setAttribute(key, attrs[key]);
        });

        return el;
    }

    function buildChart(data, width, height, onHover) {

        const values = data.values;
        const n = values.length;

        const margin = {top: 10, right: 18, bottom: 22, left: 46};
        const plotW = width - margin.left - margin.right;
        const plotH = height - margin.top - margin.bottom;
        const baseY = margin.top + plotH;

        const min = Math.min.apply(null, values);
        const max = Math.max.apply(null, values);
        const padding = (max - min) * 0.15 || max * 0.002 || 1;
        const lo = min - padding;
        const hi = max + padding;

        function x(i) {
            return margin.left + (i / (n - 1)) * plotW;
        }

        function y(value) {
            return margin.top + ((hi - value) / (hi - lo)) * plotH;
        }

        const svg = svgEl("svg", {
            width: width,
            height: height,
            viewBox: "0 0 " + width + " " + height,
            class: "d-block text-primary"
        });

        // Horizontal grid + y-axis labels
        const ticks = 4;

        for (let t = 0; t < ticks; t++) {

            const value = hi - (t * (hi - lo)) / (ticks - 1);
            const gy = y(value);

            svg.appendChild(svgEl("line", {
                x1: margin.left,
                y1: gy.toFixed(2),
                x2: width - margin.right,
                y2: gy.toFixed(2),
                stroke: "currentColor",
                "stroke-width": 1,
                "stroke-dasharray": "3 3",
                class: "text-body-tertiary"
            }));

            const label = svgEl("text", {
                x: margin.left - 6,
                y: (gy + 3).toFixed(2),
                "text-anchor": "end",
                "font-size": 10,
                fill: "currentColor",
                class: "text-body-secondary"
            });
            label.textContent = value.toFixed(2);
            svg.appendChild(label);
        }

        // Baseline
        svg.appendChild(svgEl("line", {
            x1: margin.left,
            y1: baseY,
            x2: width - margin.right,
            y2: baseY,
            stroke: "currentColor",
            "stroke-width": 1,
            class: "text-body-tertiary"
        }));

        // X-axis date labels
        data.dates.forEach(function (date, i) {

            const label = svgEl("text", {
                x: x(i).toFixed(2),
                y: height - 6,
                "text-anchor": "middle",
                "font-size": 10,
                fill: "currentColor",
                class: "text-body-secondary"
            });
            label.textContent = formatDay(date);
            svg.appendChild(label);
        });

        // Area fill
        const linePoints = values.map(function (value, i) {
            return x(i).toFixed(2) + "," + y(value).toFixed(2);
        });

        svg.appendChild(svgEl("polygon", {
            points: linePoints.join(" ") + " " + x(n - 1).toFixed(2) + "," + baseY + " " + x(0).toFixed(2) + "," + baseY,
            fill: "currentColor",
            "fill-opacity": 0.1
        }));

        // Line
        svg.appendChild(svgEl("polyline", {
            points: linePoints.join(" "),
            fill: "none",
            stroke: "currentColor",
            "stroke-width": 2,
            "stroke-linejoin": "round",
            "stroke-linecap": "round"
        }));

        // Data point markers
        values.forEach(function (value, i) {

            const isLast = i === n - 1;

            svg.appendChild(svgEl("circle", {
                cx: x(i).toFixed(2),
                cy: y(value).toFixed(2),
                r: isLast ? 3.5 : 2.5,
                fill: isLast ? "currentColor" : "#ffffff",
                stroke: "currentColor",
                "stroke-width": 1.5
            }));
        });

        // Hover guide + active marker
        const guide = svgEl("line", {
            x1: 0,
            y1: margin.top,
            x2: 0,
            y2: baseY,
            stroke: "currentColor",
            "stroke-width": 1,
            class: "text-body-secondary"
        });
        guide.style.display = "none";
        svg.appendChild(guide);

        const active = svgEl("circle", {
            cx: 0,
            cy: 0,
            r: 4.5,
            fill: "currentColor",
            stroke: "#ffffff",
            "stroke-width": 2
        });
        active.style.display = "none";
        svg.appendChild(active);

        // Hover capture area
        const overlay = svgEl("rect", {
            x: margin.left - 8,
            y: margin.top,
            width: plotW + 16,
            height: plotH,
            fill: "transparent"
        });
        overlay.style.cursor = "crosshair";
        svg.appendChild(overlay);

        overlay.addEventListener("mousemove", function (event) {

            const rect = svg.getBoundingClientRect();
            const scale = width / rect.width;
            const mouseX = (event.clientX - rect.left) * scale;

            let index = Math.round(((mouseX - margin.left) / plotW) * (n - 1));
            index = Math.max(0, Math.min(n - 1, index));

            const px = x(index).toFixed(2);

            guide.setAttribute("x1", px);
            guide.setAttribute("x2", px);
            active.setAttribute("cx", px);
            active.setAttribute("cy", y(values[index]).toFixed(2));

            guide.style.display = "";
            active.style.display = "";

            onHover(index);
        });

        overlay.addEventListener("mouseleave", function () {

            guide.style.display = "none";
            active.style.display = "none";

            onHover(null);
        });

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
