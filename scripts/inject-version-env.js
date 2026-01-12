/**
 * Inject Version Environment Script
 * This script injects version information into environment variables
 * during the build process.
 */

const fs = require('fs');
const path = require('path');

// Get version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const version = packageJson.version || '0.0.0';
const buildTime = new Date().toISOString();

console.log(`📦 Version: ${version}`);
console.log(`🕐 Build Time: ${buildTime}`);

// Create or update .env.local with version info
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Remove existing version entries
envContent = envContent
  .split('\n')
  .filter(line => !line.startsWith('NEXT_PUBLIC_APP_VERSION=') && !line.startsWith('NEXT_PUBLIC_BUILD_TIME='))
  .join('\n');

// Add new version entries
envContent += `\nNEXT_PUBLIC_APP_VERSION=${version}`;
envContent += `\nNEXT_PUBLIC_BUILD_TIME=${buildTime}\n`;

fs.writeFileSync(envPath, envContent.trim() + '\n');

console.log('✅ Version environment variables injected successfully');
