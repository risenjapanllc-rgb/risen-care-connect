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

    async callPersistenceRpc({
        rpcName,
        body,
        allowedStatuses
    }) {
        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase semantic record persistence requires access token"
            );
        }

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

        const result =
            await response.json();

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
