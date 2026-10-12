# Starts the backend with the variables from backend/.env (Windows PowerShell).
# Usage, from the backend folder:  .\run-dev.ps1
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "backend/.env not found. Copy .env.example to .env and fill it in."
    exit 1
}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $name, $value = $line.Split("=", 2)
        [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
    }
}
if (-not [Environment]::GetEnvironmentVariable("JAVA_TOOL_OPTIONS", "Process")) {
    [Environment]::SetEnvironmentVariable("JAVA_TOOL_OPTIONS", "-Duser.timezone=Asia/Kolkata", "Process")
}
Set-Location $PSScriptRoot
& .\mvnw.cmd spring-boot:run
