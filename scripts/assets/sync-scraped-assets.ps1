[CmdletBinding()]
param(
  [string]$SourceRoot = "",
  [string]$DestinationRoot = "",
  [string]$ManifestPath = "",
  [string]$SummaryPath = ""
)

$ErrorActionPreference = "Stop"

function Test-AnyPattern {
  param(
    [Parameter(Mandatory = $true)][string]$InputText,
    [Parameter(Mandatory = $true)][string[]]$Patterns
  )
  foreach ($pattern in $Patterns) {
    if ($InputText -match $pattern) {
      return $true
    }
  }
  return $false
}

function Get-NormalizedStem {
  param([Parameter(Mandatory = $true)][string]$FileName)
  return [System.IO.Path]::GetFileNameWithoutExtension($FileName).ToLowerInvariant()
}

function Test-RawHashStem {
  param([Parameter(Mandatory = $true)][string]$Stem)
  if ($Stem -match '^[0-9a-f]{12,64}$') { return $true }
  if ($Stem -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') { return $true }
  return $false
}

function Get-SignFromStem {
  param([Parameter(Mandatory = $true)][string]$Stem)
  $slug = ($Stem -replace '[^a-z0-9]+', '-').Trim('-')
  $signs = @(
    'aquarius', 'aries', 'cancer', 'capricorn', 'gemini', 'leo',
    'libra', 'pisces', 'sagittarius', 'scorpio', 'scorpion', 'taurus', 'virgo'
  )
  foreach ($sign in $signs) {
    if ($slug -match "(^|-)$sign(-|$)") {
      if ($sign -eq 'scorpion') { return 'scorpio' }
      return $sign
    }
  }
  return $null
}

function Get-PlanetFromStem {
  param([Parameter(Mandatory = $true)][string]$Stem)
  $slug = ($Stem -replace '[^a-z0-9]+', '-').Trim('-')
  $planets = @('ascendant', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto')
  foreach ($planet in $planets) {
    if ($slug -match "(^|-)$planet(-|$)") {
      return $planet
    }
  }
  return $null
}

function Get-CategoryForFile {
  param(
    [Parameter(Mandatory = $true)][string]$FileName,
    [Parameter(Mandatory = $true)][string]$FileExt
  )

  $stem = Get-NormalizedStem -FileName $FileName
  $slug = ($stem -replace '[^a-z0-9]+', '-').Trim('-')

  if ($FileExt -in @('.mp4', '.mov', '.webm', '.avi', '.m4v')) {
    return 'videos'
  }

  if (Test-RawHashStem -Stem $stem) {
    return 'misc/raw-hash'
  }

  $sign = Get-SignFromStem -Stem $stem
  if ($null -ne $sign) {
    return "zodiac/signs/$sign/variants"
  }

  $altHoroscope = @{
    'indian-lunar' = @('(^|-)indian-lunar(-|$)', '(^|-)lunar(-|$)')
    'indian-solar' = @('(^|-)indian-solar(-|$)', '(^|-)solar(-|$)')
    'chinese' = @('(^|-)chinese(-|$)')
    'mayan' = @('(^|-)mayan(-|$)')
    'druid' = @('(^|-)druid(-|$)')
  }
  foreach ($key in $altHoroscope.Keys) {
    if (Test-AnyPattern -InputText $slug -Patterns $altHoroscope[$key]) {
      return "today/horoscope/alternatives/$key"
    }
  }

  if (Test-AnyPattern -InputText $slug -Patterns @(
      '(^|-)new-moon(-|$)', '(^|-)waxing-crescent(-|$)', '(^|-)first-quarter(-|$)',
      '(^|-)waxing-gibbous(-|$)', '(^|-)full-moon(-|$)', '(^|-)waning-gibbous(-|$)',
      '(^|-)last-quarter(-|$)', '(^|-)waning-crescent(-|$)', '(^|-)gibbous(-|$)', '(^|-)crescent(-|$)', '(^|-)quarter(-|$)'
    )) {
    return 'today/moon/phases/variants'
  }

  if (Test-AnyPattern -InputText $slug -Patterns @(
      '(^|-)retrograde(-|$)', '(^|-)transit(-|$)', '(^|-)event(-|$)', '(^|-)aspect(-|$)',
      '(^|-)opposition(-|$)', '(^|-)sextile(-|$)', '(^|-)conjunction(-|$)', '(^|-)square(-|$)'
    )) {
    return 'today/events/variants'
  }

  if (Test-AnyPattern -InputText $slug -Patterns @(
      '(^|-)waning-gibbous(-|$)', '(^|-)moon-in(-|$)', '(^|-)moon-rituals(-|$)',
      '(^|-)do-dont(-|$)', '(^|-)moon-?ritual(-|$)', '(^|-)moon-phase(-|$)'
    )) {
    return 'today/moon/variants'
  }

  $planet = Get-PlanetFromStem -Stem $stem
  if ($null -ne $planet) {
    return "astronomy/planets/$planet"
  }

  if (Test-AnyPattern -InputText $slug -Patterns @(
      '(^|-)horoscope(-|$)', '(^|-)biorhythm(s)?(-|$)', '(^|-)daily-tips(-|$)', '(^|-)dating(-|$)',
      '(^|-)daily-matches(-|$)', '(^|-)todays-luck(-|$)', '(^|-)astrocartography(-|$)',
      '(^|-)magic-ball(-|$)', '(^|-)card-of-the-day(-|$)'
    )) {
    return 'today/horoscope/variants'
  }

  if (Test-AnyPattern -InputText $slug -Patterns @(
      '(^|-)advisor(-|$)', '(^|-)avatar(-|$)'
    )) {
    return 'advisors/avatars/variants'
  }

  if (Test-AnyPattern -InputText $slug -Patterns @(
      '(^|-)palm(-|$)', '(^|-)heart-line(-|$)', '(^|-)head-line(-|$)', '(^|-)life-line(-|$)',
      '(^|-)fate-line(-|$)', '(^|-)left-hand(-|$)', '(^|-)right-hand(-|$)', '(^|-)rescan(-|$)',
      '(^|-)left-heart(-|$)', '(^|-)left-head(-|$)', '(^|-)left-life(-|$)', '(^|-)left-fate(-|$)',
      '(^|-)line-points(-|$)', '(^|-)default-wrong(-|$)', '(^|-)invert-wrong(-|$)'
    )) {
    return 'features/palm/variants'
  }

  if (Test-AnyPattern -InputText $slug -Patterns @(
      '(^|-)report(-|$)', '(^|-)prediction(-|$)', '(^|-)soulmate(-|$)',
      '(^|-)birth-chart(-|$)', '(^|-)compatibility(-|$)', '(^|-)natal(-|$)'
    )) {
    return 'reports/variants'
  }

  if (Test-AnyPattern -InputText $slug -Patterns @(
      '(^|-)bg(-|$)', '(^|-)background(-|$)', '(^|-)atmosphere(-|$)', '(^|-)intro-bg(-|$)',
      '(^|-)header-bg(-|$)', '(^|-)overview-bg(-|$)', '(^|-)swiper-bg(-|$)', '(^|-)match-bg(-|$)'
    )) {
    return 'backgrounds/variants'
  }

  if (Test-AnyPattern -InputText $slug -Patterns @(
      '(^|-)icon(-|$)', '(^|-)ic(-|$)', '(^|-)bullet(-|$)', '(^|-)arrow(-|$)', '(^|-)close(-|$)',
      '(^|-)send(-|$)', '(^|-)switch(-|$)', '(^|-)tap(-|$)', '(^|-)pause(-|$)', '(^|-)star(-|$)',
      '(^|-)cross(-|$)', '(^|-)marker(-|$)', '(^|-)selected(-|$)', '(^|-)inactive(-|$)',
      '(^|-)active(-|$)', '(^|-)eye(-|$)', '(^|-)medal(-|$)', '(^|-)line(-|$)'
    )) {
    return 'ui/icons/variants'
  }

  return 'misc/unclassified'
}

function Convert-ToRelativeWebPath {
  param(
    [Parameter(Mandatory = $true)][string]$AbsolutePath,
    [Parameter(Mandatory = $true)][string]$RepoRootPath
  )
  $normalized = $AbsolutePath.Replace((Join-Path $RepoRootPath 'public') + '\', '').Replace('\', '/')
  return "/$normalized"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
  $SourceRoot = Join-Path (Split-Path $repoRoot -Parent) 'astro-asset-scrapper\astro-scraper\downloaded_assets'
}
if ([string]::IsNullOrWhiteSpace($DestinationRoot)) {
  $DestinationRoot = Join-Path $repoRoot 'public\assets\scraped'
}
if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
  $ManifestPath = Join-Path $repoRoot 'docs\assets\asset-sync-manifest.csv'
}
if ([string]::IsNullOrWhiteSpace($SummaryPath)) {
  $SummaryPath = Join-Path $repoRoot 'docs\assets\asset-sync-summary.json'
}

$SourceRoot = [System.IO.Path]::GetFullPath($SourceRoot.Trim().Trim('"'))
$DestinationRoot = [System.IO.Path]::GetFullPath($DestinationRoot.Trim().Trim('"'))
$ManifestPath = [System.IO.Path]::GetFullPath($ManifestPath.Trim().Trim('"'))
$SummaryPath = [System.IO.Path]::GetFullPath($SummaryPath.Trim().Trim('"'))

$sourceImages = Join-Path $SourceRoot 'images'
$sourceVideos = Join-Path $SourceRoot 'videos'

if (-not (Test-Path -LiteralPath $sourceImages)) {
  throw "Source images path not found: $sourceImages"
}

New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ManifestPath) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $SummaryPath) | Out-Null

