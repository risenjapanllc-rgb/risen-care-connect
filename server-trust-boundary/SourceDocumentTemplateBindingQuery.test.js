"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceDocumentTemplateBindingQueryService =
    require("./SourceDocumentTemplateBindingQueryService");

const SupabaseSourceDocumentTemplateBindingQueryRepository =
    require("./SupabaseSourceDocumentTemplateBindingQueryRepository");

const SourceDocumentTemplateBindingQueryHttpAdapter =
    require("./SourceDocumentTemplateBindingQueryHttpAdapter");

const SourceDocumentTemplateBindingQueryTransport =
    require("./SourceDocumentTemplateBindingQueryTransport");


const SNAPSHOT = {
    sourceDocumentKey:
        "document-1",
    sourceUpdatedAt:
        "2026-10-16T10:00:00.000Z",
    sourceSize:
        1234
};


test(
    "query service authenticates connector and scopes binding lookup",
    async () => {
        let repositoryInput = null;

        const service =
            new SourceDocumentTemplateBindingQueryService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status: "verified",
                            verifiedContext: {
                                facilityId:
                                    "facility-1",
                                connectorId:
                                    "connector-verified"
                            }
                        };
                    }
                },

                queryRepository: {
                    async get(input) {
                        repositoryInput =
                            input;

                        return {
                            status: "found",
                            binding: {
                                templateId:
                                    "template-1"
                            }
                        };
                    }
                }
            });

        const result =
            await service.get({
                connectorId:
                    "connector-request",
                credential:
                    "secret",
                ...SNAPSHOT
            });

        assert.equal(
            result.status,
            "found"
        );

        assert.deepEqual(
            repositoryInput,
            {
                verifiedFacilityId:
                    "facility-1",

                verifiedConnectorId:
                    "connector-verified",

                sourceDocumentKey:
                    "document-1",

                sourceUpdatedAt:
                    "2026-10-16T10:00:00.000Z",

                sourceSize:
                    1234
            }
        );
    }
);


test(
    "Supabase repository returns one exact snapshot binding",
    async () => {
        let requestedUrl = null;
        let requestedOptions = null;

        const repository =
            new SupabaseSourceDocumentTemplateBindingQueryRepository({
                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "anon-key",

                accessTokenProvider: {
                    async getAccessToken() {
                        return "access-token";
                    }
                },

                fetchImpl:
                    async (
                        url,
                        options
                    ) => {
                        requestedUrl =
                            url;

                        requestedOptions =
                            options;

                        return {
                            ok: true,

                            async json() {
                                return [
                                    {
                                        template_id:
                                            "template-1",

                                        match_method:
                                            "confirmed_by_human",

                                        match_confidence:
                                            "high",

                                        confirmed_by_human:
                                            true,

                                        confirmed_at:
                                            "2026-10-16T09:00:00.000Z"
                                    }
                                ];
                            }
                        };
                    }
            });

        const result =
            await repository.get({
                verifiedFacilityId:
                    "facility-1",

                verifiedConnectorId:
                    "connector-1",

                ...SNAPSHOT
            });

        assert.equal(
            requestedUrl,
            "https://example.supabase.co/rest/v1/rpc/get_connector_source_document_template_binding"
        );

        assert.equal(
            requestedOptions.method,
            "POST"
        );

        assert.deepEqual(
            JSON.parse(
                requestedOptions.body
            ),
            {
                p_facility_id:
                    "facility-1",

                p_connector_id:
                    "connector-1",

                p_source_document_key:
                    "document-1",

                p_source_updated_at:
                    "2026-10-16T10:00:00.000Z",

                p_source_size:
                    1234
            }
        );

        assert.deepEqual(
            result,
            {
                status: "found",

                binding: {
                    templateId:
                        "template-1",

                    matchMethod:
                        "confirmed_by_human",

                    matchConfidence:
                        "high",

                    confirmedByHuman:
                        true,

                    confirmedAt:
                        "2026-10-16T09:00:00.000Z"
                }
            }
        );
    }
);


test(
    "Supabase repository returns not_found for an unbound snapshot",
    async () => {
        const repository =
            new SupabaseSourceDocumentTemplateBindingQueryRepository({
                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "anon-key",

                accessTokenProvider: {
                    async getAccessToken() {
                        return "access-token";
                    }
                },

                fetchImpl:
                    async () => ({
                        ok: true,

                        async json() {
                            return [];
                        }
                    })
            });

        const result =
            await repository.get({
                verifiedFacilityId:
                    "facility-1",

                verifiedConnectorId:
                    "connector-1",

                ...SNAPSHOT
            });

        assert.deepEqual(
            result,
            {
                status: "not_found",
                binding: null
            }
        );
    }
);


test(
    "query HTTP adapter exposes found binding",
    async () => {
        const adapter =
            new SourceDocumentTemplateBindingQueryHttpAdapter({
                queryService: {
                    async get() {
                        return {
                            status: "found",

                            binding: {
                                templateId:
                                    "template-1",

                                matchMethod:
                                    "confirmed_by_human",

                                matchConfidence:
                                    "high",

                                confirmedByHuman:
                                    true,

                                confirmedAt:
                                    "2026-10-16T09:00:00.000Z"
                            }
                        };
                    }
                }
            });

        const result =
            await adapter.handle({
                requestId:
                    "request-1",

                connectorId:
                    "connector-1",

                credential:
                    "secret",

                ...SNAPSHOT
            });

        assert.equal(
            result.statusCode,
            200
        );

        assert.equal(
            result.body.status,
            "found"
        );

        assert.equal(
            result.body.binding
                .templateId,
            "template-1"
        );
    }
);


test(
    "query transport accepts exact GET snapshot query",
    async () => {
        let adapterInput = null;

        const transport =
            new SourceDocumentTemplateBindingQueryTransport({
                httpAdapter: {
                    async handle(input) {
                        adapterInput =
                            input;

                        return {
                            statusCode: 200,

                            body: {
                                status:
                                    "found",

                                binding: {
                                    templateId:
                                        "template-1"
                                }
                            }
                        };
                    }
                },

                credentialTransport: {
                    extract(value) {
                        return value ===
                            "RISEN-Connector secret"
                            ? "secret"
                            : null;
                    }
                }
            });

        const result =
            await transport.handle({
                method:
                    "GET",

                headers: {
                    "x-risen-connector-id":
                        "connector-1",

                    authorization:
                        "RISEN-Connector secret"
                },

                query: {
                    sourceDocumentKey:
                        "document-1",

                    sourceUpdatedAt:
                        "2026-10-16T10:00:00Z",

                    sourceSize:
                        "1234"
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            result.body.binding
                .templateId,
            "template-1"
        );

        assert.equal(
            adapterInput.connectorId,
            "connector-1"
        );

        assert.equal(
            adapterInput.sourceDocumentKey,
            "document-1"
        );

        assert.equal(
            adapterInput.sourceUpdatedAt,
            "2026-10-16T10:00:00.000Z"
        );

        assert.equal(
            adapterInput.sourceSize,
            1234
        );
    }
);
