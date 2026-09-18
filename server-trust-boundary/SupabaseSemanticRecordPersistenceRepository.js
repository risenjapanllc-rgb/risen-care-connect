"use strict";

const SemanticRecordPersistenceRepository =
    require("../server-domain/storage/SemanticRecordPersistenceRepository");

/**
 * Supabase Semantic Record Persistence Repository
 *
 * Responsibility:
 * - persist confirmed semantic records only through trusted atomic RPCs
 *
 * Security:
 * - authenticated connector_trust_boundary JWT required
 * - no direct semantic table writes
 * - facility and connector identity come from verified server context
 */
class SupabaseSemanticRecordPersistenceRepository
    extends SemanticRecordPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSemanticRecordPersistenceRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSemanticRecordPersistenceRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseSemanticRecordPersistenceRepository requires accessTokenProvider"
            );
        }

        this.supabaseUrl =
            String(supabaseUrl)
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            String(apiKey).trim();

        this.accessTokenProvider =
            accessTokenProvider;
    }

    async createConfirmedRecord(input = {}) {
        const validation =
            await super.createConfirmedRecord(input)
                .catch((error) => error);

        if (
            validation &&
            validation.status === "invalid"
        ) {
            return validation;
        }

        return this.callPersistenceRpc({
            rpcName:
                "create_confirmed_semantic_record",
            body: {
                p_facility_id:
                    input.verifiedFacilityId,
                p_connector_id:
                    input.verifiedConnectorId,
                p_resident_id:
                    input.residentId,
                p_source_document_key:
                    input.sourceDocumentKey,
                p_source_record_key:
                    input.sourceRecordKey,
                p_content_hash:
                    input.contentHash,
                p_canonicalization_version:
                    input.canonicalizationVersion,
                p_semantic_content:
                    input.semanticContent
            },
            allowedStatuses: new Set([
                "created",
                "unchanged",
                "conflict",
                "denied",
                "resident_mismatch"
            ])
        });
    }

    async updateConfirmedRecord(input = {}) {
        const validation =
            await super.updateConfirmedRecord(input)
                .catch((error) => error);

        if (
            validation &&
            validation.status === "invalid"
        ) {
            return validation;
        }

        return this.callPersistenceRpc({
            rpcName:
                "update_confirmed_semantic_record",
            body: {
                p_facility_id:
                    input.verifiedFacilityId,
                p_connector_id:
                    input.verifiedConnectorId,
                p_record_id:
                    input.recordId,
                p_expected_content_hash:
                    input.expectedContentHash,
                p_content_hash:
                    input.contentHash,
                p_canonicalization_version:
                    input.canonicalizationVersion,
                p_semantic_content:
                    input.semanticContent
            },
            allowedStatuses: new Set([
                "updated",
                "unchanged",
                "conflict",
                "denied",
                "not_found"
            ])
        });
    }

    async persistBatch({
        verifiedFacilityId,
        verifiedConnectorId,
        operations
    } = {}) {

        if (
            !this.isNonEmptyString(
                verifiedFacilityId
            ) ||
            !this.isNonEmptyString(
                verifiedConnectorId
            ) ||
            !Array.isArray(operations) ||
            operations.length < 1 ||
            operations.length > 100 ||
            operations.some(
                operation =>
                    !operation ||
                    typeof operation !== "object" ||
                    Array.isArray(operation)
            )
        ) {
            return {
                status: "invalid"
            };
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase semantic record batch persistence requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/persist_connector_semantic_record_batch`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "apikey":
                            this.apiKey,
                        "Authorization":
                            `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        p_facility_id:
                            verifiedFacilityId,
                        p_connector_id:
                            verifiedConnectorId,
                        p_operations:
                            operations
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase semantic record batch persistence failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1
        ) {
            throw new Error(
                "Supabase semantic record batch persistence returned invalid result"
            );
        }

        const row = result[0];

        if (
            !row ||
            typeof row !== "object" ||
            (
                row.status !== "completed" &&
                row.status !== "stopped"
            ) ||
            !Number.isInteger(row.processed) ||
            !Number.isInteger(row.created) ||
            !Number.isInteger(row.updated) ||
            !Number.isInteger(row.unchanged) ||
            row.processed < 0 ||
            row.created < 0 ||
            row.updated < 0 ||
            row.unchanged < 0 ||
            row.processed !==
                row.created +
                row.updated +
                row.unchanged
        ) {
            throw new Error(
                "Supabase semantic record batch persistence returned invalid result"
            );
        }

        if (row.status === "completed") {
            if (
                row.processed !==
                    operations.length ||
                row.failed_index !== null ||
                row.failure_status !== null
            ) {
                throw new Error(
                    "Supabase semantic record batch persistence returned invalid completed result"
                );
            }

            return {
                status: "completed",
                processed: row.processed,
                created: row.created,
                updated: row.updated,
                unchanged: row.unchanged
            };
        }

        if (
            !Number.isInteger(
                row.failed_index
            ) ||
            row.failed_index < 0 ||
            row.failed_index >=
                operations.length ||
            row.processed !==
                row.failed_index ||
            !this.isNonEmptyString(
                row.failure_status
            )
        ) {
            throw new Error(
                "Supabase semantic record batch persistence returned invalid stopped result"
            );
        }

        return {
            status: "stopped",
            processed: row.processed,
            created: row.created,
            updated: row.updated,
            unchanged: row.unchanged,
            failedIndex:
                row.failed_index,
            failureStatus:
                row.failure_status
        };
    }

    async callPersistenceRpc({
        rpcName,
        body,
        allowedStatuses
    }) {
        const totalStartedAt = performance.now();
        const tokenStartedAt = performance.now();

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        const tokenElapsedMs =
            performance.now() - tokenStartedAt;

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase semantic record persistence requires access token"
            );
        }

        const fetchStartedAt = performance.now();

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/${rpcName}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": this.apiKey,
                        "Authorization":
                            `Bearer ${accessToken}`
                    },
                    body: JSON.stringify(body)
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase semantic record persistence failed: ${response.status}`
            );
        }

        const fetchElapsedMs =
            performance.now() - fetchStartedAt;

        const jsonStartedAt = performance.now();

        const result =
            await response.json();

        const jsonElapsedMs =
            performance.now() - jsonStartedAt;

        console.error(JSON.stringify({
            diagnostic: "semantic_persistence_timing",
            rpc:
                rpcName === "create_confirmed_semantic_record"
                    ? "create"
                    : rpcName === "update_confirmed_semantic_record"
                        ? "update"
                        : "unknown",
            tokenMs: Math.round(tokenElapsedMs),
            fetchMs: Math.round(fetchElapsedMs),
            jsonMs: Math.round(jsonElapsedMs),
            totalMs: Math.round(
                performance.now() - totalStartedAt
            )
        }));

        if (
            !Array.isArray(result) ||
            result.length !== 1
        ) {
            throw new Error(
                "Supabase semantic record persistence returned invalid result"
            );
        }

        const row = result[0];

        if (
            !row ||
            typeof row !== "object" ||
            typeof row.status !== "string" ||
            !allowedStatuses.has(row.status)
        ) {
            throw new Error(
                "Supabase semantic record persistence returned invalid status"
            );
        }

        if (
            row.record_id !== null &&
            !this.isNonEmptyString(row.record_id)
        ) {
            throw new Error(
                "Supabase semantic record persistence returned invalid record"
            );
        }

        if (
            (
                row.status === "created" ||
                row.status === "updated" ||
                row.status === "unchanged" ||
                row.status === "conflict"
            ) &&
            !this.isNonEmptyString(row.record_id)
        ) {
            throw new Error(
                "Supabase semantic record persistence returned missing record"
            );
        }

        return {
            status: row.status,
            recordId:
                row.record_id === null
                    ? null
                    : row.record_id
        };
    }
}

module.exports =
    SupabaseSemanticRecordPersistenceRepository;
