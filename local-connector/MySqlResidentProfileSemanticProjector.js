"use strict";

const {
    createHash
} = require("node:crypto");

const SEMANTIC_TYPE =
    "resident_profile";

const LOGICAL_SLOT =
    "primary";

const CANONICALIZATION_VERSION =
    "risen-resident-profile-canonicalization-1";

class MySqlResidentProfileSemanticProjector {
    project({
        record,
        residentId,
        sourceRevision,
        birthDateField = "birth_date"
    } = {}) {
        if (
            !record ||
            typeof record !== "object" ||
            Array.isArray(record) ||
            typeof record.sourceRecordKey !== "string" ||
            !/^[0-9a-f]{64}$/.test(
                record.sourceRecordKey
            ) ||
            !record.fields ||
            typeof record.fields !== "object" ||
            Array.isArray(record.fields) ||
            typeof residentId !== "string" ||
            !residentId.trim() ||
            typeof sourceRevision !== "string" ||
            !/^[0-9a-f]{64}$/.test(
                sourceRevision
            ) ||
            typeof birthDateField !== "string" ||
            !birthDateField.trim()
        ) {
            throw new TypeError(
                "valid resident profile semantic projection input is required"
            );
        }

        const rawBirthDate =
            record.fields[
                birthDateField.trim()
            ];

        if (
            typeof rawBirthDate !== "string" ||
            !this.isValidIsoDate(
                rawBirthDate
            )
        ) {
            const error =
                new Error(
                    "MySQL birth date is unavailable or invalid"
                );

            error.code =
                "mysql_resident_profile_birth_date_invalid";

            throw error;
        }

        const birthDate =
            rawBirthDate;

        const semanticContent = {
            "user.birth_date":
                birthDate
        };

        /*
         * Canonicalization version 1 owns exactly one field.
         * The property is written explicitly rather than relying
         * on arbitrary source-column order.
         */
        const canonical = {
            "user.birth_date":
                semanticContent[
                    "user.birth_date"
                ]
        };

        const contentHash =
            createHash("sha256")
                .update(
                    JSON.stringify(
                        canonical
                    ),
                    "utf8"
                )
                .digest("hex");

        return {
            sourceRecordKey:
                record.sourceRecordKey,
            residentId:
                residentId.trim(),
            semanticType:
                SEMANTIC_TYPE,
            logicalSlot:
                LOGICAL_SLOT,
            sourceRevision,
            semanticContent,
            contentHash,
            canonicalizationVersion:
                CANONICALIZATION_VERSION
        };
    }

    isValidIsoDate(value) {
        if (
            typeof value !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(
                value
            )
        ) {
            return false;
        }

        const [
            year,
            month,
            day
        ] = value
            .split("-")
            .map(Number);

        const date =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day
                )
            );

        return (
            date.getUTCFullYear() ===
                year &&
            date.getUTCMonth() ===
                month - 1 &&
            date.getUTCDate() ===
                day
        );
    }
}

module.exports =
    MySqlResidentProfileSemanticProjector;
