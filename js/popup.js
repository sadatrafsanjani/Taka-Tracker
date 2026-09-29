(function () {

    "use strict";

    const $loading = $("#loading");
    const $errorContainer = $("#errorContainer");
    const $errorMessage = $("#errorMessage");
    const $rateContainer = $("#rateContainer");
    const $rateBody = $("#rateBody");
    const $updatedAt = $("#updatedAt");
    const $refreshButton = $("#refreshButton");
    const $retryButton = $("#retryButton");

    $(document).ready(function () {

        loadRates();

        $refreshButton.on("click", function () {
            loadRates(true);
        });

        $retryButton.on("click", function () {
            loadRates(true);
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

    function renderRates(rates) {

        $rateBody.empty();

        $.each(rates, function (index, rate) {

            const borderClass =
                index < rates.length - 1
                    ? ""
                    : "border-bottom-0";

            const $row = $("<tr>", {
                class: "text-center"
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
