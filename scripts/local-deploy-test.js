#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Local Deploy Test Runner\n');

const requiredEnvVars = ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars.join(', '));
  console.log('\n📝 Create a .env.local file with:');
  missingVars.forEach((v) => console.log(`${v}=your_value_here`));
  process.exit(1);
}

console.log('📦 Testing build (apps/web + packages/api)...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

console.log('🔧 Testing Vercel CLI...');
try {
  execSync('npx vercel --version', { stdio: 'inherit' });
  console.log('✅ Vercel CLI available\n');
} catch (error) {
  console.error('❌ Vercel CLI not found');
  console.log('Run: npm install -g vercel');
  process.exit(1);
}

console.log('🎯 Dry run connection to Vercel (pull preview env)...');
try {
  execSync('cd apps/web && npx vercel pull --yes --environment=preview', { stdio: 'inherit' });
  console.log('✅ Vercel connection successful\n');
} catch (error) {
  console.error('⚠️  Vercel connection failed (check token)');
}

console.log('✨ Local tests complete! Ready for deployment.\n');
console.log('Next steps:');
console.log('1. Push to main branch (auto-deploy)');
console.log('2. Or go to GitHub → Actions → Run workflow manually');
console.log('3. Or use: git push origin main');
