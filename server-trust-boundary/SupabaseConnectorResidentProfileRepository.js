"use strict";

const ALLOWED_PROFILE_KEYS = new Set([
    "name",
    "birth_date",
    "gender",
    "user_code"
]);

const VALID_STATUSES = new Set([
    "filled",
    "unchanged",
    "conflict",
    "user_code_conflict",
    "stale",
    "not_confirmed"
]);

function requiredTrimmedString(value) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function optionalTrimmedString(value) {
    if (value === undefined || value === null) {
        return null;
    }

    return requiredTrimmedString(value);
}

function isRealIsoDate(value) {
    if (typeof value !== "string") {
        return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function normalizeProfile(profile, expectedName) {
    if (
        !profile ||
        typeof profile !== "object" ||
        Array.isArray(profile)
    ) {
        return null;
    }

    for (const key of Object.keys(profile)) {
        if (!ALLOWED_PROFILE_KEYS.has(key)) {
            return null;
        }
    }

    const name = requiredTrimmedString(profile.name);

    if (!name || name !== expectedName) {
        return null;
    }

    let birthDate = null;

    if (
        profile.birth_date !== undefined &&
        profile.birth_date !== null
    ) {
        if (!isRealIsoDate(profile.birth_date)) {
            return null;
        }

        birthDate = profile.birth_date;
    }

    const gender = optionalTrimmedString(profile.gender);
    const userCode = optionalTrimmedString(profile.user_code);

    if (
        (profile.gender !== undefined &&
            profile.gender !== null &&
            gender === null) ||
        (profile.user_code !== undefined &&
            profile.user_code !== null &&
            userCode === null)
    ) {
        return null;
    }

    return {
        name,
        birthDate,
        gender,
        userCode
    };
}

class SupabaseConnectorResidentProfileRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = globalThis.fetch
    } = {}) {
        this.supabaseUrl = requiredTrimmedString(supabaseUrl);
        this.apiKey = requiredTrimmedString(apiKey);
        this.accessTokenProvider = accessTokenProvider;
        this.fetchImpl = fetchImpl;

        if (
            !this.supabaseUrl ||
            !this.apiKey ||
            !this.accessTokenProvider ||
            typeof this.accessTokenProvider.getAccessToken !== "function" ||
            typeof this.fetchImpl !== "function"
        ) {
            throw new Error(
                "Supabase connector resident profile repository configuration is invalid"
            );
        }
    }

    async fill({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        identifierType,
        identifierDigest,
        name,
        residentProfile,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const facilityId = requiredTrimmedString(verifiedFacilityId);
        const connectorId = requiredTrimmedString(verifiedConnectorId);
        const documentKey = requiredTrimmedString(sourceDocumentKey);
        const normalizedIdentifierType =
            requiredTrimmedString(identifierType);
        const normalizedDigest =
            requiredTrimmedString(identifierDigest)?.toLowerCase();
        const normalizedName = requiredTrimmedString(name);
        const normalizedSourceUpdatedAt =
            requiredTrimmedString(sourceUpdatedAt);

        const profile = normalizeProfile(
            residentProfile,
            normalizedName
        );

        if (
            !facilityId ||
            !connectorId ||
            !documentKey ||
            !["name", "user_code"].includes(normalizedIdentifierType) ||
            !normalizedDigest ||
            !/^[0-9a-f]{64}$/.test(normalizedDigest) ||
            !normalizedName ||
            !profile ||
            !normalizedSourceUpdatedAt ||
            !Number.isInteger(sourceSize) ||
            sourceSize < 0
        ) {
            throw new Error(
                "resident profile fill request is invalid"
            );
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (!requiredTrimmedString(accessToken)) {
            throw new Error(
                "Supabase connector trust boundary access token is unavailable"
            );
        }

        const endpoint =
            `${this.supabaseUrl.replace(/\/+$/, "")}` +
            "/rest/v1/rpc/fill_connector_resident_profile";

        const response = await this.fetchImpl(endpoint, {
            method: "POST",
            headers: {
                apikey: this.apiKey,
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                p_facility_id: facilityId,
                p_connector_id: connectorId,
                p_source_document_key: documentKey,
                p_identifier_type: normalizedIdentifierType,
                p_identifier_digest: normalizedDigest,
                p_name: normalizedName,
                p_birth_date: profile.birthDate,
                p_gender: profile.gender,
                p_user_code: profile.userCode,
                p_source_updated_at: normalizedSourceUpdatedAt,
                p_source_size: sourceSize
            })
        });

        if (!response.ok) {
            let detail = "";

            try {
                detail = await response.text();
            } catch {
                detail = "";
            }

            throw new Error(
                `Supabase resident profile fill failed: ${response.status}` +
                (detail ? ` ${detail}` : "")
            );
        }

        const payload = await response.json();
        const row = Array.isArray(payload) ? payload[0] : payload;

        if (
            !row ||
            typeof row !== "object" ||
            !VALID_STATUSES.has(row.status)
        ) {
            throw new Error(
                "Supabase resident profile fill returned invalid status"
            );
        }

        const residentId =
            typeof row.resident_id === "string" &&
            row.resident_id.trim().length > 0
                ? row.resident_id.trim()
                : null;

        if (
            ["filled", "unchanged", "conflict", "user_code_conflict"]
                .includes(row.status) &&
            !residentId
        ) {
            throw new Error(
                "Supabase resident profile fill returned invalid resident"
            );
        }

        return {
            status: row.status,
            residentId
        };
    }
}

module.exports = SupabaseConnectorResidentProfileRepository;
