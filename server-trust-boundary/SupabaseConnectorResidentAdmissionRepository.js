"use strict";

const ALLOWED_RESIDENT_PROFILE_FIELDS =
    new Set(["name", "birth_date", "gender", "user_code"]);

function normalizeOptionalProfileValue(value) {
    return typeof value === "string" && value.trim()
        ? value.trim()
        : null;
}

function isValidIsoCalendarDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
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

function isValidResidentProfile(profile, name) {
    if (
        !profile ||
        typeof profile !== "object" ||
        Array.isArray(profile)
    ) {
        return false;
    }

    if (
        Object.keys(profile).some(
            field => !ALLOWED_RESIDENT_PROFILE_FIELDS.has(field)
        )
    ) {
        return false;
    }

    if (
        Object.values(profile).some(
            value =>
                typeof value !== "string" ||
                !value.trim()
        )
    ) {
        return false;
    }

    if (
        typeof profile.name !== "string" ||
        profile.name.trim() !== name.trim()
    ) {
        return false;
    }

    if (
        profile.birth_date !== undefined &&
        !isValidIsoCalendarDate(profile.birth_date.trim())
    ) {
        return false;
    }

    return true;
}

class SupabaseConnectorResidentAdmissionRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof supabaseUrl !== "string" ||
            !supabaseUrl.trim() ||
            typeof apiKey !== "string" ||
            !apiKey.trim() ||
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function" ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "SupabaseConnectorResidentAdmissionRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl = supabaseUrl.replace(/\/+$/, "");
        this.apiKey = apiKey;
        this.accessTokenProvider = accessTokenProvider;
        this.fetchImpl = fetchImpl;
    }

    async admit({
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
        if (!this.isValid({
            verifiedFacilityId,
            verifiedConnectorId,
            sourceDocumentKey,
            identifierType,
            identifierDigest,
            name,
            residentProfile,
            sourceUpdatedAt,
            sourceSize
        })) {
            throw new TypeError("resident admission request is invalid");
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (typeof accessToken !== "string" || !accessToken.trim()) {
            throw new Error("Supabase access token is unavailable");
        }

        const response = await this.fetchImpl(
            `${this.supabaseUrl}/rest/v1/rpc/admit_connector_resident`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: this.apiKey,
                    Authorization: `Bearer ${accessToken.trim()}`
                },
                body: JSON.stringify({
                    p_facility_id: verifiedFacilityId.trim(),
                    p_connector_id: verifiedConnectorId.trim(),
                    p_source_document_key: sourceDocumentKey.trim(),
                    p_identifier_type: identifierType.trim(),
                    p_identifier_digest: identifierDigest.trim(),
                    p_name: name.trim(),
                    p_birth_date: normalizeOptionalProfileValue(
                        residentProfile.birth_date
                    ),
                    p_gender: normalizeOptionalProfileValue(
                        residentProfile.gender
                    ),
                    p_user_code: normalizeOptionalProfileValue(
                        residentProfile.user_code
                    ),
                    p_source_updated_at:
                        new Date(sourceUpdatedAt).toISOString(),
                    p_source_size: sourceSize
                })
            }
        );

        if (!response.ok) {
            const errorBody =
                await response.text();

            throw new Error(
                `Supabase resident admission failed: ${response.status} ${errorBody}`
            );
        }

        const result = await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1 ||
            !result[0] ||
            typeof result[0] !== "object"
        ) {
            throw new Error(
                "Supabase resident admission returned invalid result"
            );
        }

        const row = result[0];
        const validStatuses = new Set([
            "created",
            "existing",
            "stale",
            "not_approved",
            "conflict",
            "name_conflict",
            "user_code_conflict"
        ]);

        if (!validStatuses.has(row.status)) {
            throw new Error(
                "Supabase resident admission returned invalid status"
            );
        }

        const residentId =
            typeof row.resident_id === "string" &&
            row.resident_id.trim()
                ? row.resident_id.trim()
                : null;

        if (
            ["created", "existing"].includes(row.status) &&
            !residentId
        ) {
            throw new Error(
                "Supabase resident admission returned invalid resident"
            );
        }

        if (
            typeof row.resident_created !== "boolean" ||
            (row.status === "created" && !row.resident_created) ||
            (row.status !== "created" && row.resident_created)
        ) {
            throw new Error(
                "Supabase resident admission returned invalid creation state"
            );
        }

        return {
            status: row.status,
            residentId,
            residentCreated: row.resident_created
        };
    }

    isValid(input) {
        const requiredStrings = [
            input.verifiedFacilityId,
            input.verifiedConnectorId,
            input.sourceDocumentKey,
            input.identifierType,
            input.identifierDigest,
            input.name,
            input.sourceUpdatedAt
        ];

        if (requiredStrings.some(value =>
            typeof value !== "string" || !value.trim()
        )) {
            return false;
        }

        if (!["name", "user_code"].includes(
            input.identifierType.trim()
        )) {
            return false;
        }

        if (!/^[0-9a-f]{64}$/.test(
            input.identifierDigest.trim()
        )) {
            return false;
        }

        if (
            !isValidResidentProfile(
                input.residentProfile,
                input.name
            )
        ) {
            return false;
        }

        if (Number.isNaN(Date.parse(input.sourceUpdatedAt))) {
            return false;
        }

        return (
            Number.isSafeInteger(input.sourceSize) &&
            input.sourceSize >= 0
        );
    }
}

module.exports =
    SupabaseConnectorResidentAdmissionRepository;
