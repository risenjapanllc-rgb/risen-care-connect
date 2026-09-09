"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorCredentialTransport =
    require("./ConnectorCredentialTransport");

test("requires authorization scheme", () => {
    assert.throws(
        () => new ConnectorCredentialTransport(),
        /requires authorizationScheme/
    );
});

test("extracts credential from configured scheme", () => {
    const transport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    assert.strictEqual(
        transport.extract(
            "RISEN-Connector secret-value"
        ),
        "secret-value"
    );
});

test("does not expose scheme as credential material", () => {
    const transport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    assert.strictEqual(
        transport.extract(
            "RISEN-Connector secret-value"
        ),
        "secret-value"
    );
});

test("rejects missing authorization header", () => {
    const transport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    assert.strictEqual(
        transport.extract(),
        null
    );
});

test("rejects header without scheme", () => {
    const transport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    assert.strictEqual(
        transport.extract(
            "secret-value"
        ),
        null
    );
});

test("rejects wrong scheme", () => {
    const transport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    assert.strictEqual(
        transport.extract(
            "Bearer secret-value"
        ),
        null
    );
});

test("rejects empty credential", () => {
    const transport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    assert.strictEqual(
        transport.extract(
            "RISEN-Connector "
        ),
        null
    );
});

test("does not mutate credential material", () => {
    const transport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    const credential =
        "AbC123-_opaque-value";

    assert.strictEqual(
        transport.extract(
            `RISEN-Connector ${credential}`
        ),
        credential
    );
});
