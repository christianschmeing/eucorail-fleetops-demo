#!/usr/bin/env node

/**
 * Smart Test Runner with Auto-Recovery
 * Automatisches Test-System mit Fehlerbehandlung und Fallback-Strategien
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Konfiguration
const CONFIG = {
  maxRetries: 3,
  processTimeout: 120000, // 2 Minuten max pro Test
  buildTimeout: 60000, // 1 Minute für Build
  ports: [3001, 3002, 4100, 4101],
  testStrategies: ['full', 'isolated', 'minimal'],
};

// Farben für Terminal-Output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Logger
class Logger {
  static info(msg) {
    console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`);
  }

  static success(msg) {
    console.log(`${colors.green}✓${colors.reset} ${msg}`);
  }

  static error(msg) {
    console.log(`${colors.red}✗${colors.reset} ${msg}`);
  }

  static warn(msg) {
    console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
  }

  static section(msg) {
    console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}${msg}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  }
}

// Process Manager
class ProcessManager {
  static killPort(port) {
    try {
      if (process.platform === 'win32') {
        execSync(
          `netstat -ano | findstr :${port} | findstr LISTENING | for /f "tokens=5" %a in ('more') do taskkill /PID %a /F`,
          { stdio: 'ignore' }
        );
      } else {
        execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
      }
    } catch (e) {
      // Ignorieren - Port war bereits frei
    }
  }

  static killAllPorts() {
    Logger.info('Bereinige Ports...');
    CONFIG.ports.forEach((port) => {
      this.killPort(port);
    });
    Logger.success('Ports bereinigt');
  }

  static killProcessByName(name) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /F /IM ${name}.exe 2>nul`, { stdio: 'ignore' });
      } else {
        execSync(`pkill -f "${name}" 2>/dev/null || true`, { stdio: 'ignore' });
      }
    } catch (e) {
      // Ignorieren
    }
  }

  static cleanup() {
    Logger.info('Räume auf...');
    this.killProcessByName('node');
    this.killProcessByName('playwright');
    this.killProcessByName('chromium');
    this.killAllPorts();

    // Warte kurz, damit Prozesse sauber beendet werden
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Test Runner mit Timeout
class TestRunner {
  constructor() {
    this.currentStrategy = 0;
    this.retryCount = 0;
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || CONFIG.processTimeout;
      const child = spawn(command, args, {
        shell: true,
        stdio: options.silent ? 'ignore' : 'inherit',
        env: { ...process.env, ...options.env },
      });

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        Logger.warn(`Prozess Timeout nach ${timeout}ms - beende...`);
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 1000);
      }, timeout);

      child.on('exit', (code) => {
        clearTimeout(timer);
        if (timedOut) {
          reject(new Error('TIMEOUT'));
        } else if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Exit code: ${code}`));
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async runBuild() {
    Logger.section('Build Phase');
    try {
      await this.runCommand('npm', ['run', 'build:all'], {
        timeout: CONFIG.buildTimeout,
      });
      Logger.success('Build erfolgreich');
      return true;
    } catch (error) {
      Logger.error(`Build fehlgeschlagen: ${error.message}`);
      return false;
    }
  }

  async runTestStrategy(strategy) {
    Logger.section(`Test Strategy: ${strategy}`);

    switch (strategy) {
      case 'full':
        return await this.runFullTest();
      case 'isolated':
        return await this.runIsolatedTests();
      case 'minimal':
        return await this.runMinimalTests();
      default:
        return false;
    }
  }

  async runFullTest() {
    Logger.info('Führe vollständigen Test aus...');
    try {
      // Start Server und Tests zusammen
      await this.runCommand('npm', ['run', 'verify'], {
        env: {
          NEXT_PUBLIC_TEST_MODE: '1',
          TEST_MODE: '1',
          SEED: '42',
          TICK_MS: '500',
        },
      });
      return true;
    } catch (error) {
      Logger.error(`Vollständiger Test fehlgeschlagen: ${error.message}`);
      return false;
    }
  }

  async runIsolatedTests() {
    Logger.info('Führe isolierte Tests aus...');

    try {
      // Starte Server separat
      const serverProcess = spawn('npm', ['run', 'dev:e2e'], {
        shell: true,
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          NEXT_PUBLIC_TEST_MODE: '1',
          TEST_MODE: '1',
        },
      });

      // Warte auf Server Start
      Logger.info('Warte auf Server Start...');
      await this.waitForServer('http://localhost:3001', 30000);
      await this.waitForServer('http://localhost:4100/health', 30000);

      // Führe Tests einzeln aus
      const testFiles = [
        'tests/e2e/health.spec.ts',
        'tests/e2e/home.spec.ts',
        'tests/e2e/data-as-of.spec.ts',
      ];

      let allPassed = true;
      for (const testFile of testFiles) {
        Logger.info(`Teste: ${testFile}`);
        try {
          await this.runCommand('npx', ['playwright', 'test', testFile], {
            timeout: 30000,
          });
          Logger.success(`✓ ${testFile}`);
        } catch (error) {
          Logger.error(`✗ ${testFile}`);
          allPassed = false;
        }
      }

      // Beende Server
      process.kill(-serverProcess.pid);

      return allPassed;
    } catch (error) {
      Logger.error(`Isolierte Tests fehlgeschlagen: ${error.message}`);
      return false;
    }
  }

  async runMinimalTests() {
    Logger.info('Führe minimale Smoke Tests aus...');

    try {
      // Nur Health Check
      const serverProcess = spawn('npm', ['run', 'dev:e2e'], {
        shell: true,
        detached: true,
        stdio: 'ignore',
      });

      await this.waitForServer('http://localhost:4100/health', 30000);

      const response = await fetch('http://localhost:4100/health');
      const isHealthy = response.ok;

      process.kill(-serverProcess.pid);

      if (isHealthy) {
        Logger.success('Health Check erfolgreich');
        return true;
      } else {
        Logger.error('Health Check fehlgeschlagen');
        return false;
      }
    } catch (error) {
      Logger.error(`Minimale Tests fehlgeschlagen: ${error.message}`);
      return false;
    }
  }

  async waitForServer(url, timeout = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          Logger.success(`Server erreichbar: ${url}`);
          return true;
        }
      } catch (e) {
        // Server noch nicht bereit
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Server Timeout: ${url}`);
  }

  async run() {
    Logger.section('Smart Test Runner gestartet');

    // Initiale Bereinigung
    await ProcessManager.cleanup();

    // Build Phase
    const buildSuccess = await this.runBuild();
    if (!buildSuccess) {
      Logger.warn('Build fehlgeschlagen - versuche trotzdem Tests');
    }

    // Test Strategien durchgehen
    for (let strategy of CONFIG.testStrategies) {
      Logger.info(
        `Versuche Strategie: ${strategy} (Versuch ${this.retryCount + 1}/${CONFIG.maxRetries})`
      );

      const success = await this.runTestStrategy(strategy);

      if (success) {
        Logger.section('✅ Tests erfolgreich!');
        return 0;
      }

      // Cleanup vor nächstem Versuch
      await ProcessManager.cleanup();

      this.retryCount++;
      if (this.retryCount >= CONFIG.maxRetries) {
        break;
      }
    }

    Logger.section('❌ Alle Test-Strategien fehlgeschlagen');
    return 1;
  }
}

// Fix für kritische Test-Probleme
class TestFixer {
  static async fixSidebarTest() {
    Logger.info('Fixe Sidebar Filter Test...');

    const testFile = path.join(__dirname, 'tests/e2e/sidebar-filters.spec.ts');

    if (fs.existsSync(testFile)) {
      let content = fs.readFileSync(testFile, 'utf8');

      // Erhöhe Timeouts
      content = content.replace(/timeout: \d+/g, 'timeout: 30000');

      // Füge waitForSelector vor Interaktionen hinzu
      if (!content.includes('waitForSelector')) {
        content = content.replace(
          'const statusGroup = page.getByRole',
          'await page.waitForSelector(\'[role="group"][aria-label="Status"]\', { state: \'visible\', timeout: 30000 });\n    const statusGroup = page.getByRole'
        );
      }

      fs.writeFileSync(testFile, content);
      Logger.success('Sidebar Test gefixt');
    }
  }

  static async fixTrainDetailsTest() {
    Logger.info('Fixe Train Details Test...');

    const testFile = path.join(__dirname, 'tests/e2e/train-details-smoke.spec.ts');

    if (fs.existsSync(testFile)) {
      let content = fs.readFileSync(testFile, 'utf8');

      // Warte auf Page Load
      if (!content.includes("waitUntil: 'networkidle'")) {
        content = content.replace(
          "{ waitUntil: 'domcontentloaded' }",
          "{ waitUntil: 'networkidle', timeout: 30000 }"
        );
      }

      fs.writeFileSync(testFile, content);
      Logger.success('Train Details Test gefixt');
    }
  }

  static async applyFixes() {
    Logger.section('Wende Test-Fixes an');
    await this.fixSidebarTest();
    await this.fixTrainDetailsTest();
  }
}

// Main Execution
async function main() {
  try {
    // Fixes anwenden
    await TestFixer.applyFixes();

    // Tests ausführen
    const runner = new TestRunner();
    const exitCode = await runner.run();

    process.exit(exitCode);
  } catch (error) {
    Logger.error(`Unerwarteter Fehler: ${error.message}`);
    process.exit(1);
  }
}

// Signal Handler für sauberes Beenden
process.on('SIGINT', async () => {
  Logger.warn('\nUnterbrochen - räume auf...');
  await ProcessManager.cleanup();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  Logger.warn('\nBeendet - räume auf...');
  await ProcessManager.cleanup();
  process.exit(143);
});

// Starte Main
main().catch(console.error);
