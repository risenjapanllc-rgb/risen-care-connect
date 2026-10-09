"use strict";

const {
    createHash
} = require("node:crypto");

class SupabaseConnectorActivationTokenVerifier {
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
                "SupabaseConnectorActivationTokenVerifier requires supabaseUrl"
            );
        }

        if (
            !authProvider ||
            typeof authProvider.getAccessToken !==
                "function"
        ) {
            throw new Error(
                "SupabaseConnectorActivationTokenVerifier requires authProvider"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "SupabaseConnectorActivationTokenVerifier requires fetchImpl"
            );
        }

        this.supabaseUrl =
            supabaseUrl.trim().replace(/\/+$/, "");

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

    async verify({
        activationToken,
        connectorId
    } = {}) {
        const token =
            String(activationToken || "").trim();

        const normalizedConnectorId =
            String(connectorId || "").trim();

        if (
            !token ||
            !normalizedConnectorId
        ) {
            return {
                valid: false
            };
        }

        const tokenHash =
            createHash("sha256")
                .update(token, "utf8")
                .digest("hex");

        const accessToken =
            String(
                await this.authProvider
                    .getAccessToken() ||
                ""
            ).trim();

        if (!accessToken) {
            throw new Error(
                "connector activation verifier access token is unavailable"
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
                `${this.supabaseUrl}/rest/v1/rpc/consume_connector_activation_token`,
                {
                    method: "POST",
                    headers,
                    body:
                        JSON.stringify({
                            p_connector_id:
                                normalizedConnectorId,
                            p_token_hash:
                                tokenHash
                        })
                }
            );

        if (
            !response ||
            response.ok !== true
        ) {
            throw new Error(
                "connector activation token verification failed"
            );
        }

        const result =
            await response.json();

        if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result)
        ) {
            return {
                valid: false
            };
        }

        const returnedConnectorId =
            String(
                result.connectorId || ""
            ).trim();

        const facilityId =
            String(
                result.facilityId || ""
            ).trim();

        if (
            returnedConnectorId !==
                normalizedConnectorId ||
            !facilityId
        ) {
            return {
                valid: false
            };
        }

        return {
            valid: true,
            facilityId
        };
    }
}

module.exports =
    SupabaseConnectorActivationTokenVerifier;
