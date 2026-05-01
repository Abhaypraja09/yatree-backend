cd c:\Users\ABHAY\OneDrive\Desktop\TEXI\taxi-fleet-crm\client
Write-Host "Building frontend..."
npm run build
Write-Host "Removing old backend dist..."
Remove-Item -Recurse -Force c:\Users\ABHAY\OneDrive\Desktop\TEXI\taxi-fleet-crm\backend\dist
Write-Host "Copying new dist to backend..."
Copy-Item -Path c:\Users\ABHAY\OneDrive\Desktop\TEXI\taxi-fleet-crm\client\dist -Destination c:\Users\ABHAY\OneDrive\Desktop\TEXI\taxi-fleet-crm\backend\dist -Recurse
cd c:\Users\ABHAY\OneDrive\Desktop\TEXI\taxi-fleet-crm\backend
Write-Host "Committing and Pushing backend..."
git add .
git commit -m "chore: full deployment update including dist and src"
git push origin main -f
Write-Host "Done pushing to backend!"
