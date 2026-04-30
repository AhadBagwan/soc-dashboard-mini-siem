$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$pidFile = Join-Path $PSScriptRoot "data\server.pid"
$stopped = $false

$appProcesses = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -like "python*" -and $_.CommandLine -like "*SOC_Dashboard*app.py*" }
foreach ($appProcess in $appProcesses) {
    $procId = $appProcess.ProcessId
    if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
        Stop-Process -Id $procId
        Write-Output "Dashboard stopped (PID $procId)"
        $stopped = $true
    }
}

if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force
}

if (-not $stopped) {
    $listeners = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        $procId = $listener.OwningProcess
        if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
            Stop-Process -Id $procId
            Write-Output "Dashboard stopped (PID $procId)"
            $stopped = $true
        }
    }
}

if (-not $stopped) {
    Write-Output "No dashboard process found on port 5000."
}
