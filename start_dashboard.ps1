$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$pythonPath = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) {
    throw "Virtual environment not found at .venv. Run: python -m venv .venv; .\.venv\Scripts\python -m pip install -r requirements.txt"
}

$existingProcesses = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -like "python*" -and $_.CommandLine -like "*SOC_Dashboard*app.py*" }
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
Start-Sleep -Seconds 2

try {
    $resp = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/summary" -TimeoutSec 5
    if ($resp.StatusCode -eq 200) {
        Set-Content -Path (Join-Path $PSScriptRoot "data\server.pid") -Value $proc.Id
        Write-Output "Dashboard started: http://127.0.0.1:5000 (PID $($proc.Id))"
    } else {
        throw "Unexpected status code: $($resp.StatusCode)"
    }
} catch {
    if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) {
        Stop-Process -Id $proc.Id
    }
    throw "Dashboard failed to start: $($_.Exception.Message)"
}
