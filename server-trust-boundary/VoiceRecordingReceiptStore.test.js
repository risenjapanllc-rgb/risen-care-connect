"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceRecordingReceiptStore =
    require("./VoiceRecordingReceiptStore");

test(
    "claims a recording UUID only once",
    () => {
        const store =
            new VoiceRecordingReceiptStore();

        assert.equal(
            store.claim(
                "recording-A"
            ),
            true
        );

        assert.equal(
            store.claim(
                "recording-A"
            ),
            false
        );

        assert.equal(
            store.getState(
                "recording-A"
            ),
            "processing"
        );
    }
);

test(
    "marks claimed recording as completed",
    () => {
        const store =
            new VoiceRecordingReceiptStore();

        store.claim(
            "recording-A"
        );

        assert.equal(
            store.complete(
                "recording-A"
            ),
            true
        );

        assert.equal(
            store.getState(
                "recording-A"
            ),
            "completed"
        );

        assert.equal(
            store.claim(
                "recording-A"
            ),
            false
        );
    }
);

test(
    "release allows retry after processing failure",
    () => {
        const store =
            new VoiceRecordingReceiptStore();

        store.claim(
            "recording-A"
        );

        assert.equal(
            store.release(
                "recording-A"
            ),
            true
        );

        assert.equal(
            store.claim(
                "recording-A"
            ),
            true
        );
    }
);

test(
    "expired receipts can be claimed again",
    () => {
        let currentTime =
            1000;

        const store =
            new VoiceRecordingReceiptStore({
                ttlMs:
                    100,

                now() {
                    return currentTime;
                }
            });

        assert.equal(
            store.claim(
                "recording-A"
            ),
            true
        );

        currentTime =
            1100;

        assert.equal(
            store.claim(
                "recording-A"
            ),
            true
        );
    }
);

test(
    "rejects an empty recording UUID",
    () => {
        const store =
            new VoiceRecordingReceiptStore();

        assert.throws(
            () =>
                store.claim(""),
            /voice_recording_uuid_invalid/
        );
    }
);
