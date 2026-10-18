param([switch]$DebugBuild, [int]$VersionCode=0, [string]$VersionName='')
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$sdk=Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$jbr='C:/Program Files/Android/Android Studio/jbr'
if(!(Test-Path -LiteralPath "$sdk/platforms/android-36/android.jar")){throw 'Android SDK 36 is required.'}
if(!(Test-Path -LiteralPath "$jbr/bin/java.exe")){throw 'JDK 17+ is required. Install Android Studio.'}
$env:JAVA_HOME=$jbr
$env:ANDROID_HOME=$sdk
$config=Join-Path $projectRoot 'mobile/android/keystore.properties'
if(!$DebugBuild -and !(Test-Path -LiteralPath $config)){
    $privateDir=Join-Path $env:LOCALAPPDATA 'PokemonIdleSigning'
    [IO.Directory]::CreateDirectory($privateDir)|Out-Null
    $keyPath=Join-Path $privateDir 'pokemon-idle-release.jks'
    if(Test-Path -LiteralPath $keyPath){throw 'Existing signing key found. Restore keystore.properties instead of replacing the key.'}
    $bytes=New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $password=[Convert]::ToBase64String($bytes)
    $env:POKEMON_KEY_PASSWORD=$password
    $props="storeFile=$($keyPath.Replace('\','/'))`nstorePassword=$password`nkeyAlias=pokemon-idle`nkeyPassword=$password`n"
    [IO.File]::WriteAllText($config,$props,(New-Object Text.UTF8Encoding $false))
    $ErrorActionPreference='Continue'
    & "$jbr/bin/keytool.exe" -genkeypair -keystore $keyPath -storepass:env POKEMON_KEY_PASSWORD -keypass:env POKEMON_KEY_PASSWORD -alias pokemon-idle -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Bakzzi Pokemon Idle' 2>&1 | Out-Null
    $keyResult=$LASTEXITCODE
    $ErrorActionPreference='Stop'
    if($keyResult -ne 0){throw 'Signing key generation failed. Local key/config files were preserved.'}
    # Limit this local signing folder to the current Windows account and SYSTEM.
    & icacls.exe $privateDir /inheritance:r /grant:r "$($env:USERDOMAIN)\$($env:USERNAME):(OI)(CI)F" 'SYSTEM:(OI)(CI)F' | Out-Null
    Remove-Item Env:POKEMON_KEY_PASSWORD
    Write-Output 'Created a private release key. Preserve the signing folder and ignored keystore.properties.'
}
Push-Location (Join-Path $projectRoot 'mobile/android')
try{
    $buildArgs=@('--no-daemon','--console=plain')
    if($VersionCode -gt 0){$buildArgs+="-PapkVersionCode=$VersionCode"}
    if($VersionName){$buildArgs+="-PapkVersionName=$VersionName"}
    $buildArgs+= $(if($DebugBuild){'assembleDebug'}else{'assembleRelease'})
    & ./gradlew.bat @buildArgs
    if($LASTEXITCODE -ne 0){throw 'Android build failed.'}
}finally{Pop-Location}
