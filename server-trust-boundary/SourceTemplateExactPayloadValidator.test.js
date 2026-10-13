"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceTemplateExactPayloadValidator =
    require("./SourceTemplateExactPayloadValidator");

function validInput() {
    return {
        displayName:
            "利用者台帳",
        fileType:
            "csv",
        documentType:
            "resident_master",
        structureFingerprint:
            "a".repeat(64),
        canonicalizationVersion:
            "risen-source-template-canonicalization-1",
        canonicalStructure: {
            type:
                "csv",
            fields: [
                {
                    columnIndex: 0,
                    headerLabel:
                        "利用者番号"
                }
            ]
        }
    };
}

test(
    "accepts exact source template payload",
    () => {
        const validator =
            new SourceTemplateExactPayloadValidator();

        const result =
            validator.validate(
                validInput()
            );

        assert.equal(
            result.status,
            "valid"
        );

        assert.equal(
            result.validatedSourceTemplateExact
                .fileType,
            "csv"
        );
    }
);

test(
    "allows nullable document type",
    () => {
        const validator =
            new SourceTemplateExactPayloadValidator();

        const result =
            validator.validate({
                ...validInput(),
                documentType: null
            });

        assert.equal(
            result.status,
            "valid"
        );
    }
);

test(
    "rejects unsupported source type",
    () => {
        const validator =
            new SourceTemplateExactPayloadValidator();

        const result =
            validator.validate({
                ...validInput(),
                fileType: "word"
            });

        assert.deepEqual(
            result,
            {
                status: "invalid",
                errorCode:
                    "file_type_invalid"
            }
        );
    }
);

test(
    "rejects malformed fingerprint",
    () => {
        const validator =
            new SourceTemplateExactPayloadValidator();

        const result =
            validator.validate({
                ...validInput(),
                structureFingerprint:
                    "not-a-fingerprint"
            });

        assert.equal(
            result.status,
            "invalid"
        );
    }
);
