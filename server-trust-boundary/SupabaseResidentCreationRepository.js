"use strict";

class SupabaseResidentCreationRepository {
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
                "SupabaseResidentCreationRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl = supabaseUrl.replace(/\/+$/, "");
        this.apiKey = apiKey;
        this.accessTokenProvider = accessTokenProvider;
        this.fetchImpl = fetchImpl;
    }

    async create({
        verifiedFacilityId,
        verifiedConnectorId,
        name
    } = {}) {
        if (
            typeof verifiedFacilityId !== "string" ||
            !verifiedFacilityId.trim() ||
            typeof verifiedConnectorId !== "string" ||
            !verifiedConnectorId.trim() ||
            typeof name !== "string" ||
            !name.trim()
        ) {
            throw new TypeError(
                "resident creation request is invalid"
            );
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken.trim()
        ) {
            throw new Error(
                "Supabase access token is unavailable"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/create_connector_resident`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: this.apiKey,
                        Authorization: `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        p_facility_id:
                            verifiedFacilityId.trim(),
                        p_connector_id:
                            verifiedConnectorId.trim(),
                        p_name:
                            name.trim()
                    })
                }
            );

        if (!response.ok) {
            let databaseErrorCode = null;

            try {
                const errorBody =
                    await response.json();

                if (
                    errorBody &&
                    typeof errorBody === "object" &&
                    !Array.isArray(errorBody) &&
                    typeof errorBody.code === "string"
                ) {
                    databaseErrorCode =
                        errorBody.code.trim();
                }
            } catch {
                databaseErrorCode = null;
            }

            const error =
                new Error(
                    `Supabase resident creation failed: ${response.status}`
                );

            error.code =
                databaseErrorCode === "21000"
                    ? "resident_name_ambiguous"
                    : "resident_creation_unavailable";

            throw error;
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1 ||
            !result[0] ||
            typeof result[0] !== "object" ||
            typeof result[0].resident_id !== "string" ||
            !result[0].resident_id.trim() ||
            typeof result[0].name !== "string" ||
            !result[0].name.trim() ||
            typeof result[0].created !== "boolean"
        ) {
            throw new Error(
                "Supabase resident creation returned invalid result"
            );
        }

        return {
            status:
                result[0].created
                    ? "created"
                    : "existing",
            resident: {
                residentId:
                    result[0].resident_id.trim(),
                userCode:
                    typeof result[0].user_code === "string"
                        ? result[0].user_code
                        : null,
                name:
                    result[0].name.trim(),
                kana:
                    typeof result[0].kana === "string"
                        ? result[0].kana
                        : null,
                birthDate:
                    typeof result[0].birth_date === "string"
                        ? result[0].birth_date
                        : null
            }
        };
    }
}

module.exports = SupabaseResidentCreationRepository;
