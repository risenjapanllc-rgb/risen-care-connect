"use strict";

/**
 * Connector Payload Validator v0.1
 *
 * Validates untrusted input payload before entering the Server Trust Boundary.
 * This is a pure sync validator that constructs an allowlist-only output.
 *
 * Important:
 * - Client-supplied facilityId and residentId are explicitly rejected
 * - Credentials, tokens, passwords, secrets are never returned
 * - Unknown top-level fields are silently dropped
 * - Output follows strict allowlist structure only
 * - Input object is not mutated
 */
class ConnectorPayloadValidator {
    constructor() {
        this.allowedDocumentTypes = new Set([
            "support_record",
            "individual_support_plan",
            "assessment",
            "monitoring",
            "other"
        ]);

        this.allowedSourceTypes = new Set([
            "word",
            "excel"
        ]);

        this.maxIdentifierLength = 128;
        this.maxNameLength = 200;
        this.maxFileNameLength = 255;

        // ISO 8601 date validation regex
        // Accepts: YYYY-MM-DDTHH:mm:ss[.sss]Z or YYYY-MM-DDTHH:mm:ss[.sss]±HH:mm
        this.iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([Z]|[+-]\d{2}:\d{2})$/;
    }

    /**
     * Validate ISO 8601 datetime format strictly.
     * Accepts: YYYY-MM-DDTHH:mm:ss[.sss]Z or YYYY-MM-DDTHH:mm:ss[.sss]±HH:mm
     * @param {string} dateString
     * @returns {boolean}
     */
    isValidISO8601DateTime(dateString) {
        // Check format explicitly
        const match = this.iso8601Regex.exec(dateString);
        if (!match) {
            return false;
        }

        const year = Number(dateString.slice(0, 4));
        const month = Number(dateString.slice(5, 7));
        const day = Number(dateString.slice(8, 10));
        const hour = Number(dateString.slice(11, 13));
        const minute = Number(dateString.slice(14, 16));
        const second = Number(dateString.slice(17, 19));
        const timezone = match[2];

        if (hour > 23 || minute > 59 || second > 59) {
            return false;
        }

        if (timezone !== "Z") {
            const timezoneHour = Number(timezone.slice(1, 3));
            const timezoneMinute = Number(timezone.slice(4, 6));
            if (timezoneHour > 23 || timezoneMinute > 59) {
                return false;
            }
        }

        const calendarDate = new Date(Date.UTC(year, month - 1, day));
        if (
            calendarDate.getUTCFullYear() !== year ||
            calendarDate.getUTCMonth() !== month - 1 ||
            calendarDate.getUTCDate() !== day
        ) {
            return false;
        }

        // Verify it's a valid date that can be parsed
        const parsedDate = Date.parse(dateString);
        return !isNaN(parsedDate);
    }

    /**
     * Validate a payload and return allowlist-only result.
     *
     * @param {Object} payload - untrusted input payload
     * @returns {Object}
     *   valid: {
     *     status: "valid",
     *     validatedPayload: {
     *       sourceResident: { identifier, name? },
     *       source: { fileName, updatedAt },
     *       documentType,
     *       sourceType
     *     }
     *   }
     *   invalid: {
     *     status: "invalid",
     *     errorCode: "..."
     *   }
     */
    validate(payload) {
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            return {
                status: "invalid",
                errorCode: "payload_missing"
            };
        }

        // Extract sourceResident
        const sourceResident = payload.sourceResident;
        if (!sourceResident || typeof sourceResident !== "object" || Array.isArray(sourceResident)) {
            return {
                status: "invalid",
                errorCode: "source_resident_missing"
            };
        }

        // Validate identifier (required)
        const identifierObj = sourceResident.identifier;
        if (!identifierObj || typeof identifierObj !== "object") {
            return {
                status: "invalid",
                errorCode: "source_resident_identifier_invalid"
            };
        }

