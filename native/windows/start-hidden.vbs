Option Explicit

Dim fso
Dim shell
Dim scriptDir
Dim nativeDir
Dim installDir
Dim nodePath
Dim runtimeScript
Dim command

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
nativeDir = fso.GetParentFolderName(scriptDir)
installDir = fso.GetParentFolderName(nativeDir)

nodePath = fso.BuildPath(installDir, "runtime\node.exe")
runtimeScript = fso.BuildPath(installDir, "scripts\windows-runtime.js")

command = Chr(34) & nodePath & Chr(34) & _
    " " & _
    Chr(34) & runtimeScript & Chr(34)

shell.Run command, 0, False
