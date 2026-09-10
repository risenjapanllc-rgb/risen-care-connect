"use strict";

require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseConnectorTrustAuthProvider =
    require("../server-trust-boundary/SupabaseConnectorTrustAuthProvider");

const SupabaseSemanticRecordPersistenceRepository =
    require("../server-trust-boundary/SupabaseSemanticRecordPersistenceRepository");

const VERSION =
    "risen-semantic-canonicalization-1";

const SYNTHETIC_FACILITY =
    "00000000-0000-4000-8000-000000000011";

const SYNTHETIC_CONNECTOR =
    "00000000-0000-4000-8000-000000000012";

const SYNTHETIC_RESIDENT =
    "00000000-0000-4000-8000-000000000013";

const SYNTHETIC_RECORD =
    "00000000-0000-4000-8000-000000000014";

function requireEnv(name) {
    const value = process.env[name];

    if (
        typeof value !== "string" ||
        value.trim() === ""
    ) {
        throw new Error(
            `missing required integration environment: ${name}`
        );
    }

    return value;
}

function createRepository() {
    const supabaseUrl =
        requireEnv("SUPABASE_URL");

    const apiKey =
        requireEnv("SUPABASE_PUBLISHABLE_KEY");

    const accessTokenProvider =
        new SupabaseConnectorTrustAuthProvider({
            supabaseUrl,
            apiKey,
            email:
                requireEnv(
                    "SUPABASE_CONNECTOR_TRUST_EMAIL"
                ),
            password:
                requireEnv(
                    "SUPABASE_CONNECTOR_TRUST_PASSWORD"
                )
        });

    return new SupabaseSemanticRecordPersistenceRepository({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    });
}

function semanticContent() {
    return {
        semanticType: "support_record",
        fields: {
            supportContent:
                "synthetic persistence negative test"
        },
        customFields: {}
    };
}

test(
    "live CREATE denies unregistered synthetic connector without writing",
    async () => {
        const repository =
            createRepository();

        const result =
            await repository.createConfirmedRecord({
                verifiedFacilityId:
                    SYNTHETIC_FACILITY,
                verifiedConnectorId:
                    SYNTHETIC_CONNECTOR,
                residentId:
                    SYNTHETIC_RESIDENT,
                sourceDocumentKey:
                    "synthetic-negative-document",
                sourceRecordKey:
                    "support_record:primary",
                contentHash:
                    "a".repeat(64),
                canonicalizationVersion:
                    VERSION,
                semanticContent:
                    semanticContent()
            });

        assert.deepStrictEqual(
            result,
            {
                status: "denied",
                recordId: null
            }
        );
    }
);

test(
    "live UPDATE denies unregistered synthetic connector without writing",
    async () => {
        const repository =
            createRepository();

        const result =
            await repository.updateConfirmedRecord({
                verifiedFacilityId:
                    SYNTHETIC_FACILITY,
                verifiedConnectorId:
                    SYNTHETIC_CONNECTOR,
                recordId:
                    SYNTHETIC_RECORD,
                expectedContentHash:
                    "a".repeat(64),
                contentHash:
                    "b".repeat(64),
                canonicalizationVersion:
                    VERSION,
                semanticContent:
                    semanticContent()
            });

        assert.deepStrictEqual(
            result,
            {
                status: "denied",
                recordId: null
            }
        );
    }
);

test(
    "live confirmed persistence creates, retries, updates, and retries idempotently",
    async () => {
        const repository =
            createRepository();

        const verifiedFacilityId =
            "b74f26b1-cbe9-41fb-b319-5ebda68b1d4c";

        const verifiedConnectorId =
            "f7d170fe-2591-43c1-920b-7014d3eb8a1d";

        const residentId =
            requireEnv("SUPABASE_TEST_RESIDENT_ID");

        const sourceDocumentKey =
            `integration:semantic-persistence:positive:${require("node:crypto").randomUUID()}`;

        const sourceRecordKey =
            "support_record:primary";

        const initialContentHash =
            "c".repeat(64);

        const updatedContentHash =
            "d".repeat(64);

        const initialSemanticContent = {
            semanticType: "support_record",
            fields: {
                supportContent:
                    "synthetic persistence positive test initial"
            },
            customFields: {}
        };

        const updatedSemanticContent = {
            semanticType: "support_record",
            fields: {
                supportContent:
                    "synthetic persistence positive test updated"
            },
            customFields: {}
        };

        const created =
            await repository.createConfirmedRecord({
                verifiedFacilityId,
                verifiedConnectorId,
                residentId,
                sourceDocumentKey,
                sourceRecordKey,
                contentHash:
                    initialContentHash,
                canonicalizationVersion:
                    VERSION,
                semanticContent:
                    initialSemanticContent
            });

        assert.equal(
            created.status,
            "created"
        );

        assert.equal(
            typeof created.recordId,
            "string"
        );

        assert.notEqual(
            created.recordId.trim(),
            ""
        );

        const repeatedCreate =
            await repository.createConfirmedRecord({
                verifiedFacilityId,
                verifiedConnectorId,
                residentId,
                sourceDocumentKey,
                sourceRecordKey,
                contentHash:
                    initialContentHash,
                canonicalizationVersion:
                    VERSION,
                semanticContent:
                    initialSemanticContent
            });

        assert.deepStrictEqual(
            repeatedCreate,
            {
                status: "unchanged",
                recordId:
                    created.recordId
            }
        );

        const updated =
            await repository.updateConfirmedRecord({
                verifiedFacilityId,
                verifiedConnectorId,
                recordId:
                    created.recordId,
                expectedContentHash:
                    initialContentHash,
                contentHash:
                    updatedContentHash,
                canonicalizationVersion:
                    VERSION,
                semanticContent:
                    updatedSemanticContent
            });

        assert.deepStrictEqual(
            updated,
            {
                status: "updated",
                recordId:
                    created.recordId
            }
        );

        const repeatedUpdate =
            await repository.updateConfirmedRecord({
                verifiedFacilityId,
                verifiedConnectorId,
                recordId:
                    created.recordId,
                expectedContentHash:
                    updatedContentHash,
                contentHash:
                    updatedContentHash,
                canonicalizationVersion:
                    VERSION,
                semanticContent:
                    updatedSemanticContent
            });

        assert.deepStrictEqual(
            repeatedUpdate,
            {
                status: "unchanged",
                recordId:
                    created.recordId
            }
        );
    }
);
