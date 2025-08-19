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
      const dev = spawn('npm', ['run', 'dev'], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, PORT: '3001' },
      });
      // Wait until API is ready (up to ~60s)
      const waitMs = 60000;
      const start = Date.now();
      // Poll /api/health for readiness
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const res = await runner.testAPI('/api/health', { expectedStatus: 200 });
          if (res && res.status === 200) break;
        } catch {}
        if (Date.now() - start > waitMs) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      // Quick functional check
      return await runner.testAPI('/api/lines', { expectedStatus: 200 });
    });
  }

  if (phase === 'all' || phase === '3') {
    await runner.runTest('Homepage loads', async () => {
      return await runner.testUI('http://localhost:3002', [
        { selector: '[data-testid="map-root"]', required: true, name: 'Map Root' },
        { selector: '[data-testid="header-bar"]', required: false, name: 'Header' },
        { text: 'FleetOps', required: false, name: 'Brand Name' },
      ]);
    });
  }

  // Phase 4: UI Component Tests
  if (phase === 'all' || phase === '4') {
    await runner.runTest('UI Package exists', async () => {
      return await runner.testFile('packages/ui/package.json', [
        { contains: '"@eucorail/ui"' }
      ]);
    });
    await runner.runTest('UI Components exported', async () => {
      return await runner.testFile('packages/ui/src/index.ts', [
        { contains: 'LoadingSpinner' },
        { contains: 'ErrorBoundary' },
        { contains: 'EmptyState' }
      ]);
    });
    await runner.runTest('Tailwind config with Eucorail colors', async () => {
      return await runner.testFile('packages/ui/tailwind.config.ts', [
        { contains: 'eucorail' },
        { contains: 'primary' },
        { contains: '#0066CC' }
      ]);
    });
    await runner.runTest('Test UI page renders', async () => {
      return await runner.testUI('http://localhost:3002/test-ui', [
        { text: 'Eucorail UI Component Library', required: true },
        { text: 'Loading Spinners', required: true },
        { text: 'Empty State', required: true }
      ]);
    });
  }

  const report = runner.generateReport();
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

const phase = process.argv[2] || 'all';
runAllTests(phase).catch(console.error);
