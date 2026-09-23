"use strict";

const crypto = require("node:crypto");

class RecipientCertificatePreviewFingerprint {
    create(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            throw new TypeError(
                "Recipient certificate fingerprint requires entries"
            );
        }

        const normalized = entries.map(entry => {
            if (
                !entry ||
                typeof entry !== "object" ||
                !["existing", "planned_new"].includes(entry.resolution) ||
                !["user_code", "name"].includes(entry.identifierType) ||
                typeof entry.identifierDigest !== "string" ||
                !/^[0-9a-f]{64}$/.test(entry.identifierDigest) ||
                !["create", "update", "unchanged"].includes(
                    entry.persistenceAction
                ) ||
                !entry.persistenceContract ||
                typeof entry.persistenceContract !== "object"
            ) {
                throw new TypeError(
                    "Recipient certificate fingerprint entry is invalid"
                );
            }

            const contract = entry.persistenceContract;

            if (
                contract.semanticType !== "recipient_certificate" ||
                contract.logicalSlot !== "primary" ||
                typeof contract.contentHash !== "string" ||
                !/^[0-9a-f]{64}$/.test(contract.contentHash) ||
                typeof contract.canonicalizationVersion !== "string" ||
                !contract.canonicalizationVersion.trim() ||
                !contract.semanticContent ||
                typeof contract.semanticContent !== "object" ||
                Array.isArray(contract.semanticContent)
            ) {
                throw new TypeError(
                    "Recipient certificate persistence contract is invalid"
                );
            }

            return {
                resolution: entry.resolution,
                identifierType: entry.identifierType,
                identifierDigest: entry.identifierDigest,
                residentId:
                    typeof entry.residentId === "string" &&
                    entry.residentId.trim()
                        ? entry.residentId.trim()
                        : null,
                displayName:
                    typeof entry.displayName === "string" &&
                    entry.displayName.trim()
                        ? entry.displayName.trim()
                        : null,
                persistenceAction: entry.persistenceAction,
                semanticType: contract.semanticType,
                logicalSlot: contract.logicalSlot,
                expectedContentHash:
                    contract.expectedContentHash || null,
                contentHash: contract.contentHash,
                canonicalizationVersion:
                    contract.canonicalizationVersion,
                semanticContent: contract.semanticContent
            };
        });

        const identityKeys = normalized.map(
            entry =>
                entry.identifierType +
                ":" +
                entry.identifierDigest
        );

        if (
            new Set(identityKeys).size !==
            identityKeys.length
        ) {
            throw new TypeError(
                "Recipient certificate fingerprint requires unique identity"
            );
        }

        normalized.sort((a, b) =>
            Buffer.compare(
                Buffer.from(
                    a.identifierType +
                    ":" +
                    a.identifierDigest,
                    "utf8"
                ),
                Buffer.from(
                    b.identifierType +
                    ":" +
                    b.identifierDigest,
                    "utf8"
                )
            )
        );

        const serialized = JSON.stringify(normalized);

        return crypto
            .createHash("sha256")
            .update(
                "risen-recipient-certificate-preview-plan-1",
                "utf8"
            )
            .update(serialized, "utf8")
            .digest("hex");
    }
}

module.exports = RecipientCertificatePreviewFingerprint;
