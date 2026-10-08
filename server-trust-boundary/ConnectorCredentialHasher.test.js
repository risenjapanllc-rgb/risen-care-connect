"use strict";

const assert =
    require("node:assert/strict");

const test =
    require("node:test");

const ConnectorCredentialHasher =
    require("./ConnectorCredentialHasher");

test(
    "hashes credential as lowercase SHA-256 hex",
    () => {
        const hasher =
            new ConnectorCredentialHasher();

        assert.strictEqual(
            hasher.hash("abc"),
            "ba7816bf8f01cfea414140de5dae2223" +
            "b00361a396177a9cb410ff61f20015ad"
        );
    }
);
