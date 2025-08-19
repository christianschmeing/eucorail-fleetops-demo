const fs = require('fs');
const path = require('path');

// Fix apps/web/package.json
const webPkgPath = path.join(__dirname, 'apps/web/package.json');
const webPkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));

// Add UI dependency
if (!webPkg.dependencies) webPkg.dependencies = {};
webPkg.dependencies['@eucorail/ui'] = 'file:../../packages/ui';

// Ensure all needed deps are there
const requiredDeps = {
  'maplibre-gl': '^3.0.0',
  'react-map-gl': '^7.1.0',
  'clsx': '^2.1.0',
  'tailwind-merge': '^2.2.0'
};

// Do not downgrade if a newer version is already specified
for (const [dep, wanted] of Object.entries(requiredDeps)) {
  if (!webPkg.dependencies[dep]) {
    webPkg.dependencies[dep] = wanted;
  }
}

fs.writeFileSync(webPkgPath, JSON.stringify(webPkg, null, 2));

console.log('✅ Fixed apps/web/package.json');

// Fix packages/ui/package.json
const uiPkgPath = path.join(__dirname, 'packages/ui/package.json');
if (fs.existsSync(uiPkgPath)) {
  const uiPkg = JSON.parse(fs.readFileSync(uiPkgPath, 'utf8'));
  
  if (!uiPkg.main) uiPkg.main = './src/index.ts';
  if (!uiPkg.types) uiPkg.types = './src/index.ts';
  
  fs.writeFileSync(uiPkgPath, JSON.stringify(uiPkg, null, 2));
  console.log('✅ Fixed packages/ui/package.json');
}

console.log('🚀 Ready for deployment!');


