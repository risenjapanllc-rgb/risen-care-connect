"use strict";

const assert =
    require("node:assert/strict");

const test =
    require("node:test");

const ConnectorCredentialGenerator =
    require("./ConnectorCredentialGenerator");

test(
    "generates a high-entropy base64url connector credential",
    () => {
        const generator =
            new ConnectorCredentialGenerator();

        const first =
            generator.generate();

        const second =
            generator.generate();

        assert.match(
            first,
            /^[A-Za-z0-9_-]{43}$/
        );

        assert.match(
            second,
            /^[A-Za-z0-9_-]{43}$/
        );

        assert.notStrictEqual(
            first,
            second
        );
    }
);
