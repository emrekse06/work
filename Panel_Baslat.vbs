Set WshShell = CreateObject("WScript.Shell")

' Scriptin bulunduğu klasörü çalışma dizini yap (Dosya yollarının karışmaması için)
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Flask uygulamasını arkaplanda konsolsuz (0) başlat
WshShell.Run "pythonw.exe app.py", 0, False

' Sunucunun başlaması için 2 saniye bekle
WScript.Sleep 2000

' Paneli varsayılan tarayıcıda otomatik aç
WshShell.Run "http://127.0.0.1:5055"