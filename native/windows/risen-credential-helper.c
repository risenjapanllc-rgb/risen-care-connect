#define UNICODE
#define _UNICODE
#define WIN32_LEAN_AND_MEAN

#include <windows.h>
#include <wincred.h>
#include <shellapi.h>

#define MAX_CREDENTIAL_BYTES 4096
#define TARGET_CAPACITY 512

static DWORD ascii_length(
    const char *text
) {
    DWORD length = 0;

    if (!text) {
        return 0;
    }

    while (text[length] != '\0') {
        length++;
    }

    return length;
}

static void write_message(
    HANDLE handle,
    const char *message
) {
    DWORD written = 0;

    if (
        handle == NULL ||
        handle == INVALID_HANDLE_VALUE ||
        !message
    ) {
        return;
    }

    WriteFile(
        handle,
        message,
        ascii_length(message),
        &written,
        NULL
    );
}

static void secure_zero(
    void *buffer,
    SIZE_T length
) {
    volatile BYTE *cursor =
        (volatile BYTE *)buffer;

    while (
        cursor &&
        length > 0
    ) {
        *cursor = 0;
        cursor++;
        length--;
    }
}

static int wide_equal(
    const WCHAR *left,
    const WCHAR *right
) {
    DWORD index = 0;

    if (!left || !right) {
        return 0;
    }

    while (
        left[index] != L'\0' &&
        right[index] != L'\0'
    ) {
        if (
            left[index] !=
            right[index]
        ) {
            return 0;
        }

        index++;
    }

    return (
        left[index] == L'\0' &&
        right[index] == L'\0'
    );
}

static int valid_key(
    const WCHAR *key
) {
    DWORD index = 0;

    if (
        !key ||
        key[0] == L'\0'
    ) {
        return 0;
    }

    while (
        key[index] != L'\0'
    ) {
        WCHAR c =
            key[index];

        int allowed =
            (
                c >= L'a' &&
                c <= L'z'
            ) ||
            (
                c >= L'A' &&
                c <= L'Z'
            ) ||
            (
                c >= L'0' &&
                c <= L'9'
            ) ||
            c == L'-' ||
            c == L'_' ||
            c == L'.';

        if (!allowed) {
            return 0;
        }

        index++;
    }

    return 1;
}

static int append_wide(
    WCHAR *destination,
    DWORD capacity,
    DWORD *position,
    const WCHAR *source
) {
    DWORD index = 0;

    if (
        !destination ||
        !position ||
        !source
    ) {
        return 0;
    }

    while (
        source[index] != L'\0'
    ) {
        if (
            *position + 1 >=
            capacity
        ) {
            return 0;
        }

        destination[
            *position
        ] = source[index];

        (*position)++;
        index++;
    }

    destination[
        *position
    ] = L'\0';

    return 1;
}

static int build_target_name(
    const WCHAR *key,
    WCHAR *target,
    DWORD capacity
) {
    const WCHAR prefix[] =
        L"RISEN CARE Connector/";

    const WCHAR default_key[] =
        L"connector-credential";

    DWORD position = 0;

    const WCHAR *resolved_key =
        (
            key &&
            key[0] != L'\0'
        )
            ? key
            : default_key;

    if (
        !valid_key(
            resolved_key
        )
    ) {
        return 0;
    }

    target[0] = L'\0';

    if (
        !append_wide(
            target,
            capacity,
            &position,
            prefix
        )
    ) {
        return 0;
    }

    if (
        !append_wide(
            target,
            capacity,
            &position,
            resolved_key
        )
    ) {
        return 0;
    }

    return 1;
}

