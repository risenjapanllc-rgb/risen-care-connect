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

        const cases =
            await this.rpc(
                "get_active_emergency_cases",
                {
                    p_facility_id:
                        normalizedFacilityId
                }
            );

        if (!Array.isArray(cases)) {
            throw new Error(
                "Supabase emergency case query returned invalid result"
            );
        }

        const emergencyCase =
            cases.find(
                row =>
                    row &&
                    row.id ===
                        normalizedCaseId
            );

        if (!emergencyCase) {
            throw new Error(
                "emergency case not found"
            );
        }

        if (
            emergencyCase.facility_id !==
            normalizedFacilityId
        ) {
            throw new Error(
                "emergency case facility mismatch"
            );
        }

        if (
            emergencyCase.status !==
            "active"
        ) {
            throw new Error(
                "emergency case is not active"
            );
        }

        const contacts =
            await this.rpc(
                "list_emergency_case_contacts",
                {
                    p_facility_id:
                        normalizedFacilityId,

                    p_resident_id:
                        emergencyCase.resident_id ||
                        null
                }
            );

        if (!Array.isArray(contacts)) {
            throw new Error(
                "Supabase emergency contact query returned invalid result"
            );
        }

        const contact =
            contacts.find(
                row =>
                    row &&
                    row.id ===
                        normalizedContactId
            );

        if (!contact) {
            throw new Error(
                "emergency contact not found"
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
            contact.is_active !==
            true
        ) {
            throw new Error(
                "emergency contact is not active"
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
                contact.id,

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
                emergencyCase.id,

            residentId:
                emergencyCase.resident_id ||
                null
        };
    }
}

module.exports =
    SupabaseEmergencyContactRepository;
