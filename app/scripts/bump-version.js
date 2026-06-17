import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const type = process.argv[2] || 'patch'; // Options: 'patch', 'minor', 'major'

const packageJsonPath = path.join(__dirname, '../package.json');
const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');

try {
  // Read package.json
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let newVersion;

  if (/^\d+\.\d+\.\d+$/.test(type)) {
      newVersion = type;
  } else {
      let [major, minor, patch] = pkg.version.split('.').map(Number);
      if (type === 'major') {
          major++;
          minor = 0;
          patch = 0;
      } else if (type === 'minor') {
          minor++;
          patch = 0;
      } else {
          patch++;
      }
      newVersion = `${major}.${minor}.${patch}`;
  }

  // Update package.json
  pkg.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ Updated package.json to v${newVersion}`);

  // Update tauri.conf.json
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`✅ Updated tauri.conf.json to v${newVersion}`);

  console.log(`🚀 Version successfully bumped to ${newVersion}`);
} catch (error) {
  console.error("❌ Failed to bump version:", error);
  process.exit(1);
}
