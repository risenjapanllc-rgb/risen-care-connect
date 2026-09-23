"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RecipientCertificateSemanticCanonicalizer =
    require("./RecipientCertificateSemanticCanonicalizer");

test("canonicalization ignores object key insertion order", () => {
    const canonicalizer =
        new RecipientCertificateSemanticCanonicalizer();

    const first = canonicalizer.canonicalize({
        "recipient_certificate.valid_until": "2027-03-31",
        "recipient_certificate.certificate_number": "ABC123"
    });

    const second = canonicalizer.canonicalize({
        "recipient_certificate.certificate_number": "ABC123",
        "recipient_certificate.valid_until": "2027-03-31"
    });

    assert.equal(first.canonicalString, second.canonicalString);
    assert.equal(first.contentHash, second.contentHash);
    assert.deepEqual(first.canonicalSemanticContent, {
        "recipient_certificate.certificate_number": "ABC123",
        "recipient_certificate.valid_until": "2027-03-31"
    });
});

test("content change changes hash", () => {
    const canonicalizer =
        new RecipientCertificateSemanticCanonicalizer();

    const first = canonicalizer.canonicalize({
        "recipient_certificate.certificate_number": "ABC123"
    });

    const second = canonicalizer.canonicalize({
        "recipient_certificate.certificate_number": "ABC124"
    });

    assert.notEqual(first.contentHash, second.contentHash);
});

test("canonicalization version is explicit", () => {
    const canonicalizer =
        new RecipientCertificateSemanticCanonicalizer();

    const result = canonicalizer.canonicalize({
        "recipient_certificate.certificate_number": "ABC123"
    });

    assert.equal(
        result.canonicalizationVersion,
        "risen-recipient-certificate-canonicalization-1"
    );
    assert.match(result.contentHash, /^[0-9a-f]{64}$/);
});

test("non-string semantic values fail closed", () => {
    const canonicalizer =
        new RecipientCertificateSemanticCanonicalizer();

    assert.throws(
        () => canonicalizer.canonicalize({
            "recipient_certificate.certificate_number": 123
        }),
        /must be a string/
    );
});
