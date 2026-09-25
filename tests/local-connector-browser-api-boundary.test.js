"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const browserSource = fs.readFileSync(
    path.join(
        __dirname,
        "..",
        "js",
        "local-connector.js"
    ),
    "utf8"
);

test(
    "recipient certificate semantic contract is loaded from the Local Connector API boundary",
    () => {
        assert.match(
            browserSource,
            /fetch\(\s*`\$\{LOCAL_CONNECTOR_BASE\}\/semantic-contracts\/recipient-certificate`\s*\)/,
            [
                "The browser must load the recipient certificate semantic contract",
                "from LOCAL_CONNECTOR_BASE.",
                "A relative URL would incorrectly target the web UI origin",
                "instead of the Local Connector."
            ].join(" ")
        );
    }
);
