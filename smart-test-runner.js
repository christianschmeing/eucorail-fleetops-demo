// smart-test-runner.js
// Robuster Test-Runner mit mehreren Strategien und automatischer Wiederherstellung

const { spawn, exec, execSync } = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');

class SmartTestRunner {
  constructor() {
    this.strategies = [
      { name: 'Standard', method: 'runStandardStrategy' },
      { name: 'Separate Processes', method: 'runSeparateProcessStrategy' },
      { name: 'Direct Node', method: 'runDirectNodeStrategy' },
      { name: 'Docker', method: 'runDockerStrategy' },
    ];
    this.currentStrategyIndex = 0;
    this.maxRetries = 3;
    this.processes = [];
    this.testResults = [];
    this.startTime = Date.now();
    this.healthCheckInterval = null;
    this.hangDetectionTimeout = null;
    this.lastHealthCheck = Date.now();
  }

  // ========== UTILITIES ==========

  async log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const emoji =
      {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        debug: '🔍',
      }[level] || '📝';

    console.log(`[${timestamp}] ${emoji} ${message}`);

    // Log to file for debugging
    const logFile = 'test-runner.log';
    fs.appendFileSync(logFile, `[${timestamp}] [${level.toUpperCase()}] ${message}\n`);
  }

  async execCommand(command, options = {}) {
    return new Promise((resolve) => {
      exec(command, { timeout: options.timeout || 10000, ...options }, (error, stdout, stderr) => {
        if (error && !options.ignoreErrors) {
          this.log(`Command failed: ${command} - ${error.message}`, 'debug');
        }
        resolve({ error, stdout, stderr });
      });
    });
  }

  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  async waitForPort(port, maxWait = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const response = await this.checkHttpEndpoint(`http://localhost:${port}`);
      if (response) return true;
      await this.sleep(1000);
    }
    return false;
  }

  async checkHttpEndpoint(url) {
    return new Promise((resolve) => {
      http
        .get(url, { timeout: 2000 }, (res) => {
          resolve(res.statusCode === 200 || res.statusCode === 404);
        })
        .on('error', () => resolve(false));
    });
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ========== CLEANUP & KILL ==========

  async killEverything() {
    this.log('Killing all processes...', 'warning');

    // Kill tracked processes
    for (const proc of this.processes) {
      try {
        if (proc && !proc.killed) {
          process.kill(-proc.pid, 'SIGKILL');
        }
      } catch (e) {
        // Process already dead
      }
    }
    this.processes = [];

    // Kill by port
    const ports = [3000, 3001, 4100, 5001];
    for (const port of ports) {
      await this.killPort(port);
    }

    // Kill by process name
    const processNames = ['node', 'next', 'tsx', 'npm'];
    for (const name of processNames) {
      await this.execCommand(`pkill -f "${name}"`, { ignoreErrors: true });
    }

    // Clean up
    await this.execCommand('rm -rf apps/web/.next', { ignoreErrors: true });
    await this.execCommand('rm -rf packages/api/dist', { ignoreErrors: true });

    await this.sleep(2000);
    this.log('Cleanup completed', 'success');
  }

  async killPort(port) {
    // Try multiple methods to kill port
    const commands = [
      `lsof -ti:${port} | xargs kill -9`,
      `fuser -k ${port}/tcp`,
      `netstat -tunlp 2>/dev/null | grep :${port} | awk '{print $7}' | cut -d'/' -f1 | xargs kill -9`,
    ];

    for (const cmd of commands) {
      await this.execCommand(cmd, { ignoreErrors: true });
    }
  }

  // ========== HANG DETECTION ==========

  startHangDetection(process, name, timeout = 60000) {
    let lastOutput = Date.now();
    let outputBuffer = '';

    const checkHang = () => {
      const now = Date.now();
      if (now - lastOutput > timeout) {
        this.log(
          `Process ${name} appears to be hanging (no output for ${timeout / 1000}s)`,
          'error'
        );
        this.handleHang(process, name);
        return true;
      }
      return false;
    };

    if (process.stdout) {
      process.stdout.on('data', (data) => {
        lastOutput = Date.now();
        outputBuffer += data.toString();

        // Check for known hang patterns
        if (this.detectHangPattern(outputBuffer)) {
          this.log(`Hang pattern detected in ${name}`, 'warning');
          this.handleHang(process, name);
        }
      });
    }

    if (process.stderr) {
      process.stderr.on('data', (data) => {
        lastOutput = Date.now();
        const text = data.toString();

        // Check for error patterns
        if (this.detectErrorPattern(text)) {
          this.log(`Error pattern detected in ${name}: ${text.substring(0, 100)}`, 'error');
          this.handleHang(process, name);
        }
      });
    }

    // Periodic hang check
    const interval = setInterval(() => {
      if (checkHang()) {
        clearInterval(interval);
      }
    }, 10000);

    process.on('exit', () => clearInterval(interval));

    return interval;
  }

  detectHangPattern(output) {
    const hangPatterns = [
      /Waiting for the debugger to disconnect/i,
      /EADDRINUSE/i,
      /Something is already running on port/i,
      /Module build failed/i,
      /Cannot find module/i,
    ];

    return hangPatterns.some((pattern) => pattern.test(output));
  }

  detectErrorPattern(output) {
    const errorPatterns = [
      /FATAL ERROR/i,
      /JavaScript heap out of memory/i,
      /Segmentation fault/i,
      /EMFILE: too many open files/i,
    ];

    return errorPatterns.some((pattern) => pattern.test(output));
  }

  handleHang(process, name) {
    this.log(`Handling hang for ${name}`, 'warning');

    try {
      // Try graceful shutdown first
      process.kill('SIGTERM');
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 5000);
    } catch (e) {
      this.log(`Error killing ${name}: ${e.message}`, 'error');
    }
  }

  // ========== HEALTH CHECKS ==========

  async startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.checkSystemHealth();

      if (!health.healthy) {
        this.log(`System unhealthy: ${health.reason}`, 'error');
        await this.recoverFromUnhealthyState(health);
      }

      this.lastHealthCheck = Date.now();
    }, 5000);
  }

  async checkSystemHealth() {
    const checks = {
      memory: await this.checkMemory(),
      diskSpace: await this.checkDiskSpace(),
      apiResponsive: await this.checkHttpEndpoint('http://localhost:4100/api/meta'),
      webResponsive: await this.checkHttpEndpoint('http://localhost:3001'),
      processesAlive: this.processes.filter((p) => !p.killed).length > 0,
    };

    const healthy = Object.values(checks).every((v) => v === true || v?.ok === true);
    const reason = Object.entries(checks)
      .filter(([_, v]) => v === false || v?.ok === false)
      .map(([k, v]) => `${k}: ${v?.reason || 'failed'}`)
      .join(', ');

    return { healthy, reason, checks };
  }

  async checkMemory() {
    try {
      const memInfo = process.memoryUsage();
      const heapUsedPercent = (memInfo.heapUsed / memInfo.heapTotal) * 100;

      if (heapUsedPercent > 90) {
        return { ok: false, reason: `Heap usage ${heapUsedPercent.toFixed(1)}%` };
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  async checkDiskSpace() {
    try {
      const result = await this.execCommand("df -h . | tail -1 | awk '{print $5}' | sed 's/%//'");
      const usagePercent = parseInt(result.stdout.trim());

      if (usagePercent > 95) {
        return { ok: false, reason: `Disk usage ${usagePercent}%` };
      }

      return { ok: true };
    } catch (e) {
      return { ok: true }; // Don't fail on disk check errors
    }
  }

  async recoverFromUnhealthyState(health) {
    this.log('Attempting recovery from unhealthy state', 'warning');

    // Clear caches
    await this.execCommand('rm -rf apps/web/.next/cache', { ignoreErrors: true });
    await this.execCommand('rm -rf node_modules/.cache', { ignoreErrors: true });

    // If memory issue, try garbage collection
    if (global.gc) {
      global.gc();
    }

    // Restart hanging processes
    if (!health.checks.apiResponsive) {
      await this.restartAPI();
    }

    if (!health.checks.webResponsive) {
      await this.restartWeb();
    }
  }

  // ========== STRATEGIES ==========

  async runStandardStrategy() {
    this.log('Running Standard Strategy', 'info');

    await this.killEverything();
    await this.setupEnvironment();

    return new Promise((resolve, reject) => {
      const demoProcess = spawn('npm', ['run', 'demo'], {
        shell: true,
        detached: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'development',
          FORCE_COLOR: '1',
          NODE_OPTIONS: '--max-old-space-size=4096',
        },
      });

      this.processes.push(demoProcess);
      this.startHangDetection(demoProcess, 'demo', 45000);

      let ready = false;
      let output = '';

      demoProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Ready in') || output.includes('Compiled / in')) {
          ready = true;
        }
      });

      setTimeout(async () => {
        if (ready) {
          const testResult = await this.runVisualTest();
          resolve(testResult);
        } else {
          reject(new Error('Demo not ready after timeout'));
        }
      }, 30000);

      demoProcess.on('error', reject);
      demoProcess.on('exit', (code) => {
        if (code !== 0 && !ready) {
          reject(new Error(`Demo exited with code ${code}`));
        }
      });
    });
  }

  async runSeparateProcessStrategy() {
    this.log('Running Separate Processes Strategy', 'info');

    await this.killEverything();
    await this.setupEnvironment();

    // Start API
    const apiProcess = spawn('npm', ['--workspace', 'packages/api', 'run', 'dev'], {
      shell: true,
      detached: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: '4100' },
    });

    this.processes.push(apiProcess);
    this.startHangDetection(apiProcess, 'api', 30000);

    // Wait for API
    const apiReady = await this.waitForPort(4100);
    if (!apiReady) throw new Error('API failed to start');

    // Start Web
    const webProcess = spawn('npm', ['--workspace', 'apps/web', 'run', 'dev', '--', '-p', '3001'], {
      shell: true,
      detached: true,
      stdio: 'pipe',
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE: 'http://localhost:4100',
        API_ORIGIN: 'http://localhost:4100',
      },
    });

    this.processes.push(webProcess);
    this.startHangDetection(webProcess, 'web', 45000);

    // Wait for Web
    const webReady = await this.waitForPort(3001);
    if (!webReady) throw new Error('Web failed to start');

    await this.sleep(10000); // Extra time for compilation

    return await this.runVisualTest();
  }

  async runDirectNodeStrategy() {
    this.log('Running Direct Node Strategy', 'info');

    await this.killEverything();
    await this.setupEnvironment();

    // Build first
    await this.execCommand('npm --workspace packages/api run build');

    // Start API directly with node
    const apiProcess = spawn('node', ['packages/api/dist/server.js'], {
      detached: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: '4100' },
    });

    this.processes.push(apiProcess);

    // Start Next.js directly
    const webProcess = spawn('npx', ['next', 'dev', '-p', '3001'], {
      cwd: 'apps/web',
      detached: true,
      stdio: 'pipe',
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE: 'http://localhost:4100',
      },
    });

    this.processes.push(webProcess);

    await this.waitForPort(4100);
    await this.waitForPort(3001);
    await this.sleep(15000);

    return await this.runVisualTest();
  }

  async runDockerStrategy() {
    this.log('Running Docker Strategy', 'info');

    // Check if Docker is available
    const dockerCheck = await this.execCommand('docker --version');
    if (dockerCheck.error) {
      throw new Error('Docker not available');
    }

    await this.execCommand('docker-compose down', { ignoreErrors: true });
    await this.execCommand('docker-compose up -d --build');

    await this.sleep(30000); // Docker needs more time

    const result = await this.runVisualTest();

    await this.execCommand('docker-compose down');

    return result;
  }

  // ========== SETUP & TESTING ==========

  async setupEnvironment() {
    this.log('Setting up environment', 'info');

    // Create .env.local
    fs.writeFileSync(
      'apps/web/.env.local',
      `
NEXT_PUBLIC_API_BASE=http://localhost:4100
API_ORIGIN=http://localhost:4100
    `.trim()
    );

    // Seed data
    await this.execCommand('npm run seed:lines');
    await this.execCommand('npm run seed:fleet');

    // Fix next.config if needed
    this.fixNextConfig();

    this.log('Environment setup complete', 'success');
  }

  fixNextConfig() {
    const configPath = 'apps/web/next.config.mjs';
    const config = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:4100/api/:path*' },
      { source: '/events', destination: 'http://localhost:4100/events' },
      { source: '/ws', destination: 'http://localhost:4100/ws' }
    ];
  }
};
export default nextConfig;
    `.trim();

    fs.writeFileSync(configPath, config);
  }

  async runVisualTest() {
    this.log('Starting visual test with Puppeteer', 'info');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 },
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set up console logging
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          this.log(`Browser console error: ${msg.text()}`, 'error');
        }
      });

      // Navigate with retry
      let loaded = false;
      for (let i = 0; i < 3; i++) {
        try {
          await page.goto('http://localhost:3001', {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });
          loaded = true;
          break;
        } catch (e) {
          this.log(`Navigation attempt ${i + 1} failed: ${e.message}`, 'warning');
          await this.sleep(5000);
        }
      }

      if (!loaded) throw new Error('Failed to load page after 3 attempts');

      // Wait for map
      await page.waitForSelector('[data-testid="map-canvas"]', { timeout: 20000 });
      this.log('Map canvas found', 'success');

      // Wait for markers with multiple strategies
      let markers = [];
      const strategies = [
        { selector: '[data-testid="train-marker"]', name: 'data-testid' },
        { selector: '.train-marker', name: 'class' },
        { selector: '.maplibregl-marker', name: 'maplibre-marker' },
      ];

      for (const strategy of strategies) {
        try {
          await page.waitForSelector(strategy.selector, { timeout: 15000 });
          markers = await page.$$(strategy.selector);
          if (markers.length > 0) {
            this.log(`Found ${markers.length} markers using ${strategy.name} strategy`, 'success');
            break;
          }
        } catch (e) {
          this.log(`Strategy ${strategy.name} failed`, 'debug');
        }
      }

      // Take screenshot
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `test-result-${timestamp}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      this.log(`Screenshot saved: ${screenshotPath}`, 'success');

      // Check for SSE/WebSocket connection
      const hasSSE = await page.evaluate(() => {
        return window.EventSource && typeof EventSource === 'function';
      });

      const result = {
        success: markers.length > 0,
        markerCount: markers.length,
        screenshot: screenshotPath,
        hasSSE,
        timestamp,
        strategy: this.strategies[this.currentStrategyIndex].name,
      };

      this.testResults.push(result);

      return result;
    } catch (error) {
      this.log(`Visual test failed: ${error.message}`, 'error');
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async restartAPI() {
    this.log('Restarting API', 'warning');

    // Kill API processes
    await this.killPort(4100);

    // Start API again
    const apiProcess = spawn('npm', ['--workspace', 'packages/api', 'run', 'dev'], {
      shell: true,
      detached: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: '4100' },
    });

    this.processes.push(apiProcess);
    await this.waitForPort(4100);
  }

  async restartWeb() {
    this.log('Restarting Web', 'warning');

    // Kill Web processes
    await this.killPort(3001);

    // Start Web again
    const webProcess = spawn('npm', ['--workspace', 'apps/web', 'run', 'dev', '--', '-p', '3001'], {
      shell: true,
      detached: true,
      stdio: 'pipe',
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE: 'http://localhost:4100',
      },
    });

    this.processes.push(webProcess);
    await this.waitForPort(3001);
  }

  // ========== MAIN EXECUTION ==========

  async run() {
    this.log('='.repeat(50), 'info');
    this.log('SMART TEST RUNNER STARTED', 'info');
    this.log('='.repeat(50), 'info');

    // Start health monitoring
    this.startHealthMonitoring();

    while (this.currentStrategyIndex < this.strategies.length) {
      const strategy = this.strategies[this.currentStrategyIndex];
      this.log(`\nTrying strategy: ${strategy.name}`, 'info');

      let retries = 0;
      while (retries < this.maxRetries) {
        try {
          const result = await this[strategy.method]();

          if (result.success) {
            this.log(
              `SUCCESS! Found ${result.markerCount} markers using ${strategy.name}`,
              'success'
            );
            await this.generateReport();
            return result;
          } else {
            this.log(`Strategy ${strategy.name} completed but no markers found`, 'warning');
          }
        } catch (error) {
          this.log(
            `Strategy ${strategy.name} failed (attempt ${retries + 1}): ${error.message}`,
            'error'
          );
          await this.killEverything();
          await this.sleep(5000);
        }

        retries++;
      }

      this.currentStrategyIndex++;
    }

    this.log('All strategies exhausted', 'error');
    await this.generateReport();
    throw new Error('All test strategies failed');
  }

  async generateReport() {
    const report = {
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: `${((Date.now() - this.startTime) / 1000).toFixed(2)}s`,
      results: this.testResults,
      successfulStrategies: this.testResults.filter((r) => r.success).map((r) => r.strategy),
      failedStrategies: this.testResults.filter((r) => !r.success).map((r) => r.strategy),
    };

    fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));

    this.log('\n' + '='.repeat(50), 'info');
    this.log('TEST REPORT', 'info');
    this.log('='.repeat(50), 'info');
    this.log(`Duration: ${report.duration}`, 'info');
    this.log(`Successful: ${report.successfulStrategies.join(', ') || 'None'}`, 'info');
    this.log(`Failed: ${report.failedStrategies.join(', ') || 'None'}`, 'info');
    this.log('Full report saved to test-report.json', 'info');
  }

  async cleanup() {
    this.log('Cleaning up...', 'info');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    await this.killEverything();

    this.log('Cleanup complete', 'success');
  }
}

// ========== EXECUTION ==========

async function main() {
  const runner = new SmartTestRunner();

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\n\nReceived SIGINT, cleaning up...');
    await runner.cleanup();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await runner.cleanup();
    process.exit(1);
  });

  try {
    const result = await runner.run();
    console.log('\n✅ Test completed successfully!');
    console.log(`Found ${result.markerCount} train markers`);
    console.log(`Screenshot: ${result.screenshot}`);
    await runner.cleanup();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await runner.cleanup();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = SmartTestRunner;
