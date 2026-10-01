import { MESSAGES } from "./messages.js";

function formatMessage(code, params) {

    const template = MESSAGES[code] || MESSAGES.unknown;
    const values = params || {};

    return template.replace(/\{(\w+)\}/g, function (match, key) {
        return key in values ? String(values[key]) : match;
    });
}

export class RatesError extends Error {

    constructor(code, options) {

        const settings = options || {};

        super(formatMessage(code, settings.params), {cause: settings.cause});

        this.name = "RatesError";
        this.code = code;
    }
}
