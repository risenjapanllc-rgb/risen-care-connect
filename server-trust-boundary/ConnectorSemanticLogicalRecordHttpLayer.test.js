"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Adapter =
    require("./ConnectorSemanticLogicalRecordHttpAdapter");
const Transport =
    require("./ConnectorSemanticLogicalRecordTransport");

function createTransport(lookup) {
    const adapter = new Adapter({
        service: { lookup }
    });

    return new Transport({
        httpAdapter: adapter,
        credentialTransport: {
            extract(value) {
                return value === "RISEN-Connector secret"
                    ? "secret"
                    : null;
            }
        }
    });
}

test("trusted request forwards only logical identity fields", async () => {
    let received = null;

    const transport = createTransport(async input => {
        received = input;
        return {
            status: "not_found",
            record: null
        };
    });

    const result = await transport.handle({
        method: "POST",
        headers: {
            "x-risen-connector-id": "connector-1",
            authorization: "RISEN-Connector secret"
        },
        contentType: "application/json",
        body: {
            residentId: "resident-1",
            semanticType: "recipient_certificate",
            logicalSlot: "primary"
        }
    });

    assert.equal(result.httpStatus, 200);
    assert.equal(result.body.status, "not_found");
    assert.equal(received.connectorId, "connector-1");
    assert.equal(received.residentId, "resident-1");
    assert.equal(received.semanticType, "recipient_certificate");
    assert.equal(received.logicalSlot, "primary");
    assert.equal("facilityId" in received, false);
});

test("request cannot inject facility scope", async () => {
    const transport = createTransport(async () => {
        throw new Error("must not be called");
    });

    const result = await transport.handle({
        method: "POST",
        headers: {
            "x-risen-connector-id": "connector-1",
            authorization: "RISEN-Connector secret"
        },
        contentType: "application/json",
        body: {
            residentId: "resident-1",
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            facilityId: "facility-injected"
        }
    });

    assert.equal(result.httpStatus, 422);
    assert.equal(result.body.errorCode, "semantic_logical_record_invalid");
});

test("missing connector credential is denied", async () => {
    const transport = createTransport(async () => {
        throw new Error("must not be called");
    });

    const result = await transport.handle({
        method: "POST",
        headers: {
            "x-risen-connector-id": "connector-1"
        },
        contentType: "application/json",
        body: {
            residentId: "resident-1",
            semanticType: "recipient_certificate",
            logicalSlot: "primary"
        }
    });

    assert.equal(result.httpStatus, 401);
    assert.equal(result.body.errorCode, "connector_trust_denied");
});
