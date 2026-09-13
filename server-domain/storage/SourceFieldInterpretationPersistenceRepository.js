"use strict";

class SourceFieldInterpretationPersistenceRepository {
    async confirm(input = {}) {
        const requiredStrings = [
            "verifiedFacilityId",
            "verifiedConnectorId",
            "sourceDocumentKey",
            "sourceFieldKey",
            "interpretationStatus",
            "mappingStatus"
        ];

        for (const fieldName of requiredStrings) {
            if (
                typeof input[fieldName] !== "string" ||
                input[fieldName].trim() === ""
            ) {
                return {
                    status: "invalid"
                };
            }
        }

        if (
            ![
                "confirmed",
                "deferred",
                "excluded"
            ].includes(input.interpretationStatus)
        ) {
            return {
                status: "invalid"
            };
        }

        if (
            ![
                "unmapped",
                "mapped",
                "no_standard_match"
            ].includes(input.mappingStatus)
        ) {
            return {
                status: "invalid"
            };
        }

        if (
            input.confirmedMeaning !== null &&
            input.confirmedMeaning !== undefined &&
            typeof input.confirmedMeaning !== "string"
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SourceFieldInterpretationPersistenceRepository.confirm must be implemented"
        );
    }
}

module.exports =
    SourceFieldInterpretationPersistenceRepository;
