"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceConversationContextStore =
    require("./VoiceConversationContextStore");

test(
    "stores minimal case context by conversation UUID",
    () => {
        const store =
            new VoiceConversationContextStore();

        store.put({
            conversationUuid:
                "CON-A",

            facilityId:
                "facility-A",

            caseId:
                "case-A",

            contactId:
                "contact-A"
        });

        assert.deepEqual(
            store.get(
                "CON-A"
            ),
            {
                facilityId:
                    "facility-A",

                caseId:
                    "case-A",

                contactId:
                    "contact-A"
            }
        );
    }
);

test(
    "rejects incomplete conversation context",
    () => {
        const store =
            new VoiceConversationContextStore();

        assert.throws(
            () =>
                store.put({
                    conversationUuid:
                        "CON-A",

                    facilityId:
                        "facility-A",

                    caseId:
                        "case-A"
                }),
            /voice_conversation_context_invalid/
        );
    }
);

test(
    "expires conversation context",
    () => {
        let currentTime =
            1000;

        const store =
            new VoiceConversationContextStore({
                ttlMs:
                    100,

                now() {
                    return currentTime;
                }
            });

        store.put({
            conversationUuid:
                "CON-A",

            facilityId:
                "facility-A",

            caseId:
                "case-A",

            contactId:
                "contact-A"
        });

        assert.notEqual(
            store.get(
                "CON-A"
            ),
            null
        );

        currentTime =
            1100;

        assert.equal(
            store.get(
                "CON-A"
            ),
            null
        );
    }
);

test(
    "deletes conversation context explicitly",
    () => {
        const store =
            new VoiceConversationContextStore();

        store.put({
            conversationUuid:
                "CON-A",

            facilityId:
                "facility-A",

            caseId:
                "case-A",

            contactId:
                "contact-A"
        });

        assert.equal(
            store.delete(
                "CON-A"
            ),
            true
        );

        assert.equal(
            store.get(
                "CON-A"
            ),
            null
        );
    }
);
