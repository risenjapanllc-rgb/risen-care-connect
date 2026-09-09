"use strict";

/**
 * Builds the minimum business payload accepted by
 * the Server Trust Boundary.
 *
 * Client-side facility/resident identities, credentials,
 * tokens, raw document content, and unknown fields are
 * intentionally excluded.
 */
class ConnectorIngestionPayloadBuilder {
    build(standardDocument = {}) {
        if (
            !standardDocument ||
            typeof standardDocument !== "object" ||
            Array.isArray(standardDocument)
        ) {
            return null;
        }

        const identifier =
            standardDocument.extracted
                ?.sourceResidentIdentifier
                ?.value;

        if (
            typeof identifier !== "string" ||
            !identifier.trim()
        ) {
            return null;
        }

        const payload = {
            sourceResident: {
                identifier: {
                    value: identifier
                }
            },
            source: {
                fileName:
                    standardDocument.source
                        ?.fileName,
                updatedAt:
                    standardDocument.source
                        ?.updatedAt
            },
            documentType:
                standardDocument.documentType,
            sourceType:
                standardDocument.sourceType
        };

        const residentName =
            standardDocument.extracted
                ?.sourceResidentName
                ?.value;

        if (
            typeof residentName === "string" &&
            residentName.trim()
        ) {
            payload.sourceResident.name = {
                value: residentName
            };
        }

        return payload;
    }
}

module.exports =
    ConnectorIngestionPayloadBuilder;
