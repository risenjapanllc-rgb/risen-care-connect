const test = require("node:test");
const assert = require("node:assert/strict");

const ResidentMatcher =
    require("./ResidentMatcher");

const matcher = new ResidentMatcher();

const current = {
    id: "resident-current",
    facilityId: "facility-a",
    userCode: "00125",
    name: "山田太郎"
};

const legacy = {
    id: "resident-legacy",
    facilityId: null,
    userCode: "00125",
    name: "山田太郎"
};

test("current userCode + same name => matched", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        },
        candidates: [current]
    });

    assert.deepStrictEqual(result, {
        status: "matched",
        residentId: "resident-current",
        matchMethod: "facility_user_code"
    });
});

test("current userCode + different name => needs_review", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田花子" }
        },
        candidates: [current]
    });

    assert.equal(
        result.matchMethod,
        "user_code_name_mismatch"
    );
    assert.equal(result.residentId, null);
});

test("current userCode + missing source name => needs_review", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" }
        },
        candidates: [current]
    });

    assert.equal(
        result.matchMethod,
        "user_code_missing_source_name"
    );
    assert.equal(result.residentId, null);
});

test("current userCode + missing candidate name => needs_review", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        },
        candidates: [{
            ...current,
            name: ""
        }]
    });

    assert.deepStrictEqual(result, {
        status: "needs_review",
        residentId: null,
        matchMethod: "user_code_missing_candidate_name",
        candidates: [{
            id: "resident-current",
            name: null,
            gender: null,
            affiliation: null
        }]
    });
});

test("different facility => unmatched", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" }
        },
        candidates: [{
            ...current,
            facilityId: "facility-b"
        }]
    });

    assert.equal(result.status, "unmatched");
    assert.equal(result.residentId, null);
});

test("duplicate current => needs_review", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" }
        },
        candidates: [
            current,
            {
                ...current,
                id: "resident-current-2"
            }
        ]
    });

    assert.equal(result.status, "needs_review");
});

test("legacy userCode + same name => needs_review", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        },
        candidates: [legacy]
    });

    assert.equal(
        result.matchMethod,
        "legacy_user_code_name"
    );
    assert.equal(result.residentId, null);
});

test("legacy different name => unmatched", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田花子" }
        },
        candidates: [legacy]
    });

    assert.equal(result.status, "unmatched");
});

test("current takes priority over legacy", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        },
        candidates: [legacy, current]
    });

    assert.equal(result.status, "matched");
    assert.equal(
        result.residentId,
        "resident-current"
    );
});

test("name comparison remains conservative", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田 太郎" }
        },
        candidates: [current]
    });

    assert.equal(
        result.matchMethod,
        "user_code_name_mismatch"
    );
    assert.equal(result.residentId, null);
});

test("missing match input => unmatched", () => {
    const result = matcher.match();

    assert.deepStrictEqual(result, {
        status: "unmatched",
        residentId: null,
        matchMethod: null,
        candidates: []
    });
});

test("non-array candidates => unmatched", () => {
    const result = matcher.match({
        facilityId: "facility-a",
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        },
        candidates: null
    });

    assert.deepStrictEqual(result, {
        status: "unmatched",
        residentId: null,
        matchMethod: null,
        candidates: []
    });
});
