$ErrorActionPreference='Stop'
# Sources are kept byte-for-byte. Frames are rendered by the shared UI so a
# rebuild cannot restore the historical overworld portraits over the new art.
& node (Join-Path $PSScriptRoot 'check-npc-portraits.cjs')
if($LASTEXITCODE -ne 0){throw 'Full-body NPC source verification failed.'}
