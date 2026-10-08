"use strict";

class ConnectorActivationTransport {
    constructor({
        activationTokenVerifier,
        activationService
    } = {}) {
        if (
            !activationTokenVerifier ||
            typeof activationTokenVerifier.verify !==
                "function"
        ) {
            throw new Error(
                "ConnectorActivationTransport requires activationTokenVerifier"
            );
        }

        if (
            !activationService ||
            typeof activationService.activate !==
                "function"
        ) {
            throw new Error(
                "ConnectorActivationTransport requires activationService"
            );
        }

        this.activationTokenVerifier =
            activationTokenVerifier;

        this.activationService =
            activationService;
    }

    async handle({
        method,
        body
    } = {}) {
        if (method !== "POST") {
            return {
                httpStatus: 405,
                body: {
                    errorCode:
                        "connector_activation_method_not_allowed"
                }
            };
        }

        const activationToken =
            String(
                body?.activationToken ||
                ""
            ).trim();

        const connectorId =
            String(
                body?.connectorId ||
                ""
            ).trim();

        if (!activationToken) {
            return {
                httpStatus: 401,
                body: {
                    errorCode:
                        "connector_activation_unauthorized"
                }
            };
        }

        if (!connectorId) {
            return {
                httpStatus: 422,
                body: {
                    errorCode:
                        "connector_activation_connector_id_required"
                }
            };
        }

        let verification;

        try {
            verification =
                await this
                    .activationTokenVerifier
                    .verify(
                        activationToken
                    );
        } catch (error) {
            return {
                httpStatus: 401,
                body: {
                    errorCode:
                        "connector_activation_unauthorized"
                }
            };
        }

        if (
            !verification ||
            verification.valid !== true ||
            !verification.facilityId
        ) {
            return {
                httpStatus: 401,
                body: {
                    errorCode:
                        "connector_activation_unauthorized"
                }
            };
        }

        try {
            const result =
                await this
                    .activationService
                    .activate({
                        connectorId,
                        facilityId:
                            String(
                                verification
                                    .facilityId
                            )
                    });

            return {
                httpStatus: 200,
                body: result
            };
        } catch (error) {
            return {
                httpStatus: 503,
                body: {
                    errorCode:
                        "connector_activation_unavailable"
                }
            };
        }
    }
}

module.exports =
    ConnectorActivationTransport;
