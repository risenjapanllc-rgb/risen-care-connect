"use strict";

/**
 * Application service for one complete Connector ingestion use case.
 *
 * This is the orchestration boundary between transport and the
 * Server Trust Boundary domain services.
 *
 * Untrusted transport input:
 *   connectorId
 *   credential
 *   payload
 *   semanticRecords
 *
 * Trusted processing context is produced only by
 * ConnectorIngestionService and is never accepted from the client.
 */
class ServerTrustBoundaryIngestionService {
    constructor({
        connectorIngestionService,
        semanticIngestionService
    } = {}) {
        if (
            !connectorIngestionService ||
            typeof connectorIngestionService
                .ingestForSemanticProcessing !== "function"
        ) {
            throw new Error(
                "ServerTrustBoundaryIngestionService requires connectorIngestionService.ingestForSemanticProcessing"
            );
        }

        if (
            !semanticIngestionService ||
            typeof semanticIngestionService.ingest !== "function"
        ) {
            throw new Error(
                "ServerTrustBoundaryIngestionService requires semanticIngestionService.ingest"
            );
        }

        this.connectorIngestionService =
            connectorIngestionService;

        this.semanticIngestionService =
            semanticIngestionService;
    }

    async ingest({
        connectorId,
        credential,
        payload,
        semanticRecords
    } = {}) {
        if (
            !Array.isArray(semanticRecords) ||
            semanticRecords.length !== 1
        ) {
            return {
                status: "invalid",
                errorCode:
                    "connector_payload_invalid"
            };
        }

        let connectorResult;

        try {
            connectorResult =
                await this.connectorIngestionService
                    .ingestForSemanticProcessing({
                        connectorId,
                        credential,
                        payload
                    });
        } catch (error) {
            return {
                status: "error",
                errorCode:
                    "connector_ingestion_exception"
            };
        }

        if (
            !connectorResult ||
            typeof connectorResult !== "object" ||
            Array.isArray(connectorResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_ingestion_invalid_result"
            };
        }

        if (connectorResult.status !== "ready") {
            return connectorResult;
        }

        const {
            verifiedContext,
            residentMatching
        } = connectorResult;

        if (
            !verifiedContext ||
            typeof verifiedContext !== "object" ||
            Array.isArray(verifiedContext) ||
            !residentMatching ||
            typeof residentMatching !== "object" ||
            Array.isArray(residentMatching)
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_ingestion_invalid_result"
            };
        }

        let semanticResult;

        try {
            semanticResult =
                await this.semanticIngestionService.ingest({
                    verifiedContext,
                    residentMatching,
                    semanticRecord:
                        semanticRecords[0]
                });
        } catch (error) {
            return {
                status: "error",
                errorCode:
                    "semantic_ingestion_exception"
            };
        }

        if (
            !semanticResult ||
            typeof semanticResult !== "object" ||
            Array.isArray(semanticResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "semantic_ingestion_invalid_result"
            };
        }

        if (
            ![
                "confirmed_candidate",
                "pending_review",
                "conflict"
            ].includes(semanticResult.status)
        ) {
            return {
                status: "error",
                errorCode:
                    "semantic_ingestion_rejected"
            };
        }

        return residentMatching;
    }
}

module.exports =
    ServerTrustBoundaryIngestionService;
