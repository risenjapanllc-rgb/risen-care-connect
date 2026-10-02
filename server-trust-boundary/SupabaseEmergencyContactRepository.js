"use strict";

class SupabaseEmergencyContactRepository {
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
            typeof accessTokenProvider.getAccessToken !==
                "function" ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "SupabaseEmergencyContactRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl =
            supabaseUrl.trim().replace(/\/+$/, "");

        this.apiKey =
            apiKey.trim();

        this.accessTokenProvider =
            accessTokenProvider;

        this.fetchImpl =
            fetchImpl;
    }

    async accessToken() {
        const token =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof token !== "string" ||
            !token.trim()
        ) {
            throw new Error(
                "Supabase access token is unavailable"
            );
        }

        return token.trim();
    }

    async rpc(name, body) {
        const token =
            await this.accessToken();

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/${name}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        apikey:
                            this.apiKey,

                        Authorization:
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify(body)
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase emergency contact request failed: ${response.status}`
            );
        }

        return await response.json();
    }

    async findActiveByCaseAndContact({
        facilityId,
        caseId,
        contactId
    } = {}) {
        if (
            typeof facilityId !== "string" ||
            !facilityId.trim() ||
            typeof caseId !== "string" ||
            !caseId.trim() ||
            typeof contactId !== "string" ||
            !contactId.trim()
        ) {
            throw new TypeError(
                "emergency contact lookup input is invalid"
            );
        }

        const normalizedFacilityId =
            facilityId.trim();

        const normalizedCaseId =
            caseId.trim();

        const normalizedContactId =
            contactId.trim();

        const rows =
            await this.rpc(
                "get_voice_emergency_contact",
                {
                    p_facility_id:
                        normalizedFacilityId,

                    p_case_id:
                        normalizedCaseId,

                    p_contact_id:
                        normalizedContactId
                }
            );

        if (!Array.isArray(rows)) {
            throw new Error(
                "Supabase voice emergency contact query returned invalid result"
            );
        }

        if (rows.length === 0) {
            throw new Error(
                "emergency contact not found"
            );
        }

        if (rows.length !== 1) {
            throw new Error(
                "Supabase voice emergency contact query returned multiple results"
            );
        }

        const contact =
            rows[0];

        if (
            !contact ||
            typeof contact !== "object" ||
            Array.isArray(contact)
        ) {
            throw new Error(
                "Supabase voice emergency contact query returned invalid contact"
            );
        }

        if (
            contact.contact_id !==
            normalizedContactId
        ) {
            throw new Error(
                "emergency contact identity mismatch"
            );
        }

        if (
            contact.facility_id !==
            normalizedFacilityId
        ) {
            throw new Error(
                "emergency contact facility mismatch"
            );
        }

        if (
            typeof contact.phone_number !==
                "string" ||
            !contact.phone_number.trim()
        ) {
            throw new Error(
                "emergency contact phone number is not configured"
            );
        }

        return {
            contactId:
                contact.contact_id,

            phoneNumber:
                contact.phone_number.trim(),

            contactName:
                typeof contact.contact_name ===
                    "string"
                    ? contact.contact_name
                    : null,

            contactType:
                typeof contact.contact_type ===
                    "string"
                    ? contact.contact_type
                    : null,

            caseId:
                normalizedCaseId,

            residentId:
                contact.resident_id ||
                null
        };
    }
}

module.exports =
    SupabaseEmergencyContactRepository;
