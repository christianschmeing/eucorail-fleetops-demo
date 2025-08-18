// run-tests.js
const TestRunner = require('./test-runner');

async function runAllTests(phase = 'all') {
  const runner = new TestRunner();
  const fs = require('fs');
  if (!fs.existsSync('test-screenshots')) fs.mkdirSync('test-screenshots');

  console.log(`\n🚀 Starting test suite for phase: ${phase}\n`);

  if (phase === 'all' || phase === '1') {
    await runner.runTest('Package.json exists', async () => {
      return await runner.testFile('package.json', [
        { contains: '"name"' },
        { contains: '"scripts"' },
      ]);
    });
    await runner.runTest('Dependencies installed', async () => {
      return await runner.testCommand('npm list --depth=0 | cat');
    });
    await runner.runTest('Build works', async () => {
      return await runner.testCommand('npm run -s build');
    });
  }

  // Phase 1.5: Code Quality Tests
  if (phase === 'all' || phase === '1.5') {
    await runner.runTest('ESLint configuration', async () => {
      return await runner.testFile('.eslintrc.json', [{ contains: '"extends"' }]);
    });
    await runner.runTest('Prettier configuration', async () => {
      return await runner.testFile('.prettierrc', [{ contains: '"singleQuote"' }]);
    });
    await runner.runTest('Linting passes', async () => {
      return await runner.testCommand('npm run -s lint');
    });
    await runner.runTest('Formatting check passes', async () => {
      return await runner.testCommand('npm run -s format:check');
    });
  }

  if (phase === 'all' || phase === '2') {
    await runner.runTest('API starts', async () => {
      const { spawn } = require('child_process');
      const api = spawn('npm', ['run', 'dev'], { detached: true, stdio: 'ignore' });
      await new Promise((resolve) => setTimeout(resolve, 6000));
      const result = await runner.testAPI('/api/lines', { expectedStatus: 200 });
      try {
        process.kill(-api.pid);
      } catch {}
      return result;
    });
  }

  if (phase === 'all' || phase === '3') {
    await runner.runTest('Homepage loads', async () => {
      return await runner.testUI('http://localhost:3001', [
        { selector: '[data-testid="map-root"]', required: true, name: 'Map Root' },
        { selector: '[data-testid="header-bar"]', required: false, name: 'Header' },
        { text: 'FleetOps', required: false, name: 'Brand Name' },
      ]);
    });
  }

  const report = runner.generateReport();
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

const phase = process.argv[2] || 'all';
runAllTests(phase).catch(console.error);
