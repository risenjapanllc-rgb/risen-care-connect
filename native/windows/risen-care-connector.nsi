Unicode True

!include "MUI2.nsh"
!include "LogicLib.nsh"

!define PRODUCT_NAME "RISEN CARE Connector"
!define PRODUCT_VERSION "1.0.0"
!define COMPANY_NAME "RISEN JAPAN LLC"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\RISEN CARE Connector"

Name "${PRODUCT_NAME}"

OutFile "../../dist/windows/RISEN CARE Connector Setup.exe"

InstallDir "$LOCALAPPDATA\Programs\RISEN CARE Connector"

RequestExecutionLevel user

SetCompressor /SOLID lzma

VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=1041 "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey /LANG=1041 "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey /LANG=1041 "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey /LANG=1041 "CompanyName" "${COMPANY_NAME}"
VIAddVersionKey /LANG=1041 "FileDescription" "${PRODUCT_NAME} Setup"
VIAddVersionKey /LANG=1041 "LegalCopyright" "Copyright RISEN JAPAN LLC"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Japanese"

Section "RISEN CARE Connector" SEC_MAIN
    SetShellVarContext current

    SetOutPath "$INSTDIR"

    File /r "../../dist/windows/RISEN CARE Connector\*"

    WriteUninstaller \
        "$INSTDIR\Uninstall.exe"

    WriteRegStr \
        HKCU \
        "${UNINSTALL_KEY}" \
        "DisplayName" \
        "${PRODUCT_NAME}"

    WriteRegStr \
        HKCU \
        "${UNINSTALL_KEY}" \
        "DisplayVersion" \
        "${PRODUCT_VERSION}"

    WriteRegStr \
        HKCU \
        "${UNINSTALL_KEY}" \
        "Publisher" \
        "${COMPANY_NAME}"

    WriteRegStr \
        HKCU \
        "${UNINSTALL_KEY}" \
        "InstallLocation" \
        "$INSTDIR"

    WriteRegStr \
        HKCU \
        "${UNINSTALL_KEY}" \
        "UninstallString" \
        '"$INSTDIR\Uninstall.exe"'

    WriteRegDWORD \
        HKCU \
        "${UNINSTALL_KEY}" \
        "NoModify" \
        1

    WriteRegDWORD \
        HKCU \
        "${UNINSTALL_KEY}" \
        "NoRepair" \
        1

    nsExec::ExecToLog \
        'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\native\windows\install-user-autostart.ps1" -InstallDir "$INSTDIR"'

    Pop $0

    ${If} $0 != 0
        MessageBox \
            MB_ICONSTOP \
            "自動起動の登録に失敗しました。"

        Abort
    ${EndIf}

    ExecShell \
        "open" \
        "$SYSDIR\wscript.exe" \
        '//B //Nologo "$INSTDIR\native\windows\start-hidden.vbs"' \
        SW_HIDE
SectionEnd

Section "Uninstall"
    SetShellVarContext current

    nsExec::ExecToLog \
        'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\native\windows\stop-runtime.ps1" -InstallDir "$INSTDIR"'

    Pop $0

    nsExec::ExecToLog \
        'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\native\windows\install-user-autostart.ps1" -InstallDir "$INSTDIR" -Remove'

    Pop $0

    nsExec::ExecToLog \
        '"$INSTDIR\native\windows\risen-credential-helper.exe" delete'

    Pop $0

    nsExec::ExecToLog \
        '"$INSTDIR\native\windows\risen-credential-helper.exe" delete mysql-password'

    Pop $0

    DeleteRegKey \
        HKCU \
        "${UNINSTALL_KEY}"

    RMDir /r \
        "$LOCALAPPDATA\RISEN CARE\Connector"

    RMDir /r \
        "$INSTDIR"
SectionEnd
