"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sql = fs.readFileSync(
    path.join(
        __dirname,
        "..",
        "docs",
        "sql",
        "2026-09-24-recipient-certificate-atomic-step6.sql"
    ),
    "utf8"
);

test("atomic SQL performs resident work before semantic persistence inside the protected block", () => {
    const admission =
        sql.indexOf("admit_connector_resident");

    const profileFill =
        sql.indexOf("fill_connector_resident_profile");

    const semanticPersistence =
        sql.indexOf(
            "persist_connector_semantic_logical_record"
        );

    const exceptionHandler =
        sql.indexOf(
            "EXCEPTION",
            semanticPersistence
        );

    assert.ok(admission >= 0);
    assert.ok(profileFill >= 0);
    assert.ok(semanticPersistence > admission);
    assert.ok(semanticPersistence > profileFill);
    assert.ok(exceptionHandler > semanticPersistence);
});

test("atomic SQL aborts when semantic persistence is not a success status", () => {
    assert.match(
        sql,
        /IF\s+v_semantic_status\s+NOT\s+IN\s*\(\s*'created'\s*,\s*'updated'\s*,\s*'unchanged'\s*\)\s+THEN/i
    );

    assert.match(
        sql,
        /v_failure_status\s*:=\s*v_semantic_status/i
    );

    assert.match(
        sql,
        /ERRCODE\s*=\s*'P0001'[\s\S]*MESSAGE\s*=\s*'recipient_certificate_atomic_abort'/i
    );
});

test("atomic SQL absorbs only its deliberate abort and rethrows other P0001 errors", () => {
    assert.match(
        sql,
        /WHEN\s+SQLSTATE\s+'P0001'\s+THEN/i
    );

    assert.match(
        sql,
        /IF\s+SQLERRM\s+<>\s+'recipient_certificate_atomic_abort'\s+THEN\s+RAISE\s*;\s+END\s+IF/i
    );
});

test("atomic SQL returns failure only after leaving the exception block", () => {
    const exceptionBlock =
        sql.indexOf("EXCEPTION");

    const blockEnd =
        sql.indexOf("END;", exceptionBlock);

    const failureReturn =
        sql.indexOf(
            "IF v_failure_status IS NOT NULL THEN",
            blockEnd
        );

    assert.ok(exceptionBlock >= 0);
    assert.ok(blockEnd > exceptionBlock);
    assert.ok(failureReturn > blockEnd);
});
