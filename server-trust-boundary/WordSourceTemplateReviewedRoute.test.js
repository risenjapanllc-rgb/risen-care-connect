"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createServerTrustBoundaryApp
} =
    require("./createServerTrustBoundaryApp");

const ConnectorCredentialTransport =
    require("./ConnectorCredentialTransport");

const WordSourceTemplateReviewedPayloadValidator =
    require("./WordSourceTemplateReviewedPayloadValidator");

const WordSourceTemplateReviewedIngestionService =
    require("./WordSourceTemplateReviewedIngestionService");

const WordSourceTemplateReviewedHttpAdapter =
    require("./WordSourceTemplateReviewedHttpAdapter");

const WordSourceTemplateReviewedTransport =
    require("./WordSourceTemplateReviewedTransport");


async function withServer(
    app,
    fn
) {
    const server =
        app.listen(
            0,
            "127.0.0.1"
        );

    await new Promise(
        (resolve, reject) => {
            server.once(
                "listening",
                resolve
            );

            server.once(
                "error",
                reject
            );
        }
    );

    try {
        const address =
            server.address();

        const baseUrl =
            `http://127.0.0.1:${address.port}`;

        await fn(baseUrl);
    } finally {
        await new Promise(
            resolve => {
                server.close(
                    resolve
                );
            }
        );
    }
}


function createBaseTransport() {
    return {
        async handle() {
            return {
                httpStatus: 200,
                body: {
                    status: "unused"
                }
            };
        },

        createErrorResponse({
            httpStatus,
            errorCode
        }) {
            return {
                httpStatus,
                body: {
                    requestId:
                        "base-request-id",
                    errorCode
                }
            };
        }
    };
}


test(
    "invalid reviewed Word structure returns 422 before persistence",
    async () => {
        let persistenceCalls = 0;

        const connectorTrustService = {
            async authenticate({
                connectorId,
                credential
            } = {}) {
                assert.strictEqual(
                    connectorId,
                    "connector-id"
                );

                assert.strictEqual(
                    credential,
                    "secret-value"
                );

                return {
                    status: "verified",

                    verifiedContext: {
                        facilityId:
                            "facility-id",

                        connectorId:
                            "connector-id"
                    }
                };
            }
        };

        const persistenceRepository = {
            async register() {
                persistenceCalls += 1;

                throw new Error(
                    "persistence must not be called"
                );
            }
        };

        const payloadValidator =
            new WordSourceTemplateReviewedPayloadValidator();

        const ingestionService =
            new WordSourceTemplateReviewedIngestionService({
                connectorTrustService,
                payloadValidator,
                persistenceRepository
            });

        const httpAdapter =
            new WordSourceTemplateReviewedHttpAdapter({
                ingestionService
            });

        const credentialTransport =
            new ConnectorCredentialTransport({
                authorizationScheme:
                    "RISEN-Connector"
            });

        const wordSourceTemplateReviewedTransport =
            new WordSourceTemplateReviewedTransport({
                httpAdapter,
                credentialTransport
            });

        const app =
            createServerTrustBoundaryApp({
                transport:
                    createBaseTransport(),

                wordSourceTemplateReviewedTransport
            });

        await withServer(
            app,
            async baseUrl => {
                const response =
                    await fetch(
                        `${baseUrl}/connector/source-templates/word-reviewed`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "X-RISEN-Connector-Id":
                                    "connector-id",

                                "Authorization":
                                    "RISEN-Connector secret-value"
                            },

                            body:
                                JSON.stringify({
                                    wordSourceTemplateReviewed: {
                                        sourceDocumentKey:
                                            "source-document-key",

                                        sourceUpdatedAt:
                                            "2026-10-21T09:00:00.000Z",

                                        sourceSize:
                                            15775,

                                        displayName:
                                            "sample.docx",

                                        documentType:
                                            null,

                                        fields: [
                                            {
                                                templateFieldKey:
                                                    "word:table:9:row:9",

                                                structuralPath:
                                                    "word:table:9:row:9",

                                                tableIndex:
                                                    2,

                                                rowIndex:
                                                    0,

                                                headerLabel:
                                                    "氏名",

                                                normalizedHeaderLabel:
                                                    "氏名"
                                            }
                                        ],

                                        confirmedByHuman:
                                            true,

                                        confirmedAt:
                                            "2026-10-21T09:00:00.000Z"
                                    }
                                })
                        }
                    );

                assert.strictEqual(
                    response.status,
                    422
                );

                const body =
                    await response.json();

                assert.strictEqual(
                    body.status,
                    "invalid"
                );

                assert.strictEqual(
                    body.errorCode,
                    "word_source_template_field_identity_invalid"
                );
            }
        );

        assert.strictEqual(
            persistenceCalls,
            0
        );
    }
);
