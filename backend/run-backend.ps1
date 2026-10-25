$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^\s*[^#=]+\s*=' } | ForEach-Object {
        $parts = $_ -split '=', 2
        $varName = $parts[0].Trim()
        $varValue = $parts[1].Trim()
        [System.Environment]::SetEnvironmentVariable($varName, $varValue, "Process")
    }
}
mvn spring-boot:run

