"use strict";

class SourceTemplateFieldsHttpAdapter {
    constructor({
        ingestionService
    } = {}) {
        if (
            !ingestionService ||
            typeof ingestionService.ingest !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateFieldsHttpAdapter requires ingestionService"
            );
        }

        this.ingestionService =
            ingestionService;
    }

    async handle({
        requestId,
        connectorId,
        credential,
        sourceTemplateFields
    } = {}) {
        const result =
            await this.ingestionService
                .ingest({
                    connectorId,
                    credential,
                    sourceTemplateFields
                });

        if (
            [
                "created",
                "unchanged",
                "conflict"
            ].includes(result?.status)
        ) {
            return {
                statusCode: 200,
                body: {
                    status:
                        result.status,
                    templateId:
                        result.templateId
                }
            };
        }

        if (result?.status === "denied") {
            return {
                statusCode: 401,
                body: {
                    requestId,
                    status: "denied",
                    errorCode:
                        "connector_trust_denied"
                }
            };
        }

        if (result?.status === "invalid") {
            return {
                statusCode: 422,
                body: {
                    requestId,
                    status: "invalid",
                    errorCode:
                        "source_template_fields_invalid"
                }
            };
        }

        return {
            statusCode: 503,
            body: {
                requestId,
                status: "error",
                errorCode:
                    "connector_processing_unavailable"
            }
        };
    }
}

module.exports =
    SourceTemplateFieldsHttpAdapter;
