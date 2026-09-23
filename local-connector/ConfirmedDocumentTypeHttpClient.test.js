"use strict";

const assert = require("assert");
const ConfirmedDocumentTypeHttpClient = require("./ConfirmedDocumentTypeHttpClient");

const snapshot = {
    sourceDocumentKey: "source-document",
    sourceUpdatedAt: "2026-09-20T12:00:00.000Z",
    sourceSize: 123
};

function createClient(fetchImpl) {
    return new ConfirmedDocumentTypeHttpClient({
        endpoint: "http://127.0.0.1:8787/connector/confirmed-document-type",
        connectorId: "connector-test",
        credential: "test-credential",
        authorizationScheme: "Bearer",
        fetchImpl
    });
}

(async () => {
    let captured;
    const saveClient = createClient(async (url, options) => {
        captured = { url, options };
        return new Response(JSON.stringify({ status: "created" }), {
            status: 200,
            headers: { "content-type": "application/json" }
        });
    });

    const saveResult = await saveClient.save({
        ...snapshot,
        documentType: "recipient_certificate",
        confirmedAt: "2026-09-20T12:01:00.000Z"
    });

    assert.deepStrictEqual(saveResult, { status: "created" });
    assert.strictEqual(captured.options.method, "POST");
    assert.strictEqual(captured.options.headers["content-type"], "application/json");
    assert.strictEqual(captured.options.headers["x-risen-connector-id"], "connector-test");
    assert.strictEqual(captured.options.headers.authorization, "Bearer test-credential");

    const body = JSON.parse(captured.options.body);
    assert.deepStrictEqual(Object.keys(body), ["confirmation"]);
    assert.strictEqual(body.confirmation.documentType, "recipient_certificate");
    assert.strictEqual("facilityId" in body.confirmation, false);

    const getClient = createClient(async (url, options) => {
        captured = { url, options };
        return new Response(JSON.stringify({
            status: "found",
            confirmation: {
                documentType: "recipient_certificate",
                confirmedAt: "2026-09-20T12:01:00.000Z"
            }
        }), {
            status: 200,
            headers: { "content-type": "application/json" }
        });
    });

    const getResult = await getClient.get(snapshot);
    assert.strictEqual(getResult.status, "found");
    assert.strictEqual(getResult.confirmation.documentType, "recipient_certificate");
    assert.strictEqual(captured.options.method, "GET");

    const parsed = new URL(captured.url);
    assert.strictEqual(parsed.searchParams.get("sourceDocumentKey"), snapshot.sourceDocumentKey);
    assert.strictEqual(parsed.searchParams.get("sourceSize"), String(snapshot.sourceSize));
    assert.strictEqual(parsed.searchParams.has("facilityId"), false);

    assert.throws(() => new ConfirmedDocumentTypeHttpClient({
        endpoint: "http://example.com/connector/confirmed-document-type",
        connectorId: "connector-test",
        credential: "test-credential",
        authorizationScheme: "Bearer",
        fetchImpl: async () => {}
    }), /HTTPS endpoint/);

    await assert.rejects(
        () => saveClient.save({
            ...snapshot,
            documentType: "",
            confirmedAt: "2026-09-20T12:01:00.000Z"
        }),
        /confirmed document type is invalid/
    );

    console.log("ConfirmedDocumentTypeHttpClient tests: PASS");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
