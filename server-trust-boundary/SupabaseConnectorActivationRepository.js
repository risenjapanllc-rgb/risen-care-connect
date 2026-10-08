"use strict";

class SupabaseConnectorActivationRepository {
    constructor({
        supabaseUrl,
        apiKey = null,
        authProvider,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof supabaseUrl !== "string" ||
            !supabaseUrl.trim()
        ) {
            throw new Error(
                "SupabaseConnectorActivationRepository requires supabaseUrl"
            );
        }

        if (
            !authProvider ||
            typeof authProvider.getAccessToken !==
                "function"
        ) {
            throw new Error(
                "SupabaseConnectorActivationRepository requires authProvider"
            );
        }

        if (
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "SupabaseConnectorActivationRepository requires fetchImpl"
            );
        }

        this.supabaseUrl =
            supabaseUrl
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            typeof apiKey === "string" &&
            apiKey.trim()
                ? apiKey.trim()
                : null;

        this.authProvider =
            authProvider;

        this.fetchImpl =
            fetchImpl;
    }

    async activateRegistration({
        connectorId,
        facilityId,
        credentialHash
    } = {}) {
        const normalizedConnectorId =
            String(
                connectorId || ""
            ).trim();

        const normalizedFacilityId =
            String(
                facilityId || ""
            ).trim();

        const normalizedCredentialHash =
            String(
                credentialHash || ""
            ).trim();

        if (
            !normalizedConnectorId ||
            !normalizedFacilityId ||
            !/^[0-9a-f]{64}$/.test(
                normalizedCredentialHash
            )
        ) {
            throw new Error(
                "connector activation registration input is invalid"
            );
        }

        const accessToken =
            String(
                await this.authProvider
                    .getAccessToken() ||
                ""
            ).trim();

        if (!accessToken) {
            throw new Error(
                "connector activation access token is unavailable"
            );
        }

        const headers = {
            Authorization:
                `Bearer ${accessToken}`,
            "Content-Type":
                "application/json"
        };

        if (this.apiKey) {
            headers.apikey =
                this.apiKey;
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/activate_connector_registration`,
                {
                    method:
                        "POST",
                    headers,
                    body:
                        JSON.stringify({
                            p_connector_id:
                                normalizedConnectorId,
                            p_facility_id:
                                normalizedFacilityId,
                            p_credential_hash:
                                normalizedCredentialHash
                        })
                }
            );

        if (
            !response ||
            response.ok !== true
        ) {
            const status =
                response &&
                Number.isInteger(
                    response.status
                )
                    ? response.status
                    : 0;

            throw new Error(
                `connector activation RPC failed (${status})`
            );
        }

        const activated =
            await response.json();

        if (activated === true) {
            return {
                status:
                    "activated"
            };
        }

        if (activated === false) {
            return {
                status:
                    "rejected"
            };
        }

        throw new Error(
            "connector activation RPC returned invalid response"
        );
    }
}

module.exports =
    SupabaseConnectorActivationRepository;
