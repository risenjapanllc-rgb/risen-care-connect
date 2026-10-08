#define UNICODE
#define _UNICODE

#include <windows.h>
#include <wincred.h>
#include <stdio.h>
#include <string.h>

#define TARGET_NAME L"RISEN CARE Connector/connector-credential"

static void secure_zero(
    void *buffer,
    size_t length
) {
    if (buffer && length > 0) {
        SecureZeroMemory(
            buffer,
            length
        );
    }
}

static int read_stdin(
    unsigned char *buffer,
    DWORD capacity,
    DWORD *length
) {
    DWORD total = 0;

    while (total < capacity) {
        DWORD read_count = 0;

        if (
            !ReadFile(
                GetStdHandle(STD_INPUT_HANDLE),
                buffer + total,
                capacity - total,
                &read_count,
                NULL
            )
        ) {
            return 0;
        }

        if (read_count == 0) {
            break;
        }

        total += read_count;
    }

    while (
        total > 0 &&
        (
            buffer[total - 1] == '\n' ||
            buffer[total - 1] == '\r'
        )
    ) {
        total--;
    }

    *length = total;

    return total > 0;
}

static int command_set(void) {
    unsigned char credential[4096];
    DWORD credential_length = 0;

    ZeroMemory(
        credential,
        sizeof(credential)
    );

    if (
        !read_stdin(
            credential,
            sizeof(credential),
            &credential_length
        )
    ) {
        fprintf(
            stderr,
            "credential is required\n"
        );

        secure_zero(
            credential,
            sizeof(credential)
        );

        return 1;
    }

    CREDENTIALW value;

    ZeroMemory(
        &value,
        sizeof(value)
    );

    value.Type =
        CRED_TYPE_GENERIC;

    value.TargetName =
        TARGET_NAME;

    value.CredentialBlobSize =
        credential_length;

    value.CredentialBlob =
        credential;

    value.Persist =
        CRED_PERSIST_LOCAL_MACHINE;

    value.UserName =
        L"RISEN CARE Connector";

    if (
        !CredWriteW(
            &value,
            0
        )
    ) {
        fprintf(
            stderr,
            "CredWriteW failed: %lu\n",
            GetLastError()
        );

        secure_zero(
            credential,
            sizeof(credential)
        );

        return 1;
    }

    secure_zero(
        credential,
        sizeof(credential)
    );

    return 0;
}

static int command_get(void) {
    PCREDENTIALW value = NULL;

    if (
        !CredReadW(
            TARGET_NAME,
            CRED_TYPE_GENERIC,
            0,
            &value
        )
    ) {
        fprintf(
            stderr,
            "CredReadW failed: %lu\n",
            GetLastError()
        );

        return 1;
    }

    if (
        !value ||
        !value->CredentialBlob ||
        value->CredentialBlobSize == 0
    ) {
        if (value) {
            CredFree(value);
        }

        fprintf(
            stderr,
            "credential is unavailable\n"
        );

        return 1;
    }

    DWORD written = 0;

    BOOL ok =
        WriteFile(
            GetStdHandle(STD_OUTPUT_HANDLE),
            value->CredentialBlob,
            value->CredentialBlobSize,
            &written,
            NULL
        );

    if (
        value->CredentialBlob &&
        value->CredentialBlobSize > 0
    ) {
        secure_zero(
            value->CredentialBlob,
            value->CredentialBlobSize
        );
    }

    CredFree(value);

    if (!ok) {
        fprintf(
            stderr,
            "credential output failed\n"
        );

        return 1;
    }

    return 0;
}

static int command_delete(void) {
    if (
        !CredDeleteW(
            TARGET_NAME,
            CRED_TYPE_GENERIC,
            0
        )
    ) {
        DWORD error =
            GetLastError();

        if (
            error != ERROR_NOT_FOUND
        ) {
            fprintf(
                stderr,
                "CredDeleteW failed: %lu\n",
                error
            );

            return 1;
        }
    }

    return 0;
}

int main(
    int argc,
    char **argv
) {
    if (
        argc != 2 ||
        !argv[1]
    ) {
        fprintf(
            stderr,
            "usage: risen-credential-helper set|get|delete\n"
        );

        return 1;
    }

    if (
        strcmp(
            argv[1],
            "set"
        ) == 0
    ) {
        return command_set();
    }

    if (
        strcmp(
            argv[1],
            "get"
        ) == 0
    ) {
        return command_get();
    }

    if (
        strcmp(
            argv[1],
            "delete"
        ) == 0
    ) {
        return command_delete();
    }

    fprintf(
        stderr,
        "unknown command\n"
    );

    return 1;
}
