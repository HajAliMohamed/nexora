# reset-db.ps1
# Wipes all application data from the Nexora database (keeps schema/tables intact)
# Then seeds the admin account with the Agency plan via the API.

$DB_URL = "postgresql://nexora:nexora@localhost:5433/nexora"
$API_URL = "http://localhost:3001"

# ─── Parse connection info ────────────────────────────────────────────────────
$uri = [System.Uri]$DB_URL.Replace("postgresql://", "http://")
$userInfo = $uri.UserInfo -split ":"
$DB_USER = $userInfo[0]
$DB_PASS = $userInfo[1]
$DB_HOST = $uri.Host
$DB_PORT = $uri.Port
$DB_NAME = $uri.AbsolutePath.TrimStart("/")

$env:PGPASSWORD = $DB_PASS

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Nexora DB Reset + Admin Seed Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Truncate all tables (preserves schema) ──────────────────────────
Write-Host "[1/2] Wiping all data from database '$DB_NAME'..." -ForegroundColor Yellow

$SQL = @"
DO `$`$
DECLARE
    r RECORD;
BEGIN
    -- Disable all foreign key checks temporarily
    EXECUTE 'SET session_replication_role = replica';

    FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    EXECUTE 'SET session_replication_role = DEFAULT';
END `$`$;
"@

$result = docker exec nexora-db psql -U $DB_USER -d $DB_NAME -c $SQL 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK — All tables cleared successfully." -ForegroundColor Green
} else {
    Write-Host "  WARN — Could not clear via docker, trying direct psql..." -ForegroundColor Yellow
    # Fallback: direct psql if postgres is reachable without docker
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $SQL 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR — Failed to wipe database. Is PostgreSQL running?" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK — All tables cleared successfully." -ForegroundColor Green
}

# ─── Step 2: Seed admin account with Agency plan ─────────────────────────────
Write-Host ""
Write-Host "[2/2] Creating admin account with Agency plan..." -ForegroundColor Yellow

Start-Sleep -Seconds 1

try {
    $response = Invoke-RestMethod -Method POST -Uri "$API_URL/auth/seed-admin" -ContentType "application/json" -ErrorAction Stop
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  SUCCESS!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Admin account ready:" -ForegroundColor White
    Write-Host "  Email    : $($response.email)" -ForegroundColor Cyan
    Write-Host "  Password : changeme123" -ForegroundColor Cyan
    Write-Host "  Plan     : $($response.plan)" -ForegroundColor Cyan
    Write-Host "  Created  : $($response.created)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  The database is clean and ready for the client." -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "  ERROR — Could not seed admin account." -ForegroundColor Red
    Write-Host "  Make sure the API is running on $API_URL" -ForegroundColor Yellow
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}