$sourceFiles = @(Get-ChildItem -LiteralPath $sourceImages -File)
if (Test-Path -LiteralPath $sourceVideos) {
  $sourceFiles += @(Get-ChildItem -LiteralPath $sourceVideos -File)
}

$existingFiles = @(Get-ChildItem -LiteralPath $DestinationRoot -Recurse -File)
$existingByName = @{}
foreach ($existing in $existingFiles) {
  if (-not $existingByName.ContainsKey($existing.Name)) {
    $existingByName[$existing.Name] = @()
  }
  $existingByName[$existing.Name] += $existing.FullName
}

$manifestRows = New-Object System.Collections.Generic.List[object]
$copied = 0
$moved = 0
$alreadyInPlace = 0

$sourceNames = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)

foreach ($file in $sourceFiles) {
  $sourceNames.Add($file.Name) | Out-Null
  $category = Get-CategoryForFile -FileName $file.Name -FileExt $file.Extension.ToLowerInvariant()
  $targetDir = Join-Path $DestinationRoot ($category.Replace('/', '\'))
  $targetPath = Join-Path $targetDir $file.Name
  $targetExists = Test-Path -LiteralPath $targetPath

  $action = 'already_in_place'
  $previousPath = ''

  if ($targetExists) {
    $alreadyInPlace++
  } else {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    $candidatePath = $null
    if ($existingByName.ContainsKey($file.Name)) {
      $candidatePath = $existingByName[$file.Name] | Where-Object { $_ -ne $targetPath } | Select-Object -First 1
    }

    if ($candidatePath) {
      try {
        Move-Item -LiteralPath $candidatePath -Destination $targetPath -Force
        $action = 'moved_from_existing'
        $previousPath = $candidatePath
        $moved++
        $existingByName[$file.Name] = @($targetPath)
      } catch {
        # If move is blocked by file permissions, still ensure target category has the file.
        Copy-Item -LiteralPath $file.FullName -Destination $targetPath -Force
        $action = 'copied_from_source_move_fallback'
        $copied++
        $existingByName[$file.Name] += $targetPath
      }
    } else {
      Copy-Item -LiteralPath $file.FullName -Destination $targetPath -Force
      $action = 'copied_from_source'
      $copied++
      if ($existingByName.ContainsKey($file.Name)) {
        $existingByName[$file.Name] += $targetPath
      } else {
        $existingByName[$file.Name] = @($targetPath)
      }
    }
  }

  $manifestRows.Add([PSCustomObject]@{
      file_name = $file.Name
      normalized_stem = Get-NormalizedStem -FileName $file.Name
      category = $category
      action = $action
      source_path = $file.FullName
      previous_path = $previousPath
      destination_path = $targetPath
      destination_web_path = Convert-ToRelativeWebPath -AbsolutePath $targetPath -RepoRootPath $repoRoot
    }) | Out-Null
}

# Remove empty directories left after move operations.
Get-ChildItem -LiteralPath $DestinationRoot -Recurse -Directory |
  Sort-Object FullName -Descending |
  ForEach-Object {
    if ((Get-ChildItem -LiteralPath $_.FullName -Force | Measure-Object).Count -eq 0) {
      Remove-Item -LiteralPath $_.FullName -Force
    }
  }

$destinationFiles = @(Get-ChildItem -LiteralPath $DestinationRoot -Recurse -File)
$missingAfterSync = @()
foreach ($sourceName in $sourceNames) {
  if (-not ($destinationFiles.Name -contains $sourceName)) {
    $missingAfterSync += $sourceName
  }
}

$extrasInDestination = @()
foreach ($destinationFile in $destinationFiles) {
  if (-not $sourceNames.Contains($destinationFile.Name)) {
    $extrasInDestination += $destinationFile.Name
  }
}

$categoryCounts = $manifestRows |
  Group-Object category |
  Sort-Object Name |
  ForEach-Object {
    [PSCustomObject]@{
      name = $_.Name
      count = $_.Count
    }
  }

$summary = [PSCustomObject]@{
  source_root = $SourceRoot
  destination_root = $DestinationRoot
  source_files = $sourceFiles.Count
  destination_files_after_sync = $destinationFiles.Count
  copied_from_source = $copied
  moved_from_existing = $moved
  already_in_place = $alreadyInPlace
  missing_in_destination_after_sync = $missingAfterSync.Count
  extra_files_in_destination_not_from_source = ($extrasInDestination | Sort-Object -Unique).Count
  categories = $categoryCounts
  manifest_csv = $ManifestPath
}

$csvLines = $manifestRows | ConvertTo-Csv -NoTypeInformation
Set-Content -LiteralPath $ManifestPath -Value $csvLines -Encoding UTF8
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $SummaryPath -Encoding UTF8

Write-Output "Synced $($sourceFiles.Count) source files into $DestinationRoot"
Write-Output "Copied: $copied | Moved: $moved | Already in place: $alreadyInPlace"
Write-Output "Missing after sync: $($missingAfterSync.Count)"
Write-Output "Manifest: $ManifestPath"
Write-Output "Summary: $SummaryPath"
