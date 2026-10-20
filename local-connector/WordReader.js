"use strict";

const mammoth =
    require("mammoth");

class WordReader {
    async read(filePath) {
        if (
            typeof filePath !== "string" ||
            filePath.trim() === ""
        ) {
            throw new Error(
                "Wordファイルが指定されていません"
            );
        }

        const [
            rawTextResult,
            htmlResult
        ] =
            await Promise.all([
                mammoth.extractRawText({
                    path: filePath
                }),

                mammoth.convertToHtml({
                    path: filePath
                })
            ]);

        return {
            text:
                rawTextResult.value,

            html:
                htmlResult.value,

            messages:
                rawTextResult.messages
        };
    }
}

module.exports =
    WordReader;