static int command_set(
    const WCHAR *target_name
) {
    HANDLE heap =
        GetProcessHeap();

    BYTE *credential =
        (BYTE *)HeapAlloc(
            heap,
            HEAP_ZERO_MEMORY,
            MAX_CREDENTIAL_BYTES + 1
        );

    if (!credential) {
        write_message(
            GetStdHandle(
                STD_ERROR_HANDLE
            ),
            "memory allocation failed\n"
        );

        return 1;
    }

    DWORD total = 0;

    while (
        total <
        MAX_CREDENTIAL_BYTES + 1
    ) {
        DWORD read_count = 0;

        if (
            !ReadFile(
                GetStdHandle(
                    STD_INPUT_HANDLE
                ),
                credential + total,
                (
                    MAX_CREDENTIAL_BYTES +
                    1
                ) - total,
                &read_count,
                NULL
            )
        ) {
            secure_zero(
                credential,
                MAX_CREDENTIAL_BYTES + 1
            );

            HeapFree(
                heap,
                0,
                credential
            );

            write_message(
                GetStdHandle(
                    STD_ERROR_HANDLE
                ),
                "credential input failed\n"
            );

            return 1;
        }

        if (
            read_count == 0
        ) {
            break;
        }

        total +=
            read_count;
    }

    while (
        total > 0 &&
        (
            credential[
                total - 1
            ] == '\n' ||
            credential[
                total - 1
            ] == '\r'
        )
    ) {
        total--;
    }

    if (
        total == 0 ||
        total >
            MAX_CREDENTIAL_BYTES
    ) {
        secure_zero(
            credential,
            MAX_CREDENTIAL_BYTES + 1
        );

        HeapFree(
            heap,
            0,
            credential
        );

        write_message(
            GetStdHandle(
                STD_ERROR_HANDLE
            ),
            "credential is required or too large\n"
        );

        return 1;
    }

    CREDENTIALW value;

    secure_zero(
        &value,
        sizeof(value)
    );

    value.Type =
        CRED_TYPE_GENERIC;

    value.TargetName =
        (LPWSTR)target_name;

    value.CredentialBlobSize =
        total;

    value.CredentialBlob =
        credential;

    value.Persist =
        CRED_PERSIST_LOCAL_MACHINE;

    value.UserName =
        L"RISEN CARE Connector";

    BOOL ok =
        CredWriteW(
            &value,
            0
        );

    secure_zero(
        credential,
        MAX_CREDENTIAL_BYTES + 1
    );

    HeapFree(
        heap,
        0,
        credential
    );

    if (!ok) {
        write_message(
            GetStdHandle(
                STD_ERROR_HANDLE
            ),
            "credential write failed\n"
        );

        return 1;
    }

    return 0;
}

static int command_get(
    const WCHAR *target_name
) {
    PCREDENTIALW value =
        NULL;

    if (
        !CredReadW(
            target_name,
            CRED_TYPE_GENERIC,
            0,
            &value
        )
    ) {
        write_message(
            GetStdHandle(
                STD_ERROR_HANDLE
            ),
            "credential unavailable\n"
        );

        return 1;
    }

    if (
        !value ||
        !value->CredentialBlob ||
        value->CredentialBlobSize == 0
    ) {
        if (value) {
            CredFree(
                value
            );
        }

        write_message(
            GetStdHandle(
                STD_ERROR_HANDLE
            ),
            "credential unavailable\n"
        );

        return 1;
    }

    DWORD written = 0;

    BOOL ok =
        WriteFile(
            GetStdHandle(
                STD_OUTPUT_HANDLE
            ),
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

    CredFree(
        value
    );

    if (
        !ok ||
        written == 0
    ) {
        write_message(
            GetStdHandle(
                STD_ERROR_HANDLE
            ),
            "credential output failed\n"
        );

        return 1;
    }

    return 0;
}

static int command_delete(
    const WCHAR *target_name
) {
    if (
        !CredDeleteW(
            target_name,
            CRED_TYPE_GENERIC,
            0
        )
    ) {
        DWORD error =
            GetLastError();

        if (
            error !=
            ERROR_NOT_FOUND
        ) {
            write_message(
                GetStdHandle(
                    STD_ERROR_HANDLE
                ),
                "credential delete failed\n"
            );

            return 1;
        }
    }

    return 0;
}

void mainCRTStartup(void) {
    int argc = 0;

    LPWSTR *argv =
        CommandLineToArgvW(
            GetCommandLineW(),
            &argc
        );

    if (
        !argv ||
        argc < 2 ||
        argc > 3
    ) {
        write_message(
            GetStdHandle(
                STD_ERROR_HANDLE
            ),
            "usage: risen-credential-helper set|get|delete [key]\n"
        );

        if (argv) {
            LocalFree(
                argv
            );
        }

        ExitProcess(1);
    }

    const WCHAR *key =
        argc == 3
            ? argv[2]
            : L"connector-credential";

    WCHAR target[
        TARGET_CAPACITY
    ];

    if (
        !build_target_name(
            key,
            target,
            TARGET_CAPACITY
        )
    ) {
        write_message(
            GetStdHandle(
                STD_ERROR_HANDLE
            ),
            "invalid credential key\n"
        );

        LocalFree(
            argv
        );

        ExitProcess(1);
    }

    int result = 1;

    if (
        wide_equal(
            argv[1],
            L"set"
        )
    ) {
        result =
            command_set(
                target
            );
    } else if (
        wide_equal(
            argv[1],
            L"get"
        )
    ) {
        result =
            command_get(
                target
            );
    } else if (
        wide_equal(
            argv[1],
            L"delete"
        )
    ) {
        result =
            command_delete(
                target
            );
    } else {
        write_message(
            GetStdHandle(
                STD_ERROR_HANDLE
            ),
            "unknown command\n"
        );

        result = 1;
    }

    secure_zero(
        target,
        sizeof(target)
    );

    LocalFree(
        argv
    );

    ExitProcess(
        (UINT)result
    );
}
