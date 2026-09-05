"use strict";

class SemanticContentCanonicalizer {
    canonicalize(semanticContent) {
        this.assertPlainObject(semanticContent, "semanticContent");
        this.assertExactKeys(
            semanticContent,
            ["semanticType", "fields", "customFields"],
            "semanticContent"
        );

        if (semanticContent.semanticType !== "support_record") {
            throw new TypeError("semanticType must be support_record");
        }

        this.assertPlainObject(semanticContent.fields, "fields");
        this.assertExactKeys(semanticContent.fields, ["supportContent"], "fields");
        if (typeof semanticContent.fields.supportContent !== "string") {
            throw new TypeError("supportContent must be a string");
        }

        this.assertPlainObject(semanticContent.customFields, "customFields");
        this.assertExactKeys(semanticContent.customFields, [], "customFields");

        const canonicalSemanticContent = {
            semanticType: "support_record",
            fields: {
                supportContent: semanticContent.fields.supportContent
            },
            customFields: {}
        };

        return {
            canonicalSemanticContent,
            canonicalString: JSON.stringify(canonicalSemanticContent)
        };
    }

    assertPlainObject(value, name) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new TypeError(`${name} must be a plain object`);
        }

        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
            throw new TypeError(`${name} must be a plain object`);
        }
    }

    assertExactKeys(object, allowedKeys, name) {
        const keys = Object.keys(object);
        if (
            keys.length !== allowedKeys.length ||
            keys.some((key) => !allowedKeys.includes(key))
        ) {
            throw new TypeError(`${name} has unsupported fields`);
        }
    }
}

module.exports = SemanticContentCanonicalizer;