"use strict";

const RecordIdentityCandidateProvider =
    require("../server-domain/record/RecordIdentityCandidateProvider");

/**
 * Supabase Record Identity Candidate Provider
 *
 * Responsibility:
 * - retrieve record identity candidates through the trusted Supabase RPC
 * - preserve the complete four-key identity scope exactly
 *
 * Security:
 * - authenticated connector_trust_boundary JWT required
 * - returns recordId only
 * - no contentHash, residentId, fileName, or semantic content lookup
 */
class SupabaseRecordIdentityCandidateProvider
    extends RecordIdentityCandidateProvider {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseRecordIdentityCandidateProvider requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseRecordIdentityCandidateProvider requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseRecordIdentityCandidateProvider requires accessTokenProvider"
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

    async findCandidates({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        sourceRecordKey
    } = {}) {
        if (
            !this.isNonEmptyString(verifiedFacilityId) ||
            !this.isNonEmptyString(verifiedConnectorId) ||
            !this.isNonEmptyString(sourceDocumentKey) ||
            !this.isNonEmptyString(sourceRecordKey)
        ) {
            return [];
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase record identity lookup requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/get_semantic_record_identity_candidates`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": this.apiKey,
                        "Authorization": `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        p_facility_id:
                            verifiedFacilityId,
                        p_connector_id:
                            verifiedConnectorId,
                        p_source_document_key:
                            sourceDocumentKey,
                        p_source_record_key:
                            sourceRecordKey
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase record identity lookup failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase record identity lookup returned invalid result"
            );
        }

        return result.map((row) => {
            if (
                !row ||
                typeof row !== "object" ||
                typeof row.record_id !== "string" ||
                !row.record_id
            ) {
                throw new Error(
                    "Supabase record identity lookup returned invalid candidate"
                );
            }

            return {
                recordId: row.record_id
            };
        });
    }
}

module.exports =
    SupabaseRecordIdentityCandidateProvider;
