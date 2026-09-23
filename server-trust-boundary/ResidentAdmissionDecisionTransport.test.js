"use strict";

const assert = require("assert");
const Transport = require("./ResidentAdmissionDecisionTransport");
const QueryTransport = require("./ResidentAdmissionDecisionQueryTransport");

const credentialTransport = {
    extract(value) {
        return value === "Bearer valid" ? "trusted-credential" : null;
    }
};

let receivedDecision = null;
let receivedQuery = null;

const transport = new Transport({
    credentialTransport,
    httpAdapter: {
        async handle(input) {
            receivedDecision = input;
            return { statusCode: 200, body: { status: "created" } };
        }
    }
});

const queryTransport = new QueryTransport({
    credentialTransport,
    httpAdapter: {
        async handle(input) {
            receivedQuery = input;
            return {
                statusCode: 200,
                body: { status: "found", decisions: [] }
            };
        }
    }
});

const headers = {
    "x-risen-connector-id": "connector-A",
    authorization: "Bearer valid"
};

const decision = {
    sourceDocumentKey: "document-A",
    sourceEntityKey: "subject-A",
    decision: "approved_new",
    reviewedAt: "2026-09-21T02:00:00.000Z",
    sourceUpdatedAt: "2026-09-21T01:00:00.000Z",
    sourceSize: 100
};

(async () => {
    const valid = await transport.handle({
        method: "POST",
        contentType: "application/json",
        headers,
        body: { decision }
    });

    assert.strictEqual(valid.httpStatus, 200);
    assert.strictEqual(receivedDecision.connectorId, "connector-A");
    assert.strictEqual(receivedDecision.decision.facilityId, undefined);

    const injectedFacility = await transport.handle({
        method: "POST",
        contentType: "application/json",
        headers,
        body: {
            decision: {
                ...decision,
                facilityId: "untrusted-facility"
            }
        }
    });

    assert.strictEqual(injectedFacility.httpStatus, 422);

    const invalidDecision = await transport.handle({
        method: "POST",
        contentType: "application/json",
        headers,
        body: {
            decision: {
                ...decision,
                decision: "automatic_create"
            }
        }
    });

    assert.strictEqual(invalidDecision.httpStatus, 422);

    const unauthenticated = await transport.handle({
        method: "POST",
        contentType: "application/json",
        headers: {
            "x-risen-connector-id": "connector-A"
        },
        body: { decision }
    });

    assert.strictEqual(unauthenticated.httpStatus, 401);

    const validQuery = await queryTransport.handle({
        method: "GET",
        headers,
        query: {
            sourceDocumentKey: "document-A",
            sourceUpdatedAt: "2026-09-21T01:00:00.000Z",
            sourceSize: "100"
        }
    });

    assert.strictEqual(validQuery.httpStatus, 200);
    assert.strictEqual(receivedQuery.connectorId, "connector-A");
    assert.strictEqual(receivedQuery.facilityId, undefined);

    const injectedQueryFacility = await queryTransport.handle({
        method: "GET",
        headers,
        query: {
            sourceDocumentKey: "document-A",
            sourceUpdatedAt: "2026-09-21T01:00:00.000Z",
            sourceSize: "100",
            facilityId: "untrusted-facility"
        }
    });

    assert.strictEqual(injectedQueryFacility.httpStatus, 422);

    const unauthenticatedQuery = await queryTransport.handle({
        method: "GET",
        headers: {
            "x-risen-connector-id": "connector-A"
        },
        query: {
            sourceDocumentKey: "document-A",
            sourceUpdatedAt: "2026-09-21T01:00:00.000Z",
            sourceSize: "100"
        }
    });

    assert.strictEqual(unauthenticatedQuery.httpStatus, 401);

    console.log("Resident admission HTTP boundary tests: PASS");
})().catch(error => {
    setImmediate(() => { throw error; });
});
