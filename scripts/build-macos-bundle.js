"use strict";

const fs =
    require("node:fs");

const path =
    require("node:path");

const ROOT =
    path.resolve(
        __dirname,
        ".."
    );

const OUTPUT =
    path.join(
        ROOT,
        "dist",
        "macos",
        "RISEN CARE Connector"
    );

const NODE_BIN =
    process.env.RISEN_MAC_NODE_BIN ||
    process.execPath;

const HELPER =
    path.join(
        ROOT,
        "native",
        "macos",
        "risen-keychain-helper"
    );

const SOURCE_DIRS = [
    "local-connector",
    "server-domain"
];

const SCRIPT_FILES = [
    "scripts/connector-credential-available.js",
    "scripts/sync-once.js",
    "scripts/source-document-sync-once.js",
    "scripts/production-local-runtime.sh"
];

const DIRECT_FILES = [
    "package.json",
    "package-lock.json"
];

const FORBIDDEN_PARTS = [
    ".before-",
    ".pre-",
    ".backup",
    ".initial-",
    ".retry-",
    ".timeout-",
    ".mobile-",
    ".no-context-"
];

function ensureDir(p) {
    fs.mkdirSync(
        p,
        {
            recursive: true
        }
    );
}

function copyFile(
    src,
    dst
) {
    ensureDir(
        path.dirname(dst)
    );

    fs.copyFileSync(
        src,
        dst
    );
}

function allowedFirstPartyFile(
    sourcePath
) {
    const name =
        path.basename(
            sourcePath
        );

    if (
        name.startsWith(".") ||
        name.includes(".test.") ||
        FORBIDDEN_PARTS.some(
            part =>
                name.includes(part)
        )
    ) {
        return false;
    }

    return [
        ".js",
        ".json",
        ".html",
        ".sh"
    ].includes(
        path.extname(name)
            .toLowerCase()
    );
}

function copyTree(
    src,
    dst,
    filter = () => true
) {
    ensureDir(dst);

    for (
        const entry of
        fs.readdirSync(
            src,
            {
                withFileTypes: true
            }
        )
    ) {
        const from =
            path.join(
                src,
                entry.name
            );

        const to =
            path.join(
                dst,
                entry.name
            );

        if (
            entry.name === ".DS_Store" ||
            entry.name.startsWith("._")
        ) {
            continue;
        }

        if (
            entry.name === ".DS_Store" ||
            entry.name.startsWith("._")
        ) {
            continue;
        }

        if (
            entry.isDirectory()
        ) {
            copyTree(
                from,
                to,
                filter
            );

            continue;
        }

        if (
            entry.isFile() &&
            filter(from)
        ) {
            copyFile(
                from,
                to
            );
        }
    }
}

function assertFile(
    filePath,
    label
) {
    if (
        !fs.existsSync(filePath) ||
        !fs.statSync(filePath)
            .isFile()
    ) {
        throw new Error(
            `${label} missing: ${filePath}`
        );
    }
}

function build() {
    assertFile(
        NODE_BIN,
        "Node runtime"
    );

    assertFile(
        HELPER,
        "macOS Keychain helper"
    );

    fs.rmSync(
        OUTPUT,
        {
            recursive: true,
            force: true
        }
    );

    ensureDir(
        OUTPUT
    );

    for (
        const relative of
        DIRECT_FILES
    ) {
        copyFile(
            path.join(
                ROOT,
                relative
            ),
            path.join(
                OUTPUT,
                relative
            )
        );
    }

    for (
        const relative of
        SOURCE_DIRS
    ) {
        copyTree(
            path.join(
                ROOT,
                relative
            ),
            path.join(
                OUTPUT,
                relative
            ),
            allowedFirstPartyFile
        );
    }

    for (
        const relative of
        SCRIPT_FILES
    ) {
        copyFile(
            path.join(
                ROOT,
                relative
            ),
            path.join(
                OUTPUT,
                relative
            )
        );
    }

    copyTree(
        path.join(
            ROOT,
            "node_modules"
        ),
        path.join(
            OUTPUT,
            "node_modules"
        )
    );

    copyFile(
        NODE_BIN,
        path.join(
            OUTPUT,
            "runtime",
            "node"
        )
    );

    copyFile(
        HELPER,
        path.join(
            OUTPUT,
            "native",
            "macos",
            "risen-keychain-helper"
        )
    );

    fs.chmodSync(
        path.join(
            OUTPUT,
            "runtime",
            "node"
        ),
        0o755
    );

    fs.chmodSync(
        path.join(
            OUTPUT,
            "native",
            "macos",
            "risen-keychain-helper"
        ),
        0o755
    );

    fs.chmodSync(
        path.join(
            OUTPUT,
            "scripts",
            "production-local-runtime.sh"
        ),
        0o755
    );

    console.log(
        OUTPUT
    );
}

build();
