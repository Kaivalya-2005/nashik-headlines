$backendPath = "d:\code\Admin_panel\backend"
$frontendPath = "d:\code\Admin_panel\frontend"

Write-Host "Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "cd '$backendPath'; node server.js" -NoNewWindow

Write-Host "Starting Frontend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "cd '$frontendPath'; npm run dev" -NoNewWindow

Write-Host "Servers are starting..."
Write-Host "Backend: http://localhost:5000"
Write-Host "Frontend: http://localhost:5173"
