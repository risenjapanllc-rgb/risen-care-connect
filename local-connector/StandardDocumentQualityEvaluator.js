"use strict";

class StandardDocumentQualityEvaluator {
    evaluate({
        standardDocument,
        validation
    } = {}) {
        const signals = [];

        if (
            validation &&
            validation.valid === true
        ) {
            signals.push(
                "structure_valid"
            );
        }

        const confidence =
            standardDocument &&
            typeof standardDocument
                .documentTypeConfidence ===
                "string"
                ? standardDocument
                    .documentTypeConfidence
                : "low";

        signals.push(
            `document_type_confidence:${confidence}`
        );

        return {
            acceptable:
                Boolean(
                    validation &&
                    validation.valid === true
                ),
            signals
        };
    }
}

module.exports =
    StandardDocumentQualityEvaluator;
