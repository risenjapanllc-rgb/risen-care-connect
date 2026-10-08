"use strict";

class ConnectorActivationService {
    constructor({
        credentialGenerator,
        credentialHasher,
        registrationRepository
    } = {}) {
        if (
            !credentialGenerator ||
            typeof credentialGenerator.generate !==
                "function"
        ) {
            throw new Error(
                "ConnectorActivationService requires credentialGenerator"
            );
        }

        if (
            !credentialHasher ||
            typeof credentialHasher.hash !==
                "function"
        ) {
            throw new Error(
                "ConnectorActivationService requires credentialHasher"
            );
        }

        if (
            !registrationRepository ||
            typeof registrationRepository
                .activateRegistration !==
                "function"
        ) {
            throw new Error(
                "ConnectorActivationService requires registrationRepository"
            );
        }

        this.credentialGenerator =
            credentialGenerator;

        this.credentialHasher =
            credentialHasher;

        this.registrationRepository =
            registrationRepository;
    }

    async activate({
        connectorId,
        facilityId
    } = {}) {
        const normalizedConnectorId =
            String(
                connectorId || ""
            ).trim();

        const normalizedFacilityId =
            String(
                facilityId || ""
            ).trim();

        if (
            !normalizedConnectorId ||
            !normalizedFacilityId
        ) {
            throw new Error(
                "connector activation identity is invalid"
            );
        }

        const credential =
            this.credentialGenerator
                .generate();

        if (
            typeof credential !== "string" ||
            !credential.trim()
        ) {
            throw new Error(
                "generated connector credential is invalid"
            );
        }

        const credentialHash =
            this.credentialHasher
                .hash(
                    credential
                );

        if (
            typeof credentialHash !== "string" ||
            !credentialHash.trim()
        ) {
            throw new Error(
                "connector credential hash is invalid"
            );
        }

        const persistenceResult =
            await this
                .registrationRepository
                .activateRegistration({
                    connectorId:
                        normalizedConnectorId,
                    facilityId:
                        normalizedFacilityId,
                    credentialHash:
                        credentialHash
                });

        if (
            !persistenceResult ||
            persistenceResult.status !==
                "activated"
        ) {
            throw new Error(
                "connector activation persistence failed"
            );
        }

        return {
            status:
                "activated",
            credential
        };
    }
}

module.exports =
    ConnectorActivationService;
