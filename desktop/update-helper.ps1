param([Parameter(Mandatory=$true)][string]$PlanPath,[ValidateSet('Stage','Launch','Apply')][string]$Mode='Stage')
$ErrorActionPreference='Stop'
$utf8=[Text.UTF8Encoding]::new($false)
$checkedDirs=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
function Write-Json($file,$value){[IO.File]::WriteAllText($file,($value|ConvertTo-Json -Depth 12),$utf8)}
function No-Links([string]$file){
  $at=[IO.Path]::GetFullPath($file)
  while($at){
    if($checkedDirs.Contains($at)){break}
    try{$attributes=[IO.File]::GetAttributes($at);if($attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked update path'};if($attributes -band [IO.FileAttributes]::Directory){$checkedDirs.Add($at)|Out-Null}}
    catch [IO.FileNotFoundException]{}catch [IO.DirectoryNotFoundException]{}
    $parent=[IO.Path]::GetDirectoryName($at);if($parent -eq $at){break};$at=$parent
  }
}
function Hash([string]$file){$stream=[IO.File]::OpenRead($file);$sha=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}finally{$stream.Dispose();$sha.Dispose()}}
function Safe-Path([string]$root,[string]$relative){
  if(-not $relative -or $relative.Length -gt 240 -or $relative -match '[\\:\x00-\x1f<>"|?*]' -or $relative.StartsWith('/')){throw 'Unsafe release path'}
  foreach($part in $relative.Split('/')){if(-not $part -or $part -in @('.','..','.pokemon-updates') -or $part -match '[. ]$' -or $part -match '^(?i:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)'){throw 'Unsafe release path component'}}
  $absolute=[IO.Path]::GetFullPath((Join-Path $root $relative))
  if(-not $absolute.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Release path escaped root'}
  No-Links $absolute;return $absolute
}
function Files([string]$root,[string]$relative=''){
  No-Links $root
  foreach($entry in Get-ChildItem -LiteralPath $root -Force){
    if($entry.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked release entry'}
    $name=if($relative){$relative+'/'+$entry.Name}else{$entry.Name}
    if($entry.PSIsContainer){Files $entry.FullName $name}else{$name}
  }
}
function Manifest([string]$root,[string]$version,[bool]$exact=$false){
  No-Links $root;$file=Join-Path $root 'update-files.json'
  if((Get-Item -LiteralPath $file).Length -gt 8388608){throw 'Manifest too large'}
  $m=[IO.File]::ReadAllText($file)|ConvertFrom-Json
  if($m.schema -ne 1 -or $m.product -ne 'pokemon-codex-buddy' -or $m.platform -ne 'windows-x64' -or $m.version -ne $version -or $m.files.Count -lt 3 -or $m.files.Count -gt 10000){throw 'Unexpected release manifest'}
  $names=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase);$bytes=0L
  foreach($entry in $m.files){
    $target=Safe-Path $root $entry.path
    if($entry.path -eq 'update-files.json' -or -not $names.Add($entry.path) -or $entry.sha256 -cnotmatch '^[a-f0-9]{64}$' -or $entry.bytes -lt 0 -or $entry.bytes -ne [long]$entry.bytes){throw 'Invalid manifest entry'}
    $bytes+=[long]$entry.bytes;if($bytes -gt 1610612736){throw 'Release is too large'}
    if((Get-Item -LiteralPath $target).Length -ne $entry.bytes -or (Hash $target) -ne $entry.sha256){throw ('Release file changed: '+$entry.path)}
  }
  foreach($required in @('PokemonCodex.exe','resources/app/package.json','resources/app/desktop/main.cjs','resources/app/desktop/update-helper.ps1')){if(-not $names.Contains($required)){throw 'Required runtime file missing'}}
  $pkg=[IO.File]::ReadAllText((Join-Path $root 'resources/app/package.json'))|ConvertFrom-Json
  if($pkg.name -ne 'pokemon-codex-buddy' -or $pkg.version -ne $version -or $pkg.main -ne 'desktop/main.cjs'){throw 'Unexpected application identity'}
  if($exact){$actual=@(Files $root);if($actual.Count -ne $names.Count+1){throw 'Unlisted release files'};foreach($name in $actual){if($name -ne 'update-files.json' -and -not $names.Contains($name)){throw 'Unlisted release entry'}}}
  return $m
}
function Move-File([string]$from,[string]$to){
  No-Links $from;No-Links $to;[IO.Directory]::CreateDirectory((Split-Path -Parent $to))|Out-Null
  # Rename files instead of overwriting hardlinks to retained release artifacts.
  [IO.File]::Move($from,$to)
}
function Remove-Empty([string]$root){
  if(-not(Test-Path -LiteralPath $root)){return};No-Links $root
  foreach($entry in Get-ChildItem -LiteralPath $root -Force){if($entry.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked cleanup entry'};if($entry.PSIsContainer){Remove-Empty $entry.FullName}}
  if(@(Get-ChildItem -LiteralPath $root -Force).Count -eq 0){[IO.Directory]::Delete($root)}
}
function Remove-Managed([string]$root,[string]$version){
  if(-not(Test-Path -LiteralPath $root)){return}
  $m=Manifest $root $version $true
  foreach($entry in $m.files){[IO.File]::Delete((Safe-Path $root $entry.path))};[IO.File]::Delete((Join-Path $root 'update-files.json'));Remove-Empty $root
}
$PlanPath=[IO.Path]::GetFullPath($PlanPath);No-Links $PlanPath
$txn=Split-Path -Parent $PlanPath;$plan=[IO.File]::ReadAllText($PlanPath)|ConvertFrom-Json
if($plan.schema -ne 1 -or $plan.product -ne 'pokemon-codex-buddy' -or $plan.nonce -cnotmatch '^[a-f0-9]{32}$' -or (Split-Path -Leaf $txn) -ne $plan.nonce){throw 'Invalid update transaction'}
$install=[IO.Path]::GetFullPath($plan.installRoot);No-Links $install
$cache=Join-Path $install '.pokemon-updates';$transactions=Join-Path $cache 'transactions'
if((Split-Path -Parent $txn) -ne $transactions -or (Split-Path -Leaf $PlanPath) -ne 'plan.json'){throw 'Update transaction outside installation'}
$owner=[IO.File]::ReadAllText((Join-Path $cache 'owner.json'))|ConvertFrom-Json
if($owner.schema -ne 1 -or $owner.product -ne $plan.product){throw 'Unexpected update directory identity'}
foreach($v in @($plan.currentVersion,$plan.version)){if($v -cnotmatch '^\d{1,4}\.\d{1,4}\.\d{1,4}$'){throw 'Invalid update version'}}
if([version]$plan.version -le [version]$plan.currentVersion -or $plan.zipSha256 -cnotmatch '^[a-f0-9]{64}$' -or $plan.zipBytes -lt 1 -or $plan.zipBytes -gt 536870912){throw 'Invalid update identity'}
$zipFile=Join-Path $txn 'release.zip';$stage=Join-Path $txn 'staged';$rollback=Join-Path $txn 'rollback';$exe=Join-Path $install 'PokemonCodex.exe'
$resultFile=Join-Path $txn 'result.json';$oldMoved=[Collections.Generic.List[string]]::new();$newMoved=[Collections.Generic.List[string]]::new();$newProcess=$null
try{
  if($Mode -eq 'Launch'){
    $receipt=[IO.File]::ReadAllText($resultFile)|ConvertFrom-Json
    if($receipt.status -ne 'ready' -or $receipt.nonce -ne $plan.nonce){throw 'Update has not been prepared'}
    $arguments='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -PlanPath "'+$PlanPath+'" -Mode Apply'
    $shell=New-Object -ComObject Shell.Application
    try{$shell.ShellExecute((Join-Path $PSHOME 'powershell.exe'),$arguments,$txn,'open',0)}finally{[Runtime.InteropServices.Marshal]::ReleaseComObject($shell)|Out-Null}
    $deadline=[DateTime]::UtcNow.AddSeconds(15);$ackFile=Join-Path $txn 'helper-ready.json'
    do{
      if(Test-Path -LiteralPath $ackFile){$ack=[IO.File]::ReadAllText($ackFile)|ConvertFrom-Json;$worker=Get-Process -Id $ack.pid -ErrorAction SilentlyContinue;if($ack.nonce -eq $plan.nonce -and $worker -and $worker.Path -eq (Join-Path $PSHOME 'powershell.exe')){exit 0}}
      if([DateTime]::UtcNow -gt $deadline){throw 'Update worker did not acknowledge startup'};Start-Sleep -Milliseconds 100
    }while($true)
  }
  if($Mode -eq 'Stage'){
    $old=Manifest $install $plan.currentVersion
    if((Get-Item -LiteralPath $zipFile).Length -ne $plan.zipBytes -or (Hash $zipFile) -ne $plan.zipSha256){throw 'Archive checksum mismatch'}
    if(Test-Path -LiteralPath $stage){throw 'Staging destination already exists'}
    [IO.Directory]::CreateDirectory($stage)|Out-Null;Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip=[IO.Compression.ZipFile]::OpenRead($zipFile);$seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase);$total=0L
    try{
      if($zip.Entries.Count -gt 15000){throw 'Archive contains too many entries'}
      $prefix='Pokemon-Codex-'+$plan.version+'/'
      foreach($entry in $zip.Entries){
        if(-not $entry.FullName.StartsWith($prefix,[StringComparison]::Ordinal)){throw 'Unexpected archive root'}
        if((($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000){throw 'Archive symlink'}
        $relative=$entry.FullName.Substring($prefix.Length);if(-not $relative){continue}
        $isDir=$relative.EndsWith('/');if($isDir){$relative=$relative.TrimEnd('/')}
        $target=Safe-Path $stage $relative;if(-not $seen.Add($relative)){throw 'Duplicate archive entry'}
        if($entry.Length -gt 536870912){throw 'Archive entry is too large'};$total+=$entry.Length;if($total -gt 1610612736){throw 'Archive expands beyond limit'}
        if($isDir){[IO.Directory]::CreateDirectory($target)|Out-Null;continue}
        [IO.Directory]::CreateDirectory((Split-Path -Parent $target))|Out-Null
        $inputStream=$entry.Open();$outputStream=[IO.File]::Open($target,[IO.FileMode]::CreateNew)
        try{
          $buffer=[byte[]]::new(65536);$copied=0L
          while(($count=$inputStream.Read($buffer,0,$buffer.Length)) -gt 0){$copied+=$count;if($copied -gt $entry.Length){throw 'Archive entry exceeded declared size'};$outputStream.Write($buffer,0,$count)}
          if($copied -ne $entry.Length){throw 'Truncated archive entry'}
        }finally{$inputStream.Dispose();$outputStream.Dispose()}
      }
    }finally{$zip.Dispose()}
    $new=Manifest $stage $plan.version $true;$owned=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach($entry in $old.files){$owned.Add($entry.path)|Out-Null};$owned.Add('update-files.json')|Out-Null
    foreach($entry in $new.files){$target=Safe-Path $install $entry.path;if((Test-Path -LiteralPath $target) -and -not $owned.Contains($entry.path)){throw 'Update conflicts with a user file'}}
    Write-Json $resultFile @{status='ready';version=$plan.version;nonce=$plan.nonce};exit 0
  }
  $receipt=[IO.File]::ReadAllText($resultFile)|ConvertFrom-Json
  if($receipt.status -ne 'ready' -or $receipt.nonce -ne $plan.nonce){throw 'Update has not been prepared'}
  $lock=[IO.File]::Open((Join-Path $txn 'apply.lock'),[IO.FileMode]::CreateNew);$lock.Dispose()
  Write-Json (Join-Path $txn 'helper-ready.json') @{nonce=$plan.nonce;pid=$PID}
  $deadline=[DateTime]::UtcNow.AddSeconds(35)
  do{
    $running=@(Get-Process -Name 'PokemonCodex' -ErrorAction SilentlyContinue|Where-Object {$_.Path -eq $exe})
    if(-not $running.Count){break};if([DateTime]::UtcNow -gt $deadline){throw 'Application is still running'};Start-Sleep -Milliseconds 200
  }while($true)
  $old=Manifest $install $plan.currentVersion;$new=Manifest $stage $plan.version $true
  $checkedDirs.Clear()
  [IO.Directory]::CreateDirectory($rollback)|Out-Null
  Write-Json $resultFile @{status='applying';version=$plan.version;nonce=$plan.nonce}
  foreach($name in @($old.files.path)+@('update-files.json')){Move-File (Safe-Path $install $name) (Safe-Path $rollback $name);$oldMoved.Add($name)}
  foreach($name in @($new.files.path)+@('update-files.json')){
    $destination=Safe-Path $install $name
    if(Test-Path -LiteralPath $destination){throw 'New runtime conflicts with a user file'}
    Move-File (Safe-Path $stage $name) $destination;$newMoved.Add($name)
  }
  $newProcess=Start-Process -FilePath $exe -ArgumentList ('--update-transaction='+$plan.nonce) -WorkingDirectory $install -WindowStyle Hidden -PassThru
  $deadline=[DateTime]::UtcNow.AddSeconds(60);$healthy=$false
  do{
    $marker=Join-Path $txn 'healthy.json'
    if(Test-Path -LiteralPath $marker){$health=[IO.File]::ReadAllText($marker)|ConvertFrom-Json;if($health.nonce -eq $plan.nonce -and $health.version -eq $plan.version -and $health.pid -eq $newProcess.Id){$healthy=$true;break}}
    if($newProcess.HasExited -or [DateTime]::UtcNow -gt $deadline){break};Start-Sleep -Milliseconds 200
  }while($true)
  if(-not $healthy){throw 'Updated application did not finish startup'}
  Write-Json $resultFile @{status='success';version=$plan.version;previousVersion=$plan.currentVersion;nonce=$plan.nonce;checkedAt=[DateTime]::UtcNow.ToString('o')}
  # Prune only validated generated runtime copies; keep the immediate rollback.
  if((Hash $zipFile) -eq $plan.zipSha256){[IO.File]::Delete($zipFile)};Remove-Empty $stage
  foreach($other in Get-ChildItem -LiteralPath $transactions -Directory -Force){
    if($other.Name -eq $plan.nonce -or $other.Name -cnotmatch '^[a-f0-9]{32}$' -or ($other.Attributes -band [IO.FileAttributes]::ReparsePoint)){continue}
    try{
      $otherPlan=[IO.File]::ReadAllText((Join-Path $other.FullName 'plan.json'))|ConvertFrom-Json
      $otherResult=[IO.File]::ReadAllText((Join-Path $other.FullName 'result.json'))|ConvertFrom-Json
      if($otherPlan.product -eq $plan.product -and $otherPlan.installRoot -eq $install -and $otherResult.status -eq 'success'){Remove-Managed (Join-Path $other.FullName 'rollback') $otherPlan.currentVersion}
    }catch{# Uncertain or user-modified recovery material is preserved.
    }
  }
  exit 0
}catch{
  $message=$_.Exception.Message
  if($Mode -eq 'Apply'){
    $failureDir=Join-Path $cache 'failures';No-Links $failureDir;[IO.Directory]::CreateDirectory($failureDir)|Out-Null
    Write-Json (Join-Path $failureDir ($plan.version+'.json')) @{version=$plan.version;nonce=$plan.nonce;reason=$message}
    $canRestore=$true
    if($newProcess -and -not $newProcess.HasExited){$null=$newProcess.CloseMainWindow();$canRestore=$newProcess.WaitForExit(4000)}
    if($canRestore){
      try{
        $checkedDirs.Clear()
        foreach($name in $newMoved){$file=Safe-Path $install $name;if(Test-Path -LiteralPath $file){Move-File $file (Safe-Path $stage $name)}}
        foreach($name in $oldMoved){Move-File (Safe-Path $rollback $name) (Safe-Path $install $name)}
        Write-Json $resultFile @{status='rolled-back';version=$plan.version;nonce=$plan.nonce;reason=$message}
        if($oldMoved.Count){Start-Process -FilePath $exe -WorkingDirectory $install -WindowStyle Hidden|Out-Null}
      }catch{Write-Json $resultFile @{status='needs-recovery';version=$plan.version;nonce=$plan.nonce;reason=$message}}
    }else{Write-Json $resultFile @{status='needs-recovery';version=$plan.version;nonce=$plan.nonce;reason=$message}}
  }else{Write-Json $resultFile @{status='failed';version=$plan.version;nonce=$plan.nonce;reason=$message}}
  [Console]::Error.WriteLine($message);exit 1
}
