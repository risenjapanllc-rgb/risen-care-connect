param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDir,

    [switch]$Remove
)

$ErrorActionPreference =
    "Stop"

$RunKey =
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"

$ValueName =
    "RISEN CARE Connector"

if ($Remove) {
    Remove-ItemProperty `
        -Path $RunKey `
        -Name $ValueName `
        -ErrorAction SilentlyContinue

    Write-Output `
        "RISEN CARE Connector autostart removed"

    exit 0
}

$ResolvedInstallDir =
    [System.IO.Path]::GetFullPath(
        $InstallDir
    )

$NodePath =
    Join-Path `
        $ResolvedInstallDir `
        "runtime\node.exe"

$RuntimeScript =
    Join-Path `
        $ResolvedInstallDir `
        "scripts\windows-runtime.js"

$LauncherPath =
    Join-Path `
        $ResolvedInstallDir `
        "native\windows\start-hidden.vbs"

$WscriptPath =
    Join-Path `
        $env:WINDIR `
        "System32\wscript.exe"

foreach (
    $RequiredPath in @(
        $NodePath,
        $RuntimeScript,
        $LauncherPath,
        $WscriptPath
    )
) {
    if (
        -not (
            Test-Path `
                -LiteralPath $RequiredPath `
                -PathType Leaf
        )
    ) {
        throw `
            "Required runtime file was not found: $RequiredPath"
    }
}

New-Item `
    -Path $RunKey `
    -Force `
    | Out-Null

$Command =
    '"' +
    $WscriptPath +
    '" //B //Nologo "' +
    $LauncherPath +
    '"'

New-ItemProperty `
    -Path $RunKey `
    -Name $ValueName `
    -Value $Command `
    -PropertyType String `
    -Force `
    | Out-Null

Write-Output `
    "RISEN CARE Connector autostart installed for current user"
