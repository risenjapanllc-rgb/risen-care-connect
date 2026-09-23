"use strict";

function requiredString(value) {
    return typeof value === "string" && value.trim()
        ? value.trim()
        : null;
}

function validDate(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;
}

class SupabaseConnectorResidentProfileQueryRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = globalThis.fetch
    } = {}) {
        this.supabaseUrl = requiredString(supabaseUrl);
        this.apiKey = requiredString(apiKey);
        this.accessTokenProvider = accessTokenProvider;
        this.fetchImpl = fetchImpl;

        if (!this.supabaseUrl ||
            !this.apiKey ||
            typeof accessTokenProvider?.getAccessToken !== "function" ||
            typeof fetchImpl !== "function") {
            throw new Error(
                "Resident profile query repository configuration is invalid"
            );
        }
    }

    async get({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        identifierType,
        identifierDigest,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const facilityId = requiredString(verifiedFacilityId);
        const connectorId = requiredString(verifiedConnectorId);
        const documentKey = requiredString(sourceDocumentKey);
        const type = requiredString(identifierType);
        const digest = requiredString(identifierDigest);
        const updatedAt = requiredString(sourceUpdatedAt);

        if (!facilityId ||
            !connectorId ||
            !documentKey ||
            !["name", "user_code"].includes(type) ||
            !digest ||
            !/^[0-9a-f]{64}$/.test(digest) ||
            !updatedAt ||
            Number.isNaN(Date.parse(updatedAt)) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0) {
            throw new Error("Resident profile query is invalid");
        }

        const token = requiredString(
            await this.accessTokenProvider.getAccessToken()
        );

        if (!token) {
            throw new Error("Resident profile query token is unavailable");
        }

        const endpoint =
            this.supabaseUrl.replace(/\/+$/, "") +
            "/rest/v1/rpc/get_connector_resident_profile";

        const response = await this.fetchImpl(endpoint, {
            method: "POST",
            headers: {
                apikey: this.apiKey,
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                p_facility_id: facilityId,
                p_connector_id: connectorId,
                p_source_document_key: documentKey,
                p_identifier_type: type,
                p_identifier_digest: digest,
                p_source_updated_at: updatedAt,
                p_source_size: sourceSize
            })
        });

        if (!response.ok) {
            throw new Error(
                `Resident profile query failed: ${response.status}`
            );
        }

        const rows = await response.json();

        if (!Array.isArray(rows) || rows.length > 1) {
            throw new Error("Resident profile query returned invalid rows");
        }

        if (rows.length === 0) {
            return null;
        }

        const row = rows[0];

        if (!row ||
            typeof row !== "object" ||
            Array.isArray(row) ||
            !requiredString(row.resident_id) ||
            !requiredString(row.name) ||
            (row.birth_date !== null &&
                !validDate(row.birth_date)) ||
            (row.gender !== null &&
                !requiredString(row.gender)) ||
            (row.user_code !== null &&
                !requiredString(row.user_code))) {
            throw new Error("Resident profile query returned invalid profile");
        }

        return {
            residentId: row.resident_id.trim(),
            name: row.name.trim(),
            birth_date: row.birth_date,
            gender: row.gender?.trim() ?? null,
            user_code: row.user_code?.trim() ?? null
        };
    }
}

module.exports = SupabaseConnectorResidentProfileQueryRepository;
