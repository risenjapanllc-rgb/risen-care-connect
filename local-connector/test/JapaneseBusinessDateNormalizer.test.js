"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const JapaneseBusinessDateNormalizer =
    require("../JapaneseBusinessDateNormalizer");

const normalizer =
    new JapaneseBusinessDateNormalizer();

test("normalizes western four digit dates", () => {
    assert.equal(
        normalizer.normalize("1966/01/31"),
        "1966-01-31"
    );

    assert.equal(
        normalizer.normalize("1966-1-31"),
        "1966-01-31"
    );
});

test("normalizes explicit Japanese era dates", () => {
    assert.equal(
        normalizer.normalize("S41/01/31"),
        "1966-01-31"
    );

    assert.equal(
        normalizer.normalize("昭和41/01/31"),
        "1966-01-31"
    );

    assert.equal(
        normalizer.normalize("昭41/01/31"),
        "1966-01-31"
    );

    assert.equal(
        normalizer.normalize("H12/08/05"),
        "2000-08-05"
    );

    assert.equal(
        normalizer.normalize("R6/04/01"),
        "2024-04-01"
    );
});

test("normalizes explicit MDY two digit western years only with supplied century", () => {
    assert.equal(
        normalizer.normalize(
            "3/27/84",
            {
                order: "mdy",
                twoDigitYearBase: 1900
            }
        ),
        "1984-03-27"
    );

    assert.equal(
        normalizer.normalize(
            "8/5/00",
            {
                order: "mdy",
                twoDigitYearBase: 2000
            }
        ),
        "2000-08-05"
    );

    assert.equal(
        normalizer.normalize(
            "3/31/27",
            {
                order: "mdy",
                twoDigitYearBase: 2000
            }
        ),
        "2027-03-31"
    );
});

test("does not guess ambiguous bare two digit year dates", () => {
    assert.equal(
        normalizer.normalize("66/01/31"),
        "66/01/31"
    );

    assert.equal(
        normalizer.normalize("41/01/31"),
        "41/01/31"
    );
});

test("does not canonicalize impossible dates", () => {
    assert.equal(
        normalizer.normalize("昭和41/02/31"),
        "昭和41/02/31"
    );

    assert.equal(
        normalizer.normalize("2026/02/29"),
        "2026/02/29"
    );
});

