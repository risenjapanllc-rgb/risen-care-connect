"use strict";

const WRITABLE_USER_FIELDS = Object.freeze([
    "name",
    "birth_date",
    "gender",
    "user_code"
]);

function normalizeValue(value) {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    return normalized || null;
}

function normalizeBirthDate(value) {
    const normalized = normalizeValue(value);

    if (
        normalized === null ||
        !/^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ) {
        return null;
    }

    const [year, month, day] =
        normalized.split("-").map(Number);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return normalized;
}

class ResidentProfileProjection {
    project({
        semanticContent,
        currentResident = {}
    } = {}) {
        const content =
            semanticContent &&
            typeof semanticContent === "object" &&
            !Array.isArray(semanticContent)
                ? semanticContent
                : {};

        const current =
            currentResident &&
            typeof currentResident === "object" &&
            !Array.isArray(currentResident)
                ? currentResident
                : {};

        const fill = {};
        const unchanged = {};
        const conflicts = {};

        for (const field of WRITABLE_USER_FIELDS) {
            const semanticKey = `user.${field}`;
            const incoming =
                field === "birth_date"
                    ? normalizeBirthDate(content[semanticKey])
                    : normalizeValue(content[semanticKey]);

            if (incoming === null) {
                continue;
            }

            const existing = normalizeValue(current[field]);

            if (existing === null) {
                fill[field] = incoming;
                continue;
            }

            if (existing === incoming) {
                unchanged[field] = incoming;
                continue;
            }

            conflicts[field] = {
                existing,
                incoming
            };
        }

        return {
            fill,
            unchanged,
            conflicts
        };
    }
}

module.exports = {
    ResidentProfileProjection,
    WRITABLE_USER_FIELDS
};
