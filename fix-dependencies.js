const fs = require('fs');
const path = require('path');

// Read the package.json file
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Update the dependencies
packageJson.dependencies['react-native-safe-area-context'] = '4.7.4';
packageJson.dependencies['@rneui/base'] = '4.0.0-rc.7';
packageJson.dependencies['@rneui/themed'] = '4.0.0-rc.8';

// Write the updated package.json file
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('Dependencies updated successfully!');
console.log('Now run: npm install --legacy-peer-deps');
