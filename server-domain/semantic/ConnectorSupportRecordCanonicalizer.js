"use strict";

const crypto = require("crypto");

const CANONICALIZATION_VERSION =
    "risen-semantic-canonicalization-2";

const FIELD_KEYS = [
    "record_date",
    "record_content",
    "staff_name",
    "record_category",
    "created_at"
];

class ConnectorSupportRecordCanonicalizer {
    process(fields) {
        this.assertPlainObject(fields, "fields");
        this.assertExactKeys(
            fields,
            FIELD_KEYS,
            "fields"
        );

        const normalizedFields = {};

        for (const key of FIELD_KEYS) {
            const value = fields[key];

            if (
                value !== null &&
                typeof value !== "string"
            ) {
                throw new TypeError(
                    `${key} must be a string or null`
                );
            }

            normalizedFields[key] =
                value === null
                    ? null
                    : value.trim();
        }

        if (!normalizedFields.record_date) {
            throw new TypeError(
                "record_date must not be blank"
            );
        }

        if (!normalizedFields.record_content) {
            throw new TypeError(
                "record_content must not be blank"
            );
        }

        const semanticContent = {
            semanticType: "support_record",
            fields: normalizedFields,
            customFields: {}
        };

        const canonicalString =
            JSON.stringify(semanticContent);

        const contentHash =
            crypto
                .createHash("sha256")
                .update(
                    canonicalString,
                    "utf8"
                )
                .digest("hex");

        return {
            semanticContent,
            canonicalString,
            contentHash,
            canonicalizationVersion:
                CANONICALIZATION_VERSION
        };
    }

    assertPlainObject(value, name) {
        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            throw new TypeError(
                `${name} must be a plain object`
            );
        }

        const prototype =
            Object.getPrototypeOf(value);

        if (
            prototype !== Object.prototype &&
            prototype !== null
        ) {
            throw new TypeError(
                `${name} must be a plain object`
            );
        }
    }

    assertExactKeys(object, allowedKeys, name) {
        const keys = Object.keys(object);

        if (
            keys.length !== allowedKeys.length ||
            keys.some(
                key => !allowedKeys.includes(key)
            )
        ) {
            throw new TypeError(
                `${name} has unsupported fields`
            );
        }
    }
}

module.exports =
    ConnectorSupportRecordCanonicalizer;
