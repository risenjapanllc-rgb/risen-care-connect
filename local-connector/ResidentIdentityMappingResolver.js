"use strict";

function resolveResidentIdentityMapping(mappings) {
    if (!Array.isArray(mappings)) {
        const error =
            new TypeError(
                "mappings must be an array"
            );
        error.code =
            "resident_identifier_mapping_unavailable";
        throw error;
    }

    const findMappings =
        standardFieldName =>
            mappings.filter(
                mapping =>
                    mapping &&
                    mapping.standardEntityName ===
                        "user" &&
                    mapping.standardFieldName ===
                        standardFieldName &&
                    typeof mapping.sourceFieldKey ===
                        "string" &&
                    mapping.sourceFieldKey.trim() !==
                        ""
            );

    const userCodeMappings =
        findMappings("user_code");

    const nameMappings =
        findMappings("name");

    if (userCodeMappings.length === 1) {
        return {
            identifierType:
                "user_code",
            candidateIdentifierType:
                "userCode",
            sourceFieldKey:
                userCodeMappings[0]
                    .sourceFieldKey.trim()
        };
    }

    if (
        userCodeMappings.length === 0 &&
        nameMappings.length === 1
    ) {
        return {
            identifierType:
                "name",
            candidateIdentifierType:
                "name",
            sourceFieldKey:
                nameMappings[0]
                    .sourceFieldKey.trim()
        };
    }

    const error =
        new Error(
            "Resident identifier mapping is unavailable"
        );
    error.code =
        "resident_identifier_mapping_unavailable";
    throw error;
}

module.exports = {
    resolveResidentIdentityMapping
};
