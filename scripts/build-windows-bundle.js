"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR =
    path.resolve(__dirname, "..");

const OUTPUT_DIR =
    path.join(
        ROOT_DIR,
        "dist",
        "windows",
        "RISEN CARE Connector"
    );

const NODE_RUNTIME_DIR =
    process.env
        .RISEN_WINDOWS_NODE_RUNTIME_DIR ||
    "/tmp/node-v24.18.0-win-x64";

const PRODUCTION_NODE_MODULES =
    process.env
        .RISEN_WINDOWS_NODE_MODULES_DIR ||
    "/tmp/risen-care-connect-windows-production-deps/node_modules";

const CREDENTIAL_HELPER =
    path.join(
        ROOT_DIR,
        "native",
        "windows",
        "risen-credential-helper.exe"
    );

const DIRECT_FILES = [
    "package.json",
    "package-lock.json"
];

const RUNTIME_DIRECTORIES = [
    "local-connector",
    "server-domain"
];

const SCRIPT_FILES = [
    "scripts/connector-credential-available.js",
    "scripts/sync-once.js",
    "scripts/source-document-sync-once.js",
    "scripts/windows-runtime.js"
];

const WINDOWS_FILES = [
    "native/windows/install-user-autostart.ps1",
    "native/windows/start-hidden.vbs",
    "native/windows/stop-runtime.ps1"
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

function isAllowedRuntimeFile(
    sourcePath
) {
    const name =
        path.basename(sourcePath);

    if (name.startsWith(".")) {
        return false;
    }

    if (name.includes(".test.")) {
        return false;
    }

    if (
        FORBIDDEN_PARTS.some(
            part =>
                name.includes(part)
        )
    ) {
        return false;
    }

    return [
        ".js",
        ".html",
        ".json"
    ].includes(
        path.extname(name)
            .toLowerCase()
    );
}

function copyFile(
    source,
    destination
) {
    fs.mkdirSync(
        path.dirname(destination),
        {
            recursive: true
        }
    );

    fs.copyFileSync(
        source,
        destination
    );
}

function copyRelativeFile(
    relativePath
) {
    const source =
        path.join(
            ROOT_DIR,
            relativePath
        );

    if (
        !fs.existsSync(source) ||
        !fs.statSync(source).isFile()
    ) {
        throw new Error(
            `required file missing: ${relativePath}`
        );
    }

    copyFile(
        source,
        path.join(
            OUTPUT_DIR,
            relativePath
        )
    );
}

function copyTree(
    sourceDirectory,
    destinationDirectory,
    filter = () => true
) {
    fs.mkdirSync(
        destinationDirectory,
        {
            recursive: true
        }
    );

    for (
        const entry of
        fs.readdirSync(
            sourceDirectory,
            {
                withFileTypes: true
            }
        )
    ) {
        const sourcePath =
            path.join(
                sourceDirectory,
                entry.name
            );

        const destinationPath =
            path.join(
                destinationDirectory,
                entry.name
            );

        if (entry.isDirectory()) {
            copyTree(
                sourcePath,
                destinationPath,
                filter
            );
            continue;
        }

        if (
            entry.isFile() &&
            filter(sourcePath)
        ) {
            copyFile(
                sourcePath,
                destinationPath
            );
        }
    }
}

function copyRuntimeDirectory(
    relativeDirectory
) {
    const sourceRoot =
        path.join(
            ROOT_DIR,
            relativeDirectory
        );

    if (
        !fs.existsSync(sourceRoot) ||
        !fs.statSync(sourceRoot).isDirectory()
    ) {
        throw new Error(
            `required directory missing: ${relativeDirectory}`
        );
    }

    copyTree(
        sourceRoot,
        path.join(
            OUTPUT_DIR,
            relativeDirectory
        ),
        isAllowedRuntimeFile
    );
}

function assertExternalArtifacts() {
    const nodeExe =
        path.join(
            NODE_RUNTIME_DIR,
            "node.exe"
        );

    const nodeLicense =
        path.join(
            NODE_RUNTIME_DIR,
            "LICENSE"
        );

    if (
        !fs.existsSync(nodeExe)
    ) {
        throw new Error(
            `Windows Node runtime missing: ${nodeExe}`
        );
    }

    if (
        !fs.existsSync(nodeLicense)
    ) {
        throw new Error(
            `Node license missing: ${nodeLicense}`
        );
    }

    if (
        !fs.existsSync(
            PRODUCTION_NODE_MODULES
        )
    ) {
        throw new Error(
            "production node_modules missing"
        );
    }

    if (
        !fs.existsSync(
            CREDENTIAL_HELPER
        )
    ) {
        throw new Error(
            "Windows credential helper missing"
        );
    }
}

function assertBundleClean() {
    const violations = [];

    function inspect(
        directory
    ) {
        for (
            const entry of
            fs.readdirSync(
                directory,
                {
                    withFileTypes: true
                }
            )
        ) {
            const fullPath =
                path.join(
                    directory,
                    entry.name
                );

            if (entry.isDirectory()) {
                inspect(fullPath);
                continue;
            }

            const relative =
                path.relative(
                    OUTPUT_DIR,
                    fullPath
                );

            const name =
                entry.name;

            const isThirdPartyDependency =
                relative === "node_modules" ||
                relative.startsWith(
                    `node_modules${path.sep}`
                );

            if (
                name === ".env" ||
                name.startsWith(".env.") ||
                (
                    !isThirdPartyDependency &&
                    name.includes(".test.")
                ) ||
                (
                    !isThirdPartyDependency &&
                    FORBIDDEN_PARTS.some(
                        part =>
                            name.includes(part)
                    )
                ) ||
                relative.includes(
                    `macos${path.sep}`
                ) ||
                relative.includes(
                    `.git${path.sep}`
                )
            ) {
                violations.push(
                    relative
                );
            }
        }
    }

    inspect(
        OUTPUT_DIR
    );

    if (violations.length > 0) {
        throw new Error(
            "forbidden files in Windows bundle:\n" +
            violations.join("\n")
        );
    }
}

function build() {
    assertExternalArtifacts();

    fs.rmSync(
        OUTPUT_DIR,
        {
            recursive: true,
            force: true
        }
    );

    fs.mkdirSync(
        OUTPUT_DIR,
        {
            recursive: true
        }
    );

    for (
        const file of
        DIRECT_FILES
    ) {
        copyRelativeFile(file);
    }

    for (
        const directory of
        RUNTIME_DIRECTORIES
    ) {
        copyRuntimeDirectory(
            directory
        );
    }

    for (
        const file of
        SCRIPT_FILES
    ) {
        copyRelativeFile(file);
    }

    for (
        const file of
        WINDOWS_FILES
    ) {
        copyRelativeFile(file);
    }

    copyFile(
        path.join(
            NODE_RUNTIME_DIR,
            "node.exe"
        ),
        path.join(
            OUTPUT_DIR,
            "runtime",
            "node.exe"
        )
    );

    copyFile(
        path.join(
            NODE_RUNTIME_DIR,
            "LICENSE"
        ),
        path.join(
            OUTPUT_DIR,
            "runtime",
            "NODE-LICENSE.txt"
        )
    );

    copyTree(
        PRODUCTION_NODE_MODULES,
        path.join(
            OUTPUT_DIR,
            "node_modules"
        )
    );

    copyFile(
        CREDENTIAL_HELPER,
        path.join(
            OUTPUT_DIR,
            "native",
            "windows",
            "risen-credential-helper.exe"
        )
    );

    assertBundleClean();

    process.stdout.write(
        `${OUTPUT_DIR}\n`
    );
}

if (require.main === module) {
    build();
}

module.exports = {
    isAllowedRuntimeFile,
    OUTPUT_DIR
};
