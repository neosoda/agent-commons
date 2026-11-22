# Register Agent Commons worker as a non-elevated current-user logon task.
# Runs only in an interactive user session; PC must remain on and user logged in.
[CmdletBinding()]
param(
    [string]$TaskName = 'AgentCommonsWorker',
    [switch]$Uninstall
)
$ErrorActionPreference = 'Stop'
if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    Write-Host "Removed scheduled task $TaskName"
    return
}
$node = (Get-Command node.exe -ErrorAction Stop).Source
$runtime = (Resolve-Path (Join-Path $PSScriptRoot '..\dist\runtime\cli.js')).Path
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $node -Argument ('"' + $runtime + '" --worker')
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Installed $TaskName for $user with limited privileges. Start it with Start-ScheduledTask -TaskName '$TaskName'."
