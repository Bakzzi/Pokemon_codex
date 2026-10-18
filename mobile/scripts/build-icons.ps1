$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$sourcePath=Join-Path $projectRoot 'desktop/assets/items/poke-ball.png'
$expectedHash='a4c7b9e8ff5727d10e6f679bcf16a963a95b2a36480d3bd9156d9808bdf54dff'
if((Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash){throw 'The source sprite changed; review the icon before regenerating'}
$resourceRoot=Join-Path $projectRoot 'mobile/android/app/src/main/res'
$assetRoot=Join-Path $projectRoot 'mobile/assets/icon'
$encoding=[Text.UTF8Encoding]::new($false)
function Write-Asset([string]$file,[string]$content){
  $null=New-Item -ItemType Directory -Path (Split-Path -Parent $file) -Force
  [IO.File]::WriteAllText($file,$content,$encoding)
}
$sprite=[Drawing.Bitmap]::new($sourcePath)
try{
  if($sprite.Width -ne 30 -or $sprite.Height -ne 30){throw 'Unexpected source dimensions'}
  $groups=[ordered]@{}
  for($y=6;$y -le 23;$y++){
    for($x=6;$x -le 23;$x++){
      $pixel=$sprite.GetPixel($x,$y)
      if($pixel.A -eq 0){continue}
      if($pixel.A -ne 255){throw 'The source no longer has a sharp pixel palette'}
      $color='#{0:X2}{1:X2}{2:X2}' -f $pixel.R,$pixel.G,$pixel.B
      if(-not $groups.Contains($color)){$groups[$color]=[Collections.Generic.List[string]]::new()}
      $px=27+($x-6)*3;$py=27+($y-6)*3
      $groups[$color].Add("M$px,$py h3 v3 h-3 Z")
    }
  }
  $vectorHeader='<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">'
  $paths=@();$svgPaths=@();$mono=@()
  foreach($color in $groups.Keys){
    $data=$groups[$color] -join ' '
    $paths+='  <path android:fillColor="'+$color+'" android:pathData="'+$data+'" />'
    $svgPaths+='  <path fill="'+$color+'" d="'+$data+'" />'
    if($color -in @('#313131','#4A5252','#7B7B84')){$mono+=$data}
  }
  Write-Asset (Join-Path $resourceRoot 'drawable/ic_launcher_foreground.xml') ($vectorHeader+"`n"+($paths -join "`n")+"`n</vector>`n")
  Write-Asset (Join-Path $resourceRoot 'drawable/ic_launcher_monochrome.xml') ($vectorHeader+"`n"+'  <path android:fillColor="#FFFFFF" android:pathData="'+($mono -join ' ')+'" />'+"`n</vector>`n")
  Write-Asset (Join-Path $resourceRoot 'values/icon_colors.xml') "<resources>`n  <color name=`"ic_launcher_background`">#17231E</color>`n</resources>`n"
  $adaptive='<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">'+"`n"+'  <background android:drawable="@color/ic_launcher_background" />'+"`n"+'  <foreground android:drawable="@drawable/ic_launcher_foreground" />'+"`n"
  Write-Asset (Join-Path $resourceRoot 'mipmap-anydpi-v26/ic_launcher.xml') ($adaptive+"</adaptive-icon>`n")
  Write-Asset (Join-Path $resourceRoot 'mipmap-anydpi-v33/ic_launcher.xml') ($adaptive+'  <monochrome android:drawable="@drawable/ic_launcher_monochrome" />'+"`n</adaptive-icon>`n")
  $svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="18 18 72 72" shape-rendering="crispEdges">'+"`n"+'  <rect width="108" height="108" fill="#17231E" />'+"`n"+($svgPaths -join "`n")+"`n</svg>`n"
  Write-Asset (Join-Path $assetRoot 'ic_launcher.svg') $svg

  # Resource rasterization only: every opaque sprite pixel keeps its exact source color.
  $sizes=[ordered]@{'mdpi'=48;'hdpi'=72;'xhdpi'=96;'xxhdpi'=144;'xxxhdpi'=192;'preview'=512}
  $outputs=@()
  foreach($density in $sizes.Keys){
    $size=$sizes[$density];$bitmap=[Drawing.Bitmap]::new($size,$size,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try{
      for($y=0;$y -lt $size;$y++){
        for($x=0;$x -lt $size;$x++){
          $sx=[int][Math]::Floor((($x+.5)*72/$size+18-27)/3)+6
          $sy=[int][Math]::Floor((($y+.5)*72/$size+18-27)/3)+6
          $color=[Drawing.Color]::FromArgb(255,23,35,30)
          if($sx -ge 6 -and $sx -le 23 -and $sy -ge 6 -and $sy -le 23){$pixel=$sprite.GetPixel($sx,$sy);if($pixel.A -gt 0){$color=$pixel}}
          $bitmap.SetPixel($x,$y,$color)
        }
      }
      $file=if($density -eq 'preview'){Join-Path $assetRoot 'ic_launcher_preview.png'}else{Join-Path $resourceRoot ('mipmap-'+$density+'/ic_launcher.png')}
      $null=New-Item -ItemType Directory -Path (Split-Path -Parent $file) -Force
      $bitmap.Save($file,[Drawing.Imaging.ImageFormat]::Png)
      $outputs+=@{file=$file.Substring($projectRoot.Length+1).Replace('\','/');width=$size;height=$size;sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()}
    }finally{$bitmap.Dispose()}
  }
  $metadata=[ordered]@{
    source='desktop/assets/items/poke-ball.png'
    sourceUrl='https://raw.githubusercontent.com/PokeAPI/sprites/ba403973fdf9d0ac59175813861e6a1f8ed5020c/sprites/items/poke-ball.png'
    sourceSha256=$expectedHash
    attribution='Pokemon sprite via PokeAPI; see THIRD_PARTY_NOTICES.md. Not an original or AI-generated illustration.'
    background='#17231E'
    viewport=108
    launcherViewport=@{left=18;top=18;width=72;height=72}
    spriteBounds=@{left=27;top=27;right=81;bottom=81}
    originalPixelScale=3
    rasters=$outputs
  }
  Write-Asset (Join-Path $assetRoot 'source.json') (($metadata|ConvertTo-Json -Depth 6)+"`n")
  Write-Output ('Generated Android icon resources and preview: '+$assetRoot)
}finally{$sprite.Dispose()}
