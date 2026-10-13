@echo off
setlocal
pushd "%~dp0"
call npm.cmd ci
if errorlevel 1 goto failed
node --experimental-require-module node_modules\electron\install.js
if errorlevel 1 goto failed
echo Ready. Open "Start Pokemon.vbs".
popd
pause
exit /b 0
:failed
echo Setup failed. Node.js 22.12 or newer is recommended.
popd
pause
exit /b 1
