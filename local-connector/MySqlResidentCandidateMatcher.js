"use strict";

class MySqlResidentCandidateMatcher {
    constructor({
        residentCandidateClient
    } = {}) {
        if (
            !residentCandidateClient ||
            typeof residentCandidateClient
                .findCandidates !== "function"
        ) {
            throw new TypeError(
                "MySqlResidentCandidateMatcher requires residentCandidateClient"
            );
        }

        this.residentCandidateClient =
            residentCandidateClient;
    }

    async matchRecords({
        records,
        residentCodeField,
        residentNameField
    } = {}) {
        if (!Array.isArray(records)) {
            throw new TypeError(
                "records must be an array"
            );
        }

        this.assertFieldName(
            residentCodeField,
            "residentCodeField"
        );

        this.assertFieldName(
            residentNameField,
            "residentNameField"
        );

        const results = [];

        for (const record of records) {
            results.push(
                await this.matchRecord({
                    record,
                    residentCodeField,
                    residentNameField
                })
            );
        }

        return results;
    }

    async matchRecord({
        record,
        residentCodeField,
        residentNameField
    }) {
        if (
            !record ||
            typeof record !== "object" ||
            Array.isArray(record) ||
            !record.fields ||
            typeof record.fields !== "object"
        ) {
            throw new TypeError(
                "MySQL logical record is invalid"
            );
        }

        const userCode =
            this.readRequiredValue(
                record.fields,
                residentCodeField,
                "resident code"
            );

        const sourceName =
            this.readRequiredValue(
                record.fields,
                residentNameField,
                "resident name"
            );

        const candidates =
            await this.residentCandidateClient
                .findCandidates({
                    userCode
                });

        if (!Array.isArray(candidates)) {
            throw new Error(
                "Resident candidate response is invalid"
            );
        }

        if (candidates.length === 0) {
            return {
                sourceRecordKey:
                    record.sourceRecordKey,
                userCode,
                sourceName,
                status:
                    "not_found",
                residentId:
                    null,
                candidates: []
            };
        }

        if (candidates.length > 1) {
            return {
                sourceRecordKey:
                    record.sourceRecordKey,
                userCode,
                sourceName,
                status:
                    "ambiguous",
                residentId:
                    null,
                candidates:
                    this.projectCandidates(
                        candidates
                    )
            };
        }

        const candidate =
            candidates[0];

        const residentId =
            this.readResidentId(
                candidate
            );

        const candidateName =
            this.readOptionalName(
                candidate
            );

        if (!residentId) {
            return {
                sourceRecordKey:
                    record.sourceRecordKey,
                userCode,
                sourceName,
                status:
                    "invalid_candidate",
                residentId:
                    null,
                candidates:
                    this.projectCandidates(
                        candidates
                    )
            };
        }

        if (
            candidateName &&
            this.normalizeName(
                candidateName
            ) !==
            this.normalizeName(
                sourceName
            )
        ) {
            return {
                sourceRecordKey:
                    record.sourceRecordKey,
                userCode,
                sourceName,
                status:
                    "name_conflict",
                residentId:
                    null,
                candidates:
                    this.projectCandidates(
                        candidates
                    )
            };
        }

        return {
            sourceRecordKey:
                record.sourceRecordKey,
            userCode,
            sourceName,
            status:
                "matched",
            residentId,
            candidates:
                this.projectCandidates(
                    candidates
                )
        };
    }

    projectCandidates(
        candidates
    ) {
        return candidates.map(
            candidate => ({
                residentId:
                    this.readResidentId(
                        candidate
                    ),
                name:
                    this.readOptionalName(
                        candidate
                    ),
                userCode:
                    this.readOptionalUserCode(
                        candidate
                    )
            })
        );
    }

    readResidentId(
        candidate
    ) {
        if (
            !candidate ||
            typeof candidate !== "object"
        ) {
            return null;
        }

        const value =
            candidate.id ??
            candidate.residentId;

        return typeof value === "string" &&
            value.trim()
            ? value.trim()
            : null;
    }

    readOptionalName(
        candidate
    ) {
        const value =
            candidate &&
            typeof candidate === "object"
                ? candidate.name
                : null;

        return typeof value === "string" &&
            value.trim()
            ? value.trim()
            : null;
    }

    readOptionalUserCode(
        candidate
    ) {
        if (
            !candidate ||
            typeof candidate !== "object"
        ) {
            return null;
        }

        const value =
            candidate.userCode ??
            candidate.user_code;

        return typeof value === "string" &&
            value.trim()
            ? value.trim()
            : null;
    }

    readRequiredValue(
        fields,
        fieldName,
        label
    ) {
        if (
            !Object.prototype
                .hasOwnProperty.call(
                    fields,
                    fieldName
                )
        ) {
            throw new Error(
                `MySQL ${label} field is missing`
            );
        }

        const raw =
            fields[fieldName];

        const value =
            raw === null ||
            raw === undefined
                ? ""
                : String(raw).trim();

        if (!value) {
            throw new Error(
                `MySQL ${label} is blank`
            );
        }

        return value;
    }

    normalizeName(
        value
    ) {
        return String(
            value || ""
        )
            .normalize("NFKC")
            .replace(
                /[\s\u3000]+/g,
                ""
            )
            .trim();
    }

    assertFieldName(
        value,
        name
    ) {
        if (
            typeof value !== "string" ||
            !value.trim()
        ) {
            throw new TypeError(
                `${name} is required`
            );
        }
    }
}

module.exports =
    MySqlResidentCandidateMatcher;
