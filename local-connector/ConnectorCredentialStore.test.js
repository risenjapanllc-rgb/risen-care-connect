"use strict";

const assert =
  require("node:assert/strict");

const test =
  require("node:test");

const ConnectorCredentialStore =
  require("./ConnectorCredentialStore");

test(
  "stores and reads credential through helper",
  async () => {
    const calls = [];

    const store =
      new ConnectorCredentialStore({
        helperPath:
          "/tmp/fake-helper",

        runHelper:
          async ({
            helperPath,
            command,
            input
          }) => {
            calls.push({
              helperPath,
              command,
              input
            });

            if (command === "set") {
              return {
                stdout:
                  "stored\n"
              };
            }

            if (command === "get") {
              return {
                stdout:
                  "secret-value\n"
              };
            }

            throw new Error(
              "unexpected command"
            );
          }
      });

    await store.save(
      "secret-value"
    );

    const credential =
      await store.read();

    assert.equal(
      credential,
      "secret-value"
    );

    assert.deepEqual(
      calls,
      [
        {
          helperPath:
            "/tmp/fake-helper",
          command:
            "set",
          input:
            "secret-value\n"
        },
        {
          helperPath:
            "/tmp/fake-helper",
          command:
            "get",
          input:
            undefined
        }
      ]
    );
  }
);

test(
  "rejects empty credential",
  async () => {
    const store =
      new ConnectorCredentialStore({
        helperPath:
          "/tmp/fake-helper",

        runHelper:
          async () => {
            throw new Error(
              "should not be called"
            );
          }
      });

    await assert.rejects(
      () =>
        store.save("   "),
      /credential is required/
    );
  }
);

test(
  "deletes credential through helper",
  async () => {
    const calls = [];

    const store =
      new ConnectorCredentialStore({
        helperPath:
          "/tmp/fake-helper",

        runHelper:
          async ({
            helperPath,
            command
          }) => {
            calls.push({
              helperPath,
              command
            });

            return {
              stdout:
                "deleted\n"
            };
          }
      });

    await store.delete();

    assert.deepEqual(
      calls,
      [
        {
          helperPath:
            "/tmp/fake-helper",
          command:
            "delete"
        }
      ]
    );
  }
);
