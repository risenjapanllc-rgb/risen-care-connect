"use strict";

const SourceDocumentPersistenceRepository =
    require("../server-domain/storage/SourceDocumentPersistenceRepository");

class SupabaseSourceDocumentPersistenceRepository
    extends SourceDocumentPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSourceDocumentPersistenceRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSourceDocumentPersistenceRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseSourceDocumentPersistenceRepository requires accessTokenProvider"
            );
        }

        this.supabaseUrl =
            String(supabaseUrl)
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            String(apiKey).trim();

        this.accessTokenProvider =
            accessTokenProvider;
    }

    createHttpError(message, response, phase = null) {
        const error =
            new Error(message);

        error.httpStatus =
            response &&
            Number.isInteger(response.status)
                ? response.status
                : null;

        error.persistencePhase =
            typeof phase === "string" &&
            phase.trim()
                ? phase.trim()
                : null;

        return error;
    }

    async upsert(input = {}) {
        const validation =
            await super.upsert(input)
                .catch((error) => error);

        if (
            validation &&
            validation.status === "invalid"
        ) {
            return validation;
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase source document persistence requires access token"
            );
        }

        const serializedContent =
            JSON.stringify(
                input.sourceContent
            );

        const storageSize =
            Buffer.byteLength(
                serializedContent,
                "utf8"
            );

        const prepareResponse =
            await fetch(
                `${this.supabaseUrl}/functions/v1/connector-source-document-upload`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "apikey":
                            this.apiKey,
                        "Authorization":
                            `Bearer ${accessToken}`
                    },
                    body:
                        JSON.stringify({
                            facilityId:
                                input.verifiedFacilityId,
                            connectorId:
                                input.verifiedConnectorId,
                            sourceDocumentKey:
                                input.sourceDocumentKey,
                            sourceUpdatedAt:
                                input.sourceUpdatedAt,
                            sourceSize:
                                input.sourceSize
                        })
                }
            );

        if (!prepareResponse.ok) {
            throw this.createHttpError(
                "Supabase source document storage prepare failed",
                prepareResponse,
                "prepare"
            );
        }

        const prepared =
            await prepareResponse.json();

        if (
            !prepared ||
            typeof prepared !== "object" ||
            Array.isArray(prepared) ||
            prepared.bucket !==
                "connector-source-documents" ||
            typeof prepared.path !== "string" ||
            !prepared.path.trim() ||
            typeof prepared.signedUrl !== "string" ||
            !prepared.signedUrl.trim()
        ) {
            throw new Error(
                "Supabase source document storage prepare returned invalid result"
            );
        }

        let signedUploadUrl;

        try {
            signedUploadUrl =
                new URL(
                    prepared.signedUrl,
                    this.supabaseUrl
                );
        } catch {
            throw new Error(
                "Supabase source document storage prepare returned invalid signed URL"
            );
        }

        const supabaseOrigin =
            new URL(
                this.supabaseUrl
            ).origin;

        if (
            signedUploadUrl.origin !==
                supabaseOrigin ||
            !signedUploadUrl.pathname.startsWith(
                "/storage/v1/"
            )
        ) {
            throw new Error(
                "Supabase source document storage prepare returned invalid signed URL"
            );
        }

        const uploadResponse =
            await fetch(
                signedUploadUrl.toString(),
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        serializedContent
                }
            );

        if (!uploadResponse.ok) {
            throw this.createHttpError(
                "Supabase source document storage upload failed",
                uploadResponse,
                "upload"
            );
        }

        const finalizeResponse =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/finalize_connector_source_document_storage`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "apikey":
                            this.apiKey,
                        "Authorization":
                            `Bearer ${accessToken}`
                    },
                    body:
                        JSON.stringify({
                            p_facility_id:
                                input.verifiedFacilityId,
                            p_connector_id:
                                input.verifiedConnectorId,
                            p_source_document_key:
                                input.sourceDocumentKey,
                            p_source_type:
                                input.sourceType,
                            p_file_name:
                                input.fileName,
                            p_source_updated_at:
                                input.sourceUpdatedAt,
                            p_source_size:
                                input.sourceSize,
                            p_observed_at:
                                input.observedAt,
                            p_storage_bucket:
                                prepared.bucket,
                            p_storage_path:
                                prepared.path,
                            p_storage_size:
                                storageSize
                        })
                }
            );

        if (!finalizeResponse.ok) {
            throw this.createHttpError(
                "Supabase source document storage finalize failed",
                finalizeResponse,
                "finalize"
            );
        }

        const result =
            await finalizeResponse.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1
        ) {
            throw new Error(
                "Supabase source document persistence returned invalid result"
            );
        }

        const row =
            result[0];

        const allowedStatuses =
            new Set([
                "created",
                "updated",
                "unchanged",
                "denied"
            ]);

        if (
            !row ||
            typeof row !== "object" ||
            typeof row.status !== "string" ||
            !allowedStatuses.has(row.status)
        ) {
            throw new Error(
                "Supabase source document persistence returned invalid status"
            );
        }

        return {
            status:
                row.status
        };
    }
}

module.exports =
    SupabaseSourceDocumentPersistenceRepository;
