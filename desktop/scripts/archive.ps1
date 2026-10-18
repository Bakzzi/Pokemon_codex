param([Parameter(Mandatory=$true)][string]$ReleaseRoot)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$root=(Resolve-Path -LiteralPath $ReleaseRoot).Path
$manifestFile=Join-Path $root 'update-files.json'
$manifest=[IO.File]::ReadAllText($manifestFile)|ConvertFrom-Json
if($manifest.product -ne 'pokemon-codex-buddy' -or $manifest.version -cnotmatch '^\d+\.\d+\.\d+$' -or (Split-Path -Leaf $root) -cne ('Pokemon-Codex-'+$manifest.version)){throw 'Unexpected release identity'}
$archivePath=$root+'-portable.zip'
if((Test-Path -LiteralPath $archivePath) -or (Test-Path -LiteralPath ($archivePath+'.sha256'))){throw 'Archive already exists; refusing to overwrite'}
$expected=[Collections.Generic.Dictionary[string,object]]::new([StringComparer]::Ordinal)
foreach($entry in $manifest.files){
  if($entry.path -match '\\|^/|(^|/)\.{1,2}(/|$)' -or $expected.ContainsKey($entry.path)){throw 'Invalid manifest path'}
  $expected.Add($entry.path,$entry)
}
$expected.Add('update-files.json',@{bytes=(Get-Item -LiteralPath $manifestFile).Length;sha256=(Get-FileHash -LiteralPath $manifestFile).Hash.ToLowerInvariant()})
function Check-Tree([string]$directory){
  $item=Get-Item -LiteralPath $directory -Force
  if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked release path'}
  foreach($file in Get-ChildItem -LiteralPath $directory -Force){
    if($file.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked release entry'}
    if($file.PSIsContainer){Check-Tree $file.FullName;continue}
    $relative=$file.FullName.Substring($root.Length+1).Replace('\','/')
    if(-not $expected.ContainsKey($relative)){throw ('Unlisted release entry: '+$relative)}
  }
}
Check-Tree $root
foreach($name in $expected.Keys){
  $file=Join-Path $root $name;$entry=$expected[$name]
  if((Get-Item -LiteralPath $file).Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $file).Hash.ToLowerInvariant() -cne $entry.sha256){throw ('Release file changed: '+$name)}
}
$prefix=(Split-Path -Leaf $root)+'/'
$zip=[IO.Compression.ZipFile]::Open($archivePath,[IO.Compression.ZipArchiveMode]::Create)
try{
  foreach($name in ($expected.Keys|Sort-Object)){
    # Explicit ZIP names: Windows CreateFromDirectory produces backslashes and
    # omitting the release directory breaks already-installed update helpers.
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $root $name),($prefix+$name),[IO.Compression.CompressionLevel]::Optimal)|Out-Null
  }
}finally{$zip.Dispose()}
$zip=[IO.Compression.ZipFile]::OpenRead($archivePath)
try{
  $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $sha=[Security.Cryptography.SHA256]::Create()
  try{foreach($entry in $zip.Entries){
    if($entry.FullName.Contains('\') -or -not $entry.FullName.StartsWith($prefix,[StringComparison]::Ordinal)){throw 'Unexpected archive root'}
    $name=$entry.FullName.Substring($prefix.Length)
    if(-not $expected.ContainsKey($name) -or -not $seen.Add($name)){throw 'Unexpected archive entry'}
    $stream=$entry.Open()
    try{$hash=([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}finally{$stream.Dispose()}
    if($entry.Length -ne $expected[$name].bytes -or $hash -cne $expected[$name].sha256){throw ('Archive file differs: '+$name)}
  }}finally{$sha.Dispose()}
  if($seen.Count -ne $expected.Count){throw 'Archive entries missing'}
}finally{$zip.Dispose()}
$hash=(Get-FileHash -LiteralPath $archivePath).Hash.ToLowerInvariant()
[IO.File]::WriteAllText($archivePath+'.sha256',($hash+'  '+[IO.Path]::GetFileName($archivePath)+"`n"),[Text.UTF8Encoding]::new($false))
@{ok=$true;files=$seen.Count;bytes=(Get-Item -LiteralPath $archivePath).Length;sha256=$hash;archive=$archivePath}|ConvertTo-Json -Compress
