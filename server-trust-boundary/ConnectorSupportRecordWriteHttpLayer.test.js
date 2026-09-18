"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Adapter =
    require("./ConnectorSupportRecordWriteHttpAdapter");
const Transport =
    require("./ConnectorSupportRecordWriteTransport");

function createTransport(result) {
    const calls = [];

    const adapter =
        new Adapter({
            writeService: {
                async write(input) {
                    calls.push(input);
                    return result;
                }
            }
        });

    return {
        calls,
        transport:
            new Transport({
                httpAdapter: adapter,
                credentialTransport: {
                    extract(value) {
                        return value ===
                            "RISEN-Connector secret"
                            ? "secret"
                            : null;
                    }
                }
            })
    };
}

function request(operation = {
    action: "create"
}) {
    return {
        method: "POST",
        contentType:
            "application/json",
        headers: {
            authorization:
                "RISEN-Connector secret",
            "x-risen-connector-id":
                "connector-input"
        },
        body: {
            operation
        }
    };
}

test(
    "valid request reaches write service without facility authority in body",
    async () => {
        const { transport, calls } =
            createTransport({
                status: "created"
            });

        const result =
            await transport.handle(
                request({
                    action: "create"
                })
            );

        assert.equal(
            result.httpStatus,
            200
        );
        assert.equal(
            calls.length,
            1
        );
        assert.equal(
            calls[0].connectorId,
            "connector-input"
        );
        assert.equal(
            Object.prototype.hasOwnProperty.call(
                calls[0],
                "facilityId"
            ),
            false
        );
    }
);

test(
    "extra body authority is rejected before service",
    async () => {
        const { transport, calls } =
            createTransport({
                status: "created"
            });

        const input = request();

        input.body.facilityId =
            "facility-untrusted";

        const result =
            await transport.handle(input);

        assert.equal(
            result.httpStatus,
            422
        );
        assert.equal(
            calls.length,
            0
        );
    }
);

test(
    "missing credential is denied before service",
    async () => {
        const { transport, calls } =
            createTransport({
                status: "created"
            });

        const input = request();

        input.headers.authorization =
            "wrong";

        const result =
            await transport.handle(input);

        assert.equal(
            result.httpStatus,
            401
        );
        assert.equal(
            calls.length,
            0
        );
    }
);

test(
    "conflict becomes 409",
    async () => {
        const { transport } =
            createTransport({
                status: "conflict"
            });

        const result =
            await transport.handle(
                request()
            );

        assert.equal(
            result.httpStatus,
            409
        );
        assert.equal(
            result.body.status,
            "conflict"
        );
    }
);

test(
    "resident mismatch becomes 409",
    async () => {
        const { transport } =
            createTransport({
                status:
                    "resident_mismatch"
            });

        const result =
            await transport.handle(
                request()
            );

        assert.equal(
            result.httpStatus,
            409
        );
    }
);

test(
    "internal error becomes safe 503",
    async () => {
        const { transport } =
            createTransport({
                status: "error",
                errorCode:
                    "private_internal_detail"
            });

        const result =
            await transport.handle(
                request()
            );

        assert.equal(
            result.httpStatus,
            503
        );
        assert.equal(
            result.body.errorCode,
            "connector_processing_unavailable"
        );
        assert.equal(
            JSON.stringify(result.body)
                .includes(
                    "private_internal_detail"
                ),
            false
        );
    }
);
