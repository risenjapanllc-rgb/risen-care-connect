"use strict";

/**
 * Supabase Connector Credential Verifier Backend
 *
 * Responsibility:
 * - send connectorId + credential to the server-side verification RPC
 * - return only the authentication result
 * - never retrieve or expose credential_hash
 */
class SupabaseConnectorCredentialVerifierBackend {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "SupabaseConnectorCredentialVerifierBackend requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseConnectorCredentialVerifierBackend requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseConnectorCredentialVerifierBackend requires accessTokenProvider"
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

    async verifyCredential({ connectorId, credential } = {}) {
        const normalizedConnectorId =
            String(connectorId || "").trim();

        const normalizedCredential =
            String(credential || "");

        if (!normalizedConnectorId || !normalizedCredential) {
            return false;
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase credential verification requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/verify_connector_credential`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": this.apiKey,
                        "Authorization": `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        p_connector_id: normalizedConnectorId,
                        p_credential: normalizedCredential
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase credential verification failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (typeof result !== "boolean") {
            throw new Error(
                "Supabase credential verification returned invalid result"
            );
        }

        return {
            authenticated: result
        };
    }
}

module.exports =
    SupabaseConnectorCredentialVerifierBackend;