        const identifierValue = identifierObj.value;
        if (typeof identifierValue !== "string") {
            return {
                status: "invalid",
                errorCode: "source_resident_identifier_invalid"
            };
        }

        if (identifierValue === "" || identifierValue.trim() === "") {
            return {
                status: "invalid",
                errorCode: "source_resident_identifier_invalid"
            };
        }

        if (identifierValue.length > this.maxIdentifierLength) {
            return {
                status: "invalid",
                errorCode: "source_resident_identifier_invalid"
            };
        }

        // Validate name (optional)
        let validatedName = undefined;
        if (sourceResident.name !== undefined) {
            const nameObj = sourceResident.name;
            if (nameObj === null) {
                validatedName = undefined;
            } else if (typeof nameObj === "object" && nameObj !== null) {
                const nameValue = nameObj.value;
                if (nameValue === null || nameValue === undefined || nameValue === "") {
                    validatedName = undefined;
                } else if (typeof nameValue !== "string") {
                    return {
                        status: "invalid",
                        errorCode: "source_resident_name_invalid"
                    };
                } else if (nameValue.length > this.maxNameLength) {
                    return {
                        status: "invalid",
                        errorCode: "source_resident_name_invalid"
                    };
                } else {
                    validatedName = { value: nameValue };
                }
            } else {
                return {
                    status: "invalid",
                    errorCode: "source_resident_name_invalid"
                };
            }
        }

        // Extract source
        const source = payload.source;
        if (!source || typeof source !== "object" || Array.isArray(source)) {
            return {
                status: "invalid",
                errorCode: "source_missing"
            };
        }

        // Validate fileName (required)
        const fileName = source.fileName;
        if (typeof fileName !== "string") {
            return {
                status: "invalid",
                errorCode: "source_filename_invalid"
            };
        }

        if (fileName === "" || fileName.trim() === "") {
            return {
                status: "invalid",
                errorCode: "source_filename_invalid"
            };
        }

        if (fileName.length > this.maxFileNameLength) {
            return {
                status: "invalid",
                errorCode: "source_filename_invalid"
            };
        }

        // Reject path traversal and directory separators
        if (fileName.includes("/") || fileName.includes("\\")) {
            return {
                status: "invalid",
                errorCode: "source_filename_invalid"
            };
        }

        // Validate updatedAt (required)
        const updatedAt = source.updatedAt;
        if (typeof updatedAt !== "string") {
            return {
                status: "invalid",
                errorCode: "source_updated_at_invalid"
            };
        }

        // Validate strict ISO 8601 format
        if (!this.isValidISO8601DateTime(updatedAt)) {
            return {
                status: "invalid",
                errorCode: "source_updated_at_invalid"
            };
        }

        // Validate documentType (required)
        const documentType = payload.documentType;
        if (typeof documentType !== "string") {
            return {
                status: "invalid",
                errorCode: "document_type_invalid"
            };
        }

        if (!this.allowedDocumentTypes.has(documentType)) {
            return {
                status: "invalid",
                errorCode: "document_type_invalid"
            };
        }

        // Validate sourceType (required)
        const sourceType = payload.sourceType;
        if (typeof sourceType !== "string") {
            return {
                status: "invalid",
                errorCode: "source_type_invalid"
            };
        }

        if (!this.allowedSourceTypes.has(sourceType)) {
            return {
                status: "invalid",
                errorCode: "source_type_invalid"
            };
        }

        // Build allowlist-only validatedPayload
        const validatedPayload = {
            sourceResident: {
                identifier: { value: identifierValue }
            },
            source: {
                fileName: fileName,
                updatedAt: updatedAt
            },
            documentType: documentType,
            sourceType: sourceType
        };

        if (validatedName !== undefined) {
            validatedPayload.sourceResident.name = validatedName;
        }

        return {
            status: "valid",
            validatedPayload: validatedPayload
        };
    }
}

module.exports = ConnectorPayloadValidator;
