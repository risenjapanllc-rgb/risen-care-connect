"use strict";

const SourceRecordIdentityCandidateResolver =
    require("./SourceRecordIdentityCandidateResolver");

class SourceRecordIdentityCandidateService {
    constructor({
        localConnectorService,
        resolver = new SourceRecordIdentityCandidateResolver()
    } = {}) {
        if (
            !localConnectorService ||
            typeof localConnectorService.resolveSourceSnapshot !== "function"
        ) {
            throw new Error(
                "SourceRecordIdentityCandidateService requires localConnectorService"
            );
        }

        if (!resolver || typeof resolver.resolve !== "function") {
            throw new Error(
                "SourceRecordIdentityCandidateService requires resolver"
            );
        }

        this.localConnectorService = localConnectorService;
        this.resolver = resolver;
    }

    async findCandidates({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const snapshot =
            await this.localConnectorService.resolveSourceSnapshot({
                sourceDocumentKey,
                sourceUpdatedAt,
                sourceSize
            });

        const fieldDefinitions =
            snapshot.analysis?.extracted?.fieldDefinitions;
        const sourceEntities =
            snapshot.analysis?.extracted?.sourceEntities;

        if (
            !Array.isArray(fieldDefinitions) ||
            !Array.isArray(sourceEntities)
        ) {
            return {
                status: "insufficient_source",
                candidates: []
            };
        }

        return this.resolver.resolve({
            fieldDefinitions,
            sourceEntities
        });
    }
}

module.exports = SourceRecordIdentityCandidateService;
