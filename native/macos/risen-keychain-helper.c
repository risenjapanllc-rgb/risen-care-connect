#include <CoreFoundation/CoreFoundation.h>
#include <Security/Security.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static CFStringRef service =
    CFSTR("care.risen.connector");

static CFMutableDictionaryRef
base_query(
    CFStringRef account
) {
    CFMutableDictionaryRef query =
        CFDictionaryCreateMutable(
            kCFAllocatorDefault,
            0,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks
        );

    CFDictionarySetValue(
        query,
        kSecClass,
        kSecClassGenericPassword
    );

    CFDictionarySetValue(
        query,
        kSecAttrService,
        service
    );

    CFDictionarySetValue(
        query,
        kSecAttrAccount,
        account
    );

    return query;
}

static int
cmd_set(
    CFStringRef account
) {
    char buffer[4096];

    if (!fgets(buffer, sizeof(buffer), stdin)) {
        fprintf(stderr, "credential missing\n");
        return 65;
    }

    size_t len = strlen(buffer);

    while (
        len > 0 &&
        (
            buffer[len - 1] == '\n' ||
            buffer[len - 1] == '\r'
        )
    ) {
        buffer[--len] = '\0';
    }

    if (len == 0) {
        fprintf(stderr, "credential missing\n");
        return 65;
    }

    CFDataRef data =
        CFDataCreate(
            kCFAllocatorDefault,
            (const UInt8 *)buffer,
            (CFIndex)len
        );

    CFMutableDictionaryRef query =
        base_query(account);

    CFMutableDictionaryRef attrs =
        CFDictionaryCreateMutable(
            kCFAllocatorDefault,
            0,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks
        );

    CFDictionarySetValue(
        attrs,
        kSecValueData,
        data
    );

    OSStatus status =
        SecItemUpdate(
            query,
            attrs
        );

    if (status == errSecItemNotFound) {
        CFDictionarySetValue(
            query,
            kSecValueData,
            data
        );

        status =
            SecItemAdd(
                query,
                NULL
            );
    }

    memset(buffer, 0, sizeof(buffer));

    CFRelease(attrs);
    CFRelease(query);
    CFRelease(data);

    if (status != errSecSuccess) {
        fprintf(
            stderr,
            "store failed: %d\n",
            (int)status
        );
        return 1;
    }

    puts("stored");
    return 0;
}

static int
cmd_get(
    CFStringRef account
) {
    CFMutableDictionaryRef query =
        base_query(account);

    CFDictionarySetValue(
        query,
        kSecReturnData,
        kCFBooleanTrue
    );

    CFDictionarySetValue(
        query,
        kSecMatchLimit,
        kSecMatchLimitOne
    );

    CFTypeRef result = NULL;

    OSStatus status =
        SecItemCopyMatching(
            query,
            &result
        );

    CFRelease(query);

    if (
        status != errSecSuccess ||
        result == NULL
    ) {
        fprintf(
            stderr,
            "read failed: %d\n",
            (int)status
        );
        return 1;
    }

    CFDataRef data =
        (CFDataRef)result;

    fwrite(
        CFDataGetBytePtr(data),
        1,
        (size_t)CFDataGetLength(data),
        stdout
    );

    fputc('\n', stdout);

    CFRelease(result);

    return 0;
}

static int
cmd_delete(
    CFStringRef account
) {
    CFMutableDictionaryRef query =
        base_query(account);

    OSStatus status =
        SecItemDelete(query);

    CFRelease(query);

    if (
        status != errSecSuccess &&
        status != errSecItemNotFound
    ) {
        fprintf(
            stderr,
            "delete failed: %d\n",
            (int)status
        );
        return 1;
    }

    puts("deleted");
    return 0;
}

int
main(int argc, char **argv) {
    if (
        argc < 2 ||
        argc > 3
    ) {
        fprintf(
            stderr,
            "usage: helper set|get|delete [key]\n"
        );
        return 64;
    }

    const char *key =
        argc == 3
            ? argv[2]
            : "connector-credential";

    CFStringRef account =
        CFStringCreateWithCString(
            kCFAllocatorDefault,
            key,
            kCFStringEncodingUTF8
        );

    if (!account) {
        return 64;
    }

    if (strcmp(argv[1], "set") == 0) {
        int result = cmd_set(account);
        CFRelease(account);
        return result;
    }

    if (strcmp(argv[1], "get") == 0) {
        int result = cmd_get(account);
        CFRelease(account);
        return result;
    }

    if (strcmp(argv[1], "delete") == 0) {
        int result = cmd_delete(account);
        CFRelease(account);
        return result;
    }

    fprintf(stderr, "unknown command\n");
    CFRelease(account);
    return 64;
}
