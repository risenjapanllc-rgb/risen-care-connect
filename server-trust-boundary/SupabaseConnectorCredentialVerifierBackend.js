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
    constructor({ supabaseUrl, apiKey } = {}) {
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

        this.supabaseUrl =
            String(supabaseUrl)
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            String(apiKey).trim();
    }

    async verifyCredential({ connectorId, credential } = {}) {
        const normalizedConnectorId =
            String(connectorId || "").trim();

        const normalizedCredential =
            String(credential || "");

        if (!normalizedConnectorId || !normalizedCredential) {
            return false;
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/verify_connector_credential`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": this.apiKey,
                        "Authorization": `Bearer ${this.apiKey}`
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
