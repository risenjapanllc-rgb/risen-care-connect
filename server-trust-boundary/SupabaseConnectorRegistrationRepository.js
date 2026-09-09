"use strict";

/**
 * Supabase Connector Registration Repository
 *
 * Responsibility:
 * - retrieve connector registration from Supabase RPC
 * - map the RPC response into the repository contract
 * - do not perform credential verification here
 */
class SupabaseConnectorRegistrationRepository {
    constructor({ supabaseUrl, apiKey } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "SupabaseConnectorRegistrationRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseConnectorRegistrationRepository requires apiKey"
            );
        }

        this.supabaseUrl =
            String(supabaseUrl)
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            String(apiKey).trim();
    }

    async getRegistration({ connectorId } = {}) {
        const normalizedConnectorId =
            String(connectorId || "").trim();

        if (!normalizedConnectorId) {
            return null;
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/get_connector_registration`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": this.apiKey
                    },
                    body: JSON.stringify({
                        p_connector_id: normalizedConnectorId
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase registration lookup failed: ${response.status}`
            );
        }

        const result = await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase registration lookup returned invalid result"
            );
        }

        if (result.length === 0) {
            return null;
        }

        if (result.length !== 1) {
            throw new Error(
                "Supabase registration lookup returned multiple registrations"
            );
        }

        const row = result[0];

        if (
            !row ||
            typeof row !== "object" ||
            Array.isArray(row)
        ) {
            throw new Error(
                "Supabase registration lookup returned invalid registration"
            );
        }

        return {
            connectorId: row.connector_id,
            facilityId: row.facility_id,
            active: row.active
        };
    }
}

module.exports =
    SupabaseConnectorRegistrationRepository;
