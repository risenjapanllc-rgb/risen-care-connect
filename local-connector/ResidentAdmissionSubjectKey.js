"use strict";

const VALID_IDENTIFIER_TYPES =
    new Set(["name", "user_code"]);

function createResidentAdmissionSubjectKey({
    identifierType,
    identifierDigest
} = {}) {
    const normalizedType =
        typeof identifierType === "string"
            ? identifierType.trim()
            : "";

    const normalizedDigest =
        typeof identifierDigest === "string"
            ? identifierDigest.trim().toLowerCase()
            : "";

    if (
        !VALID_IDENTIFIER_TYPES.has(normalizedType) ||
        !/^[a-f0-9]{64}$/.test(normalizedDigest)
    ) {
        const error =
            new TypeError(
                "resident admission subject identity is invalid"
            );
        error.code =
            "resident_admission_subject_identity_invalid";
        throw error;
    }

    return `resident:${normalizedType}:${normalizedDigest}`;
}

module.exports = {
    createResidentAdmissionSubjectKey
};
