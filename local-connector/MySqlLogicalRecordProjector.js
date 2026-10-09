"use strict";

const {
    createHash
} = require("node:crypto");

class MySqlLogicalRecordProjector {
    project({
        sourceId,
        identityField,
        rows,
        revision,
        observedAt
    } = {}) {
        this.assertNonEmptyString(
            sourceId,
            "sourceId"
        );

        this.assertNonEmptyString(
            identityField,
            "identityField"
        );

        this.assertNonEmptyString(
            revision,
            "revision"
        );

        if (!Array.isArray(rows)) {
            throw new TypeError(
                "rows must be an array"
            );
        }

        if (rows.length === 0) {
            return [];
        }

        const seen =
            new Set();

        return rows.map(
            (row, index) => {
                if (
                    !row ||
                    typeof row !== "object" ||
                    Array.isArray(row)
                ) {
                    throw new Error(
                        "MySQL row is invalid"
                    );
                }

                if (
                    !Object.prototype
                        .hasOwnProperty.call(
                            row,
                            identityField
                        )
                ) {
                    throw new Error(
                        "MySQL identity field is missing"
                    );
                }

                const identityValue =
                    row[identityField] ===
                        null ||
                    row[identityField] ===
                        undefined
                        ? ""
                        : String(
                            row[
                                identityField
                            ]
                        ).trim();

                if (!identityValue) {
                    throw new Error(
                        "MySQL identity value is blank"
                    );
                }

                if (
                    seen.has(
                        identityValue
                    )
                ) {
                    throw new Error(
                        "MySQL identity value is duplicated"
                    );
                }

                seen.add(
                    identityValue
                );

                return {
                    sourceRecordKey:
                        this.buildRecordKey({
                            sourceId,
                            identityField,
                            identityValue
                        }),
                    sourceIdentity: {
                        field:
                            identityField,
                        value:
                            identityValue
                    },
                    rowIndex:
                        index,
                    fields:
                        this.normalizeRow(
                            row
                        ),
                    provenance: {
                        sourceType:
                            "mysql",
                        sourceId,
                        revision,
                        observedAt:
                            typeof observedAt ===
                                "string"
                                ? observedAt
                                : null
                    }
                };
            }
        );
    }

    buildRecordKey({
        sourceId,
        identityField,
        identityValue
    }) {
        return createHash(
            "sha256"
        )
            .update(
                [
                    "mysql",
                    sourceId,
                    identityField,
                    identityValue
                ].join("\u0000"),
                "utf8"
            )
            .digest(
                "hex"
            );
    }

    normalizeRow(row) {
        return Object.fromEntries(
            Object.entries(row)
                .map(
                    ([key, value]) => [
                        String(key),
                        this.normalizeValue(
                            value
                        )
                    ]
                )
        );
    }

    normalizeValue(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (Buffer.isBuffer(value)) {
            return value.toString(
                "base64"
            );
        }

        if (
            typeof value ===
                "bigint"
        ) {
            return value.toString();
        }

        if (
            typeof value ===
                "string" ||
            typeof value ===
                "number" ||
            typeof value ===
                "boolean"
        ) {
            return value;
        }

        return String(value);
    }

    assertNonEmptyString(
        value,
        name
    ) {
        if (
            typeof value !== "string" ||
            value.trim() === ""
        ) {
            throw new TypeError(
                `${name} is required`
            );
        }
    }
}

module.exports =
    MySqlLogicalRecordProjector;
