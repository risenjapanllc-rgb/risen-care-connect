"use strict";

const {
    createHash
} = require("node:crypto");

class MySqlSourceAdapter {
    constructor({
        sourceId,
        query,
        queryParams = [],
        connectionFactory,
        clock = () => new Date()
    } = {}) {
        this.assertNonEmptyString(
            sourceId,
            "sourceId"
        );
        this.assertNonEmptyString(
            query,
            "query"
        );

        if (!Array.isArray(queryParams)) {
            throw new TypeError(
                "queryParams must be an array"
            );
        }

        if (
            typeof connectionFactory !==
            "function"
        ) {
            throw new TypeError(
                "connectionFactory is required"
            );
        }

        if (typeof clock !== "function") {
            throw new TypeError(
                "clock is required"
            );
        }

        this.sourceId =
            sourceId.trim();
        this.query =
            query;
        this.queryParams =
            [...queryParams];
        this.connectionFactory =
            connectionFactory;
        this.clock =
            clock;

        this.lastObservation =
            null;
    }

    async observe(sourceReference) {
        this.assertSourceReference(
            sourceReference
        );

        const acquisition =
            await this.executeQuery();

        const revision =
            this.buildRevision(
                acquisition.rows
            );

        const observedAt =
            this.clock()
                .toISOString();

        this.lastObservation = {
            sourceReference,
            acquisition,
            revision,
            observedAt
        };

        return {
            sourceDocumentKey:
                `mysql:${this.sourceId}`,
            sourceReference,
            revision,
            observedAt
        };
    }

    async acquireRaw(sourceReference) {
        this.assertSourceReference(
            sourceReference
        );

        let observation =
            this.lastObservation;

        if (
            !observation ||
            observation.sourceReference !==
                sourceReference
        ) {
            await this.observe(
                sourceReference
            );

            observation =
                this.lastObservation;
        }

        this.lastObservation =
            null;

        const {
            acquisition,
            observedAt
        } = observation;

        return {
            sourceType: "mysql",
            source: {
                fileName:
                    `${this.sourceId}.mysql`,
                updatedAt:
                    observedAt
            },
            document:
                this.toTabularDocument(
                    acquisition
                )
        };
    }

    async executeQuery() {
        const connection =
            await this.connectionFactory();

        if (
            !connection ||
            typeof connection.execute !==
                "function"
        ) {
            throw new Error(
                "MySQL connection unavailable"
            );
        }

        try {
            const result =
                await connection.execute(
                    this.query,
                    [...this.queryParams]
                );

            if (
                !Array.isArray(result) ||
                !Array.isArray(result[0])
            ) {
                throw new Error(
                    "MySQL query result unavailable"
                );
            }

            const rows =
                result[0];

            const fields =
                Array.isArray(result[1])
                    ? result[1]
                    : [];

            return {
                rows,
                fields
            };
        } finally {
            if (
                typeof connection.end ===
                "function"
            ) {
                await connection.end();
            }
        }
    }

    toTabularDocument({
        rows,
        fields
    }) {
        const headers =
            this.resolveHeaders({
                rows,
                fields
            });

        const bodyRows =
            rows.map(row =>
                headers.map(
                    header =>
                        this.normalizeCell(
                            row[header]
                        )
                )
            );

        return {
            sheetNames: [
                this.sourceId
            ],
            sheets: [
                {
                    sheetName:
                        this.sourceId,
                    rows: [
                        headers,
                        ...bodyRows
                    ]
                }
            ]
        };
    }

    resolveHeaders({
        rows,
        fields
    }) {
        if (
            fields.length > 0 &&
            fields.every(
                field =>
                    field &&
                    typeof field.name ===
                        "string" &&
                    field.name !== ""
            )
        ) {
            return fields.map(
                field =>
                    field.name
            );
        }

        const firstRow =
            rows[0];

        if (
            firstRow &&
            typeof firstRow === "object" &&
            !Array.isArray(firstRow)
        ) {
            return Object.keys(
                firstRow
            );
        }

        return [];
    }

    normalizeCell(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (
            Buffer.isBuffer(value)
        ) {
            return value.toString(
                "utf8"
            );
        }

        if (
            typeof value === "object"
        ) {
            return JSON.stringify(
                value
            );
        }

        return String(value);
    }

    buildRevision(rows) {
        const canonical =
            JSON.stringify(
                rows,
                (_, value) => {
                    if (
                        value instanceof Date
                    ) {
                        return value.toISOString();
                    }

                    if (
                        Buffer.isBuffer(value)
                    ) {
                        return value.toString(
                            "base64"
                        );
                    }

                    return value;
                }
            );

        return createHash(
            "sha256"
        )
            .update(
                canonical,
                "utf8"
            )
            .digest(
                "hex"
            );
    }

    assertSourceReference(
        sourceReference
    ) {
        this.assertNonEmptyString(
            sourceReference,
            "sourceReference"
        );

        if (
            sourceReference !==
            this.sourceId
        ) {
            throw new Error(
                "unknown MySQL source"
            );
        }
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
    MySqlSourceAdapter;
