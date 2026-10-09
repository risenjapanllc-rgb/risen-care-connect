param(
    [string]$InstallDir =
        "$env:LOCALAPPDATA\Programs\RISEN CARE Connector"
)

$ErrorActionPreference =
    "Stop"

$SourceDir =
    [System.IO.Path]::GetFullPath(
        (
            Join-Path `
                $PSScriptRoot `
                "..\.."
        )
    )

$InstallDir =
    [System.IO.Path]::GetFullPath(
        $InstallDir
    )

$NodePath =
    Join-Path `
        $SourceDir `
        "runtime\node.exe"

$HelperPath =
    Join-Path `
        $SourceDir `
        "native\windows\risen-credential-helper.exe"

if (
    -not (
        Test-Path `
            -LiteralPath $NodePath `
            -PathType Leaf
    )
) {
    throw `
        "Bundled node.exe was not found."
}

if (
    -not (
        Test-Path `
            -LiteralPath $HelperPath `
            -PathType Leaf
    )
) {
    throw `
        "Credential helper was not found."
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

New-Item `
    -ItemType Directory `
    -Path $InstallDir `
    -Force `
    | Out-Null

Copy-Item `
    -Path (
        Join-Path `
            $SourceDir `
            "*"
    ) `
    -Destination $InstallDir `
    -Recurse `
    -Force

& (
    Join-Path `
        $InstallDir `
        "native\windows\install-user-autostart.ps1"
) `
    -InstallDir $InstallDir

$Node =
    Join-Path `
        $InstallDir `
        "runtime\node.exe"

$Runtime =
    Join-Path `
        $InstallDir `
        "scripts\windows-runtime.js"

Start-Process `
    -FilePath $Node `
    -ArgumentList "`"$Runtime`"" `
    -WorkingDirectory $InstallDir `
    -WindowStyle Hidden

Write-Output `
    "RISEN CARE Connector installation completed"

Write-Output `
    "Open https://connect.risencare.jp/connect to connect this PC."
