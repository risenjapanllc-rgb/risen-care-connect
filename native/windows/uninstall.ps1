param(
    [string]$InstallDir =
        "$env:LOCALAPPDATA\Programs\RISEN CARE Connector"
)

$ErrorActionPreference =
    "Stop"

$AutostartScript =
    Join-Path `
        $InstallDir `
        "native\windows\install-user-autostart.ps1"

$StopRuntimeScript =
    Join-Path `
        $InstallDir `
        "native\windows\stop-runtime.ps1"

$CredentialHelper =
    Join-Path `
        $InstallDir `
        "native\windows\risen-credential-helper.exe"

if (
    Test-Path `
        -LiteralPath $AutostartScript `
        -PathType Leaf
) {
    & $AutostartScript `
        -InstallDir $InstallDir `
        -Remove
}

if (
    Test-Path `
        -LiteralPath $StopRuntimeScript `
        -PathType Leaf
) {
    & $StopRuntimeScript `
        -InstallDir $InstallDir
}

if (
    Test-Path `
        -LiteralPath $CredentialHelper `
        -PathType Leaf
) {
    & $CredentialHelper delete
    & $CredentialHelper delete mysql-password
}

$StateDir =
    Join-Path `
        $env:LOCALAPPDATA `
        "RISEN CARE\Connector"

if (
    Test-Path `
        -LiteralPath $StateDir
) {
    Remove-Item `
        -LiteralPath $StateDir `
        -Recurse `
        -Force
}

if (
    Test-Path `
        -LiteralPath $InstallDir
) {
    Remove-Item `
        -LiteralPath $InstallDir `
        -Recurse `
        -Force
}

Write-Output `
    "RISEN CARE Connector uninstalled"
