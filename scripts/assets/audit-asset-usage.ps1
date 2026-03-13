[CmdletBinding()]
param(
  [string]$AssetsRoot = "",
  [string]$SourceCodeRoot = "",
  [string]$SummaryPath = "",
  [string]$UnreferencedCsvPath = "",
  [string]$ZodiacVariantCsvPath = ""
)

$ErrorActionPreference = "Stop"

function Convert-ToWebPath {
  param(
    [Parameter(Mandatory = $true)][string]$AbsolutePath,
    [Parameter(Mandatory = $true)][string]$PublicRoot
  )
  $relative = $AbsolutePath.Replace($PublicRoot + '\', '').Replace('\', '/')
  return "/$relative"
}

function Resolve-AssetFilePath {
  param(
    [Parameter(Mandatory = $true)][string]$WebPath,
    [Parameter(Mandatory = $true)][string]$PublicRoot
  )
  return Join-Path $PublicRoot ($WebPath.TrimStart('/').Replace('/', '\'))
}

function Get-FileHashSafe {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return '' }
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if ([string]::IsNullOrWhiteSpace($AssetsRoot)) {
  $AssetsRoot = Join-Path $repoRoot 'public\assets'
}
if ([string]::IsNullOrWhiteSpace($SourceCodeRoot)) {
  $SourceCodeRoot = Join-Path $repoRoot 'src'
}
if ([string]::IsNullOrWhiteSpace($SummaryPath)) {
  $SummaryPath = Join-Path $repoRoot 'docs\assets\asset-usage-summary.json'
}
if ([string]::IsNullOrWhiteSpace($UnreferencedCsvPath)) {
  $UnreferencedCsvPath = Join-Path $repoRoot 'docs\assets\asset-usage-unreferenced.csv'
}
if ([string]::IsNullOrWhiteSpace($ZodiacVariantCsvPath)) {
  $ZodiacVariantCsvPath = Join-Path $repoRoot 'docs\assets\zodiac-variant-index.csv'
}

$publicRoot = Join-Path $repoRoot 'public'
if (-not (Test-Path -LiteralPath $AssetsRoot)) {
  throw "Assets root not found: $AssetsRoot"
}
if (-not (Test-Path -LiteralPath $SourceCodeRoot)) {
  throw "Source code root not found: $SourceCodeRoot"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $SummaryPath) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $UnreferencedCsvPath) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ZodiacVariantCsvPath) | Out-Null

$assetFiles = @(Get-ChildItem -LiteralPath $AssetsRoot -Recurse -File)
$assetWebSet = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
$assetByWebPath = @{}
foreach ($assetFile in $assetFiles) {
  $webPath = Convert-ToWebPath -AbsolutePath $assetFile.FullName -PublicRoot $publicRoot
  $assetWebSet.Add($webPath) | Out-Null
  $assetByWebPath[$webPath] = $assetFile.FullName
}

$codeFiles = @(Get-ChildItem -LiteralPath $SourceCodeRoot -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.mjs,*.cjs)
$assetReferenceSet = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
$pathRegex = [regex]'/assets/[A-Za-z0-9_\-./]+'

foreach ($codeFile in $codeFiles) {
  $content = Get-Content -LiteralPath $codeFile.FullName -Raw
  $matches = $pathRegex.Matches($content)
  foreach ($match in $matches) {
    $rawReference = $match.Value
    if ($rawReference.EndsWith('/')) {
      continue
    }
    $assetReferenceSet.Add($rawReference) | Out-Null
  }
}

$assetReferences = @($assetReferenceSet)
$existingReferences = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
$missingReferences = New-Object System.Collections.Generic.List[string]

foreach ($reference in $assetReferences) {
  if ($assetWebSet.Contains($reference)) {
    $existingReferences.Add($reference) | Out-Null
  } else {
    $missingReferences.Add($reference) | Out-Null
  }
}

$scrapedFiles = $assetByWebPath.Keys | Where-Object { $_ -like '/assets/scraped/*' } | Sort-Object
$unreferencedScraped = New-Object System.Collections.Generic.List[object]
foreach ($scrapedWebPath in $scrapedFiles) {
  if (-not $existingReferences.Contains($scrapedWebPath)) {
    $unreferencedScraped.Add([PSCustomObject]@{
        web_path = $scrapedWebPath
        absolute_path = $assetByWebPath[$scrapedWebPath]
      }) | Out-Null
  }
}

$signs = @('aquarius', 'aries', 'cancer', 'capricorn', 'gemini', 'leo', 'libra', 'pisces', 'sagittarius', 'scorpio', 'taurus', 'virgo')
$zodiacRows = New-Object System.Collections.Generic.List[object]
foreach ($sign in $signs) {
  $canonicalPath = Join-Path $AssetsRoot "zodiac\$sign.png"
  $canonicalHash = Get-FileHashSafe -Path $canonicalPath
  $variantDir = Join-Path $AssetsRoot "scraped\zodiac\signs\$sign\variants"
  $variants = @()
  if (Test-Path -LiteralPath $variantDir) {
    $variants = @(Get-ChildItem -LiteralPath $variantDir -File | Sort-Object Name)
  }

  foreach ($variant in $variants) {
    $variantHash = Get-FileHashSafe -Path $variant.FullName
    $zodiacRows.Add([PSCustomObject]@{
        sign = $sign
        canonical_web_path = "/assets/zodiac/$sign.png"
        canonical_exists = (Test-Path -LiteralPath $canonicalPath)
        canonical_matches_variant = ($canonicalHash -ne '' -and $canonicalHash -eq $variantHash)
        variant_web_path = Convert-ToWebPath -AbsolutePath $variant.FullName -PublicRoot $publicRoot
        variant_file = $variant.Name
      }) | Out-Null
  }
}

$zodiacVariantCounts = $zodiacRows |
  Group-Object sign |
  Sort-Object Name |
  ForEach-Object {
    [PSCustomObject]@{
      sign = $_.Name
      variant_count = $_.Count
      canonical_match_count = (@($_.Group | Where-Object { $_.canonical_matches_variant }).Count)
    }
  }

$summary = [PSCustomObject]@{
  assets_root = $AssetsRoot
  source_code_root = $SourceCodeRoot
  total_assets = $assetFiles.Count
  total_scraped_assets = $scrapedFiles.Count
  total_unique_asset_references_in_code = $assetReferences.Count
  existing_asset_references = $existingReferences.Count
  missing_asset_references = $missingReferences.Count
  missing_asset_reference_paths = @($missingReferences | Sort-Object)
  scraped_assets_not_directly_referenced = $unreferencedScraped.Count
  scraped_assets_not_directly_referenced_sample = @($unreferencedScraped | Select-Object -First 120)
  zodiac_variant_counts = $zodiacVariantCounts
  unreferenced_csv = $UnreferencedCsvPath
  zodiac_variant_csv = $ZodiacVariantCsvPath
}

$unreferencedCsv = $unreferencedScraped | ConvertTo-Csv -NoTypeInformation
Set-Content -LiteralPath $UnreferencedCsvPath -Value $unreferencedCsv -Encoding UTF8

$zodiacCsv = $zodiacRows | ConvertTo-Csv -NoTypeInformation
Set-Content -LiteralPath $ZodiacVariantCsvPath -Value $zodiacCsv -Encoding UTF8

$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $SummaryPath -Encoding UTF8

Write-Output "Audited assets in $AssetsRoot"
Write-Output "Unique asset refs in code: $($assetReferences.Count)"
Write-Output "Missing refs: $($missingReferences.Count)"
Write-Output "Unreferenced scraped assets: $($unreferencedScraped.Count)"
Write-Output "Summary: $SummaryPath"
