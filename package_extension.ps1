$ProjectRoot = "c:\Users\felip\OneDrive\Documents\Projects\job-fit-analyzer"
$DistFolder = "$ProjectRoot\dist-extension"
$ZipFileName = "job-fit-analyzer-companion.zip"
$OutputPath = "$ProjectRoot\$ZipFileName"

Write-Host "1. Executando build da extensão (npm run build:extension)..."
Set-Location -Path $ProjectRoot
npm run build:extension

if (-not (Test-Path $DistFolder)) {
    Write-Error "Pasta dist-extension não encontrada após o build!"
    exit 1
}

# Remove old zip if exists
if (Test-Path $OutputPath) {
    Remove-Item $OutputPath -Force
}

Write-Host "2. Empacotando arquivos compilados de dist-extension para $ZipFileName..."
Compress-Archive -Path "$DistFolder\*" -DestinationPath $OutputPath -Force

Write-Host "✅ Extensão v1.0.1 empacotada com sucesso em: $OutputPath"
