"use strict";

const {
    createHash
} = require("node:crypto");

class SupabaseConnectorActivationHandoffRepository {
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
                "SupabaseConnectorActivationHandoffRepository requires supabaseUrl"
            );
        }

        if (
            !authProvider ||
            typeof authProvider.getAccessToken !==
                "function"
        ) {
            throw new Error(
                "SupabaseConnectorActivationHandoffRepository requires authProvider"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "SupabaseConnectorActivationHandoffRepository requires fetchImpl"
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

    hashHandoffId(handoffId) {
        return createHash("sha256")
            .update(
                String(handoffId || ""),
                "utf8"
            )
            .digest("hex");
    }

    buildHeaders(accessToken) {
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

        return headers;
    }

    async create({
        handoffId,
        connectorId,
        activationToken,
        facilitySystemAccessToken,
        ttlSeconds = 120
    } = {}) {
        const normalizedHandoffId =
            String(handoffId || "").trim();

        const normalizedConnectorId =
            String(connectorId || "").trim();

        const normalizedActivationToken =
            String(activationToken || "").trim();

        const accessToken =
            String(
                facilitySystemAccessToken || ""
            ).trim();

        if (
            !/^[0-9a-f]{64}$/
                .test(normalizedHandoffId) ||
            !/^[0-9a-f-]{36}$/i
                .test(normalizedConnectorId) ||
            !/^ract_[0-9a-f]{64}$/
                .test(normalizedActivationToken) ||
            !accessToken
        ) {
            throw new Error(
                "connector activation handoff create input is invalid"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/create_connector_activation_handoff`,
                {
                    method: "POST",
                    headers:
                        this.buildHeaders(
                            accessToken
                        ),
                    body:
                        JSON.stringify({
                            p_handoff_hash:
                                this.hashHandoffId(
                                    normalizedHandoffId
                                ),
                            p_connector_id:
                                normalizedConnectorId,
                            p_activation_token:
                                normalizedActivationToken,
                            p_ttl_seconds:
                                ttlSeconds
                        })
                }
            );

        if (
            !response ||
            response.ok !== true
        ) {
            throw new Error(
                "connector activation handoff create RPC failed"
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1 ||
            !result[0] ||
            typeof result[0].expires_at !==
                "string"
        ) {
            throw new Error(
                "connector activation handoff create RPC returned invalid response"
            );
        }

        return {
            status: "created",
            expiresAt:
                result[0].expires_at
        };
    }

    async consume({
        handoffId
    } = {}) {
        const normalizedHandoffId =
            String(handoffId || "").trim();

        if (
            !/^[0-9a-f]{64}$/
                .test(normalizedHandoffId)
        ) {
            return {
                status: "not_found"
            };
        }

        const accessToken =
            String(
                await this.authProvider
                    .getAccessToken() ||
                ""
            ).trim();

        if (!accessToken) {
            throw new Error(
                "connector activation handoff access token is unavailable"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/consume_connector_activation_handoff`,
                {
                    method: "POST",
                    headers:
                        this.buildHeaders(
                            accessToken
                        ),
                    body:
                        JSON.stringify({
                            p_handoff_hash:
                                this.hashHandoffId(
                                    normalizedHandoffId
                                )
                        })
                }
            );

        if (
            !response ||
            response.ok !== true
        ) {
            throw new Error(
                "connector activation handoff consume RPC failed"
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
                status: "not_found"
            };
        }

        const connectorId =
            String(
                result.connectorId || ""
            ).trim();

        const activationToken =
            String(
                result.activationToken || ""
            ).trim();

        if (
            !connectorId ||
            !/^ract_[0-9a-f]{64}$/
                .test(activationToken)
        ) {
            return {
                status: "not_found"
            };
        }

        return {
            status: "consumed",
            connectorId,
            activationToken
        };
    }
}

module.exports =
    SupabaseConnectorActivationHandoffRepository;
