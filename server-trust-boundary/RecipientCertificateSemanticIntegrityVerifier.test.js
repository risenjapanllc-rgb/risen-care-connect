"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Verifier = require(
    "./RecipientCertificateSemanticIntegrityVerifier"
);
const Canonicalizer = require(
    "../local-connector/RecipientCertificateSemanticCanonicalizer"
);

test("accepts Local Connector canonical contract", () => {
    const canonical =
        new Canonicalizer().canonicalize({
            "recipient_certificate.valid_until": "2027-03-31",
            "recipient_certificate.certificate_number": "ABC123"
        });

    const verifier = new Verifier();

    assert.equal(
        verifier.verify({
            semanticContent:
                canonical.canonicalSemanticContent,
            contentHash:
                canonical.contentHash,
            canonicalizationVersion:
                canonical.canonicalizationVersion
        }),
        true
    );
});

test("rejects content changed after hashing", () => {
    const canonical =
        new Canonicalizer().canonicalize({
            "recipient_certificate.certificate_number": "ABC123"
        });

    assert.equal(
        new Verifier().verify({
            semanticContent: {
                "recipient_certificate.certificate_number": "ABC999"
            },
            contentHash: canonical.contentHash,
            canonicalizationVersion:
                canonical.canonicalizationVersion
        }),
        false
    );
});

test("key insertion order does not affect verification", () => {
    const canonical =
        new Canonicalizer().canonicalize({
            "recipient_certificate.certificate_number": "ABC123",
            "recipient_certificate.valid_until": "2027-03-31"
        });

    assert.equal(
        new Verifier().verify({
            semanticContent: {
                "recipient_certificate.valid_until": "2027-03-31",
                "recipient_certificate.certificate_number": "ABC123"
            },
            contentHash: canonical.contentHash,
            canonicalizationVersion:
                canonical.canonicalizationVersion
        }),
        true
    );
});

test("rejects non-string values and wrong version", () => {
    const verifier = new Verifier();

    assert.equal(
        verifier.verify({
            semanticContent: {
                "recipient_certificate.certificate_number": 123
            },
            contentHash: "a".repeat(64),
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-1"
        }),
        false
    );

    assert.equal(
        verifier.verify({
            semanticContent: {},
            contentHash: "a".repeat(64),
            canonicalizationVersion: "unknown-version"
        }),
        false
    );
});
