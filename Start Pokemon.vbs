Option Explicit
Dim shell, files, folder, executable
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
executable = folder & "\node_modules\electron\dist\electron.exe"
If Not files.FileExists(executable) Then
  MsgBox "Run Setup.cmd first.", 48, "Pokemon Codex Buddy"
  WScript.Quit 1
End If
shell.CurrentDirectory = folder
shell.Run Chr(34) & executable & Chr(34) & " " & Chr(34) & folder & Chr(34), 0, False
