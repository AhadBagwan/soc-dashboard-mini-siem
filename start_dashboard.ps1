$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$pythonPath = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) {
    throw "Virtual environment not found at .venv. Run: python -m venv .venv; .\.venv\Scripts\python -m pip install -r requirements.txt"
}

$existingProcesses = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -like "python*" -and $_.CommandLine -like "*app.py*" }
if ($existingProcesses) {
    try {
        $resp = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/summary" -TimeoutSec 5
        if ($resp.StatusCode -eq 200) {
            Write-Output "Dashboard already running on http://127.0.0.1:5000"
            exit 0
        }
    } catch {
        foreach ($proc in $existingProcesses) {
            if (Get-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue) {
                Stop-Process -Id $proc.ProcessId
            }
        }
        Start-Sleep -Seconds 1
    }
}

$proc = Start-Process -FilePath $pythonPath -ArgumentList "app.py" -WorkingDirectory $PSScriptRoot -PassThru

$started = $false
for ($i = 0; $i -lt 5; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/summary" -TimeoutSec 3
        if ($resp.StatusCode -eq 200) {
            $started = $true
            break
        }
    } catch {
    }
}

if ($started) {
    Set-Content -Path (Join-Path $PSScriptRoot "data\server.pid") -Value $proc.Id
    Write-Output "Dashboard started: http://127.0.0.1:5000 (PID $($proc.Id))"
} else {
    if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) {
        Stop-Process -Id $proc.Id
    }
    throw "Dashboard failed to start on http://127.0.0.1:5000"
}

