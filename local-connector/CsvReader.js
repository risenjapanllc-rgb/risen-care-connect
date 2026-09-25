"use strict";

const fs = require("node:fs/promises");

class CsvReader {
    async read(filePath) {
        if (
            typeof filePath !== "string" ||
            filePath.trim() === ""
        ) {
            throw new Error(
                "CSV file is required"
            );
        }

        const text =
            await fs.readFile(
                filePath,
                "utf8"
            );

        const rows =
            this.parse(text);

        return {
            sheetNames: ["csv"],
            sheets: [
                {
                    sheetName: "csv",
                    rows
                }
            ]
        };
    }

    parse(
        text,
        {
            delimiter = ","
        } = {}
    ) {
        if (
            typeof delimiter !== "string" ||
            delimiter.length !== 1 ||
            delimiter === "\"" ||
            delimiter === "\r" ||
            delimiter === "\n"
        ) {
            throw new TypeError(
                "CSV delimiter must be a single non-record character"
            );
        }

        const rows = [];
        let row = [];
        let field = "";
        let quoted = false;

        for (
            let index = 0;
            index < text.length;
            index += 1
        ) {
            const character =
                text[index];

            if (quoted) {
                if (character === '"') {
                    if (
                        text[index + 1] === '"'
                    ) {
                        field += '"';
                        index += 1;
                    } else {
                        quoted = false;
                    }
                } else {
                    field += character;
                }

                continue;
            }

            if (character === '"') {
                quoted = true;
                continue;
            }

            if (character === delimiter) {
                row.push(field);
                field = "";
                continue;
            }

            if (
                character === "\n" ||
                character === "\r"
            ) {
                if (
                    character === "\r" &&
                    text[index + 1] === "\n"
                ) {
                    index += 1;
                }

                row.push(field);
                rows.push(row);
                row = [];
                field = "";
                continue;
            }

            field += character;
        }

        if (quoted) {
            throw new Error(
                "CSV contains an unterminated quoted field"
            );
        }

        if (
            field !== "" ||
            row.length > 0
        ) {
            row.push(field);
            rows.push(row);
        }

        if (
            rows.length > 0 &&
            rows[0].length > 0
        ) {
            rows[0][0] =
                rows[0][0].replace(
                    /^\uFEFF/,
                    ""
                );
        }

        return rows;
    }
}

module.exports = CsvReader;
