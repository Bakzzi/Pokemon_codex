param([switch]$WithBuild)
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$jbr='C:/Program Files/Android/Android Studio/jbr'
Push-Location $projectRoot
try{
    & node mobile/scripts/build-web.cjs
    if($LASTEXITCODE -ne 0){throw 'Web bundle failed.'}
    & node --test mobile/test/progression.test.cjs mobile/test/update-install.test.cjs mobile/test/background.test.cjs mobile/test/adventure.test.cjs mobile/test/rivals.test.cjs mobile/test/rescue.test.cjs mobile/test/silph.test.cjs
    if($LASTEXITCODE -ne 0){throw 'Progression checks failed.'}
    $testOutput=Join-Path $projectRoot 'desktop/.smoke/mobile-tests'
    [IO.Directory]::CreateDirectory($testOutput)|Out-Null
    & "$jbr/bin/javac.exe" -d $testOutput mobile/android/app/src/main/java/io/github/bakzzi/pokemonidle/StepLedger.java mobile/android/app/src/main/java/io/github/bakzzi/pokemonidle/WalkingCounter.java mobile/test/StepLedgerTest.java mobile/test/WalkingCounterTest.java
    if($LASTEXITCODE -ne 0){throw 'Step ledger compilation failed.'}
    & "$jbr/bin/java.exe" -cp $testOutput StepLedgerTest
    if($LASTEXITCODE -ne 0){throw 'Step ledger checks failed.'}
    & "$jbr/bin/java.exe" -cp $testOutput WalkingCounterTest
    if($LASTEXITCODE -ne 0){throw 'Walking counter checks failed.'}
    if($WithBuild){
        & ./mobile/scripts/build-android.ps1
        if($LASTEXITCODE -ne 0){throw 'APK build failed.'}
        $env:JAVA_HOME=$jbr;$env:ANDROID_HOME=Join-Path $env:LOCALAPPDATA 'Android/Sdk'
        Push-Location mobile/android
        try { & ./gradlew.bat lintRelease assembleReleaseAndroidTest --no-daemon --console=plain; if($LASTEXITCODE -ne 0){throw 'Android lint/tests build failed.'} } finally{Pop-Location}
    }
}finally{Pop-Location}
