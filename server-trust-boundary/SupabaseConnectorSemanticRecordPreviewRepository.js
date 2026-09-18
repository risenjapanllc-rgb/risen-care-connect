"use strict";

class SupabaseConnectorSemanticRecordPreviewRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "SupabaseConnectorSemanticRecordPreviewRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseConnectorSemanticRecordPreviewRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !==
                "function"
        ) {
            throw new Error(
                "SupabaseConnectorSemanticRecordPreviewRepository requires accessTokenProvider"
            );
        }

        this.supabaseUrl =
            String(supabaseUrl)
                .trim()
                .replace(/\/+$/, "");

        this.apiKey = String(apiKey).trim();
        this.accessTokenProvider =
            accessTokenProvider;
    }

    async getBySourceRecordKeys({
        facilityId,
        connectorId,
        sourceDocumentKey,
        sourceRecordKeys
    } = {}) {
        if (
            !this.isNonEmptyString(facilityId) ||
            !this.isNonEmptyString(connectorId) ||
            !this.isNonEmptyString(sourceDocumentKey) ||
            !Array.isArray(sourceRecordKeys) ||
            sourceRecordKeys.length === 0 ||
            sourceRecordKeys.length > 500 ||
            sourceRecordKeys.some(
                key => !this.isNonEmptyString(key)
            )
        ) {
            throw new TypeError(
                "valid trusted preview lookup scope is required"
            );
        }

        const normalizedKeys =
            sourceRecordKeys.map(
                key => String(key).trim()
            );

        if (
            new Set(normalizedKeys).size !==
            normalizedKeys.length
        ) {
            throw new TypeError(
                "sourceRecordKeys must be unique"
            );
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase semantic preview lookup requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/get_connector_semantic_record_preview_rows`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "apikey": this.apiKey,
                        "Authorization":
                            `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        p_facility_id:
                            facilityId,
                        p_connector_id:
                            connectorId,
                        p_source_document_key:
                            sourceDocumentKey,
                        p_source_record_keys:
                            normalizedKeys
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase semantic preview lookup failed: ${response.status}`
            );
        }

        const result = await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase semantic preview lookup returned invalid result"
            );
        }

        const requestedKeys =
            new Set(normalizedKeys);
        const returnedKeys =
            new Set();

        return result.map(row => {
            if (
                !row ||
                typeof row !== "object" ||
                !this.isNonEmptyString(
                    row.source_record_key
                ) ||
                !this.isNonEmptyString(
                    row.record_id
                ) ||
                !this.isNonEmptyString(
                    row.resident_id
                ) ||
                !this.isNonEmptyString(
                    row.semantic_type
                ) ||
                !row.semantic_content ||
                typeof row.semantic_content !==
                    "object" ||
                Array.isArray(
                    row.semantic_content
                ) ||
                !this.isContentHash(
                    row.content_hash
                ) ||
                !this.isNonEmptyString(
                    row.canonicalization_version
                )
            ) {
                throw new Error(
                    "Supabase semantic preview lookup returned invalid record"
                );
            }

            const sourceRecordKey =
                String(
                    row.source_record_key
                ).trim();

            if (
                !requestedKeys.has(
                    sourceRecordKey
                )
            ) {
                throw new Error(
                    "Supabase semantic preview lookup returned unexpected source record"
                );
            }

            if (
                returnedKeys.has(
                    sourceRecordKey
                )
            ) {
                throw new Error(
                    "Supabase semantic preview lookup returned duplicate source record"
                );
            }

            returnedKeys.add(
                sourceRecordKey
            );

            return {
                sourceRecordKey,
                recordId: row.record_id,
                residentId:
                    row.resident_id,
                semanticType:
                    row.semantic_type,
                semanticContent:
                    row.semantic_content,
                contentHash:
                    row.content_hash,
                canonicalizationVersion:
                    row.canonicalization_version
            };
        });
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    isContentHash(value) {
        return (
            typeof value === "string" &&
            /^[0-9a-f]{64}$/.test(value)
        );
    }
}

module.exports =
    SupabaseConnectorSemanticRecordPreviewRepository;
