"use strict";

const SUPPORTED_SEMANTIC_TARGETS =
    new Set([
        "user.user_code",
        "user.name",
        "user.birth_date",
        "user.gender",
        "recipient_certificate.certificate_number",
        "recipient_certificate.valid_until"
    ]);

class RecipientCertificateSemanticContract {
    assertSupported(semanticKey) {
        if (!SUPPORTED_SEMANTIC_TARGETS.has(semanticKey)) {
            const error = new Error(
                "Recipient certificate semantic target is unsupported"
            );
            error.code =
                "recipient_certificate_semantic_target_unsupported";
            throw error;
        }
    }
}

module.exports =
    RecipientCertificateSemanticContract;
