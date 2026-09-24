"use strict";

class JapaneseBusinessDateNormalizer {
    normalize(value, options = {}) {
        const text =
            value === null || value === undefined
                ? ""
                : String(value).trim();

        if (text === "") {
            return "";
        }

        const iso =
            this.parseIso(text);

        if (iso) {
            return iso;
        }

        const japaneseEra =
            this.parseJapaneseEra(text);

        if (japaneseEra) {
            return japaneseEra;
        }

        const western =
            this.parseWesternNumeric(
                text,
                options
            );

        if (western) {
            return western;
        }

        return text;
    }

    parseIso(text) {
        const match =
            text.match(
                /^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/
            );

        if (!match) {
            return null;
        }

        return this.toIso(
            Number(match[1]),
            Number(match[2]),
            Number(match[3])
        );
    }

    parseJapaneseEra(text) {
        const match =
            text.match(
                /^(明治|明|M|大正|大|T|昭和|昭|S|平成|平|H|令和|令|R)(元|\d{1,2})[\/.-](\d{1,2})[\/.-](\d{1,2})$/i
            );

        if (!match) {
            return null;
        }

        const era =
            match[1].toUpperCase();
        const eraYear =
            match[2] === "元"
                ? 1
                : Number(match[2]);

        const starts = {
            "明治": 1867,
            "明": 1867,
            "M": 1867,
            "大正": 1911,
            "大": 1911,
            "T": 1911,
            "昭和": 1925,
            "昭": 1925,
            "S": 1925,
            "平成": 1988,
            "平": 1988,
            "H": 1988,
            "令和": 2018,
            "令": 2018,
            "R": 2018
        };

        return this.toIso(
            starts[era] + eraYear,
            Number(match[3]),
            Number(match[4])
        );
    }

    parseWesternNumeric(text, options) {
        const match =
            text.match(
                /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2})$/
            );

        if (!match) {
            return null;
        }

        if (options.order !== "mdy") {
            return null;
        }

        const shortYear =
            Number(match[3]);

        let year = null;

        if (
            Number.isInteger(
                options.twoDigitYearBase
            )
        ) {
            year =
                options.twoDigitYearBase +
                shortYear;
        } else if (
            Number.isInteger(
                options.twoDigitYearPivot
            )
        ) {
            year =
                shortYear <=
                options.twoDigitYearPivot
                    ? 2000 + shortYear
                    : 1900 + shortYear;
        }

        if (!Number.isInteger(year)) {
            return null;
        }

        return this.toIso(
            year,
            Number(match[1]),
            Number(match[2])
        );
    }

    toIso(year, month, day) {
        if (
            !Number.isInteger(year) ||
            !Number.isInteger(month) ||
            !Number.isInteger(day) ||
            year < 1 ||
            month < 1 ||
            month > 12 ||
            day < 1 ||
            day > 31
        ) {
            return null;
        }

        const date =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day
                )
            );

        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            return null;
        }

        return (
            String(year).padStart(4, "0") +
            "-" +
            String(month).padStart(2, "0") +
            "-" +
            String(day).padStart(2, "0")
        );
    }
}

module.exports =
    JapaneseBusinessDateNormalizer;
