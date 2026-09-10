"use strict";

const ExistingSemanticRecordRepository =
    require("../server-domain/storage/ExistingSemanticRecordRepository");

/**
 * Supabase Existing Semantic Record Repository
 *
 * Responsibility:
 * - retrieve existing semantic record state through the trusted Supabase RPC
 * - scope lookup by verified facilityId + resolved recordId
 *
 * Security:
 * - authenticated connector_trust_boundary JWT required
 * - returns only recordId, contentHash, canonicalizationVersion
 * - no resident data, source identity, credential, or semantic content
 */
class SupabaseExistingSemanticRecordRepository
    extends ExistingSemanticRecordRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseExistingSemanticRecordRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseExistingSemanticRecordRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseExistingSemanticRecordRepository requires accessTokenProvider"
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

    async getByRecordId({
        facilityId,
        recordId
    } = {}) {
        if (
            !this.isNonEmptyString(facilityId) ||
            !this.isNonEmptyString(recordId)
        ) {
            return null;
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase semantic record state lookup requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/get_existing_semantic_record_state`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": this.apiKey,
                        "Authorization": `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        p_facility_id:
                            facilityId,
                        p_record_id:
                            recordId
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase semantic record state lookup failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase semantic record state lookup returned invalid result"
            );
        }

        if (result.length === 0) {
            return null;
        }

        if (result.length !== 1) {
            throw new Error(
                "Supabase semantic record state lookup returned ambiguous result"
            );
        }

        const row = result[0];

        if (
            !row ||
            typeof row !== "object" ||
            !this.isNonEmptyString(row.record_id) ||
            !this.isContentHash(row.content_hash) ||
            !this.isNonEmptyString(
                row.canonicalization_version
            )
        ) {
            throw new Error(
                "Supabase semantic record state lookup returned invalid record"
            );
        }

        if (row.record_id !== recordId) {
            throw new Error(
                "Supabase semantic record state lookup returned mismatched record"
            );
        }

        return {
            recordId: row.record_id,
            contentHash: row.content_hash,
            canonicalizationVersion:
                row.canonicalization_version
        };
    }

    isContentHash(value) {
        return (
            typeof value === "string" &&
            /^[0-9a-f]{64}$/.test(value)
        );
    }
}

module.exports =
    SupabaseExistingSemanticRecordRepository;
