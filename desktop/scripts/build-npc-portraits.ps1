$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$source=Join-Path $repo 'reference/npc-portraits'
$manifest=Get-Content (Join-Path $source 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
# Extract the original front-facing frame. Preserve every source pixel and
# palette colour; only the sheet's background colour becomes transparent.
foreach($entry in $manifest.sprites){
 $file=Join-Path $source $entry.file
 if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLower() -ne $entry.sha256){throw "Source changed: $file"}
 $sheet=[Drawing.Bitmap]::new($file)
 $frame=[Drawing.Bitmap]::new(32,32,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 try{
  $background=$sheet.GetPixel(0,0).ToArgb()
  for($y=0;$y -lt $entry.height;$y++){for($x=0;$x -lt $entry.width;$x++){
   $colour=$sheet.GetPixel($x,$y)
   if($colour.ToArgb() -ne $background){$frame.SetPixel($x+8,$y+(32-$entry.height),$colour)}
  }}
  $target=Join-Path $repo ('desktop/assets/trainers/battle/'+$entry.id+'.png')
  $frame.Save($target,[Drawing.Imaging.ImageFormat]::Png)
 }finally{$frame.Dispose();$sheet.Dispose()}
}
