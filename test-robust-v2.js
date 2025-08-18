const { spawn, exec } = require('child_process');
const puppeteer = require('puppeteer');

class RobustTesterV2 {
  constructor() {
    this.demoProcess = null;
    this.maxAttempts = 3;
    this.attempt = 0;
    this.processTimeout = null;
  }

  async forceKillAll() {
    console.log('🛑 Force killing all related processes...');

    const commands = [
      'pkill -9 -f "next dev"',
      'pkill -9 -f "tsx watch"',
      'pkill -9 -f "node scripts/demo.mjs"',
      'pkill -9 -f "npm run demo"',
      'lsof -ti:3000 | xargs kill -9',
      'lsof -ti:3001 | xargs kill -9',
      'lsof -ti:4100 | xargs kill -9',
    ];

    for (const cmd of commands) {
      try {
        await this.execCommand(cmd);
      } catch (e) {
        // Ignore errors during cleanup
      }
    }

    // Wait for processes to fully terminate
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('✅ Cleanup completed');
  }

  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
          console.log(`Command failed: ${command}`);
          resolve(); // Don't fail on cleanup errors
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async startDemo() {
    console.log(`🚀 Starting demo (attempt ${this.attempt + 1}/${this.maxAttempts})...`);

    return new Promise((resolve, reject) => {
      this.demoProcess = spawn('npm', ['run', 'demo'], {
        stdio: 'pipe',
        shell: true,
        detached: false,
      });

      let output = '';
      let ready = false;
      let compiled = false;
      let lastActivity = Date.now();

      const checkHanging = () => {
        const now = Date.now();
        if (now - lastActivity > 60000) {
          // 60 seconds without activity
          console.log('⏰ Process appears to be hanging, killing...');
          this.killDemo();
          reject(new Error('Process hanging detected'));
        }
      };

      const hangingCheck = setInterval(checkHanging, 10000);

      this.demoProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        lastActivity = Date.now();

        // Only log important messages to avoid spam
        if (
          text.includes('Ready in') ||
          text.includes('Server listening') ||
          text.includes('Compiled / in') ||
          text.includes('GET / 200')
        ) {
          console.log(`[DEMO] ${text.trim()}`);
        }

        // Check for ready signals
        if (text.includes('Ready in') || text.includes('Server listening')) {
          ready = true;
        }
        if (text.includes('Compiled / in')) {
          compiled = true;
        }
      });

      this.demoProcess.stderr.on('data', (data) => {
        const text = data.toString();
        lastActivity = Date.now();

        // Only log important errors
        if (!text.includes('DeprecationWarning')) {
          console.log(`[DEMO-ERR] ${text.trim()}`);
        }
      });

      this.demoProcess.on('error', (error) => {
        clearInterval(hangingCheck);
        console.error('[DEMO] Process error:', error.message);
        reject(error);
      });

      this.demoProcess.on('exit', (code, signal) => {
        clearInterval(hangingCheck);
        if (code !== 0 && code !== null) {
          console.log(`[DEMO] Process exited with code ${code}, signal ${signal}`);
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      // Wait for demo to be ready
      const checkReady = setInterval(() => {
        if (ready && compiled) {
          clearInterval(checkReady);
          clearInterval(hangingCheck);
          console.log('✅ Demo appears ready and compiled');
          resolve();
        }
      }, 2000);

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        clearInterval(hangingCheck);
        if (!ready || !compiled) {
          console.log('⏰ Demo startup timeout');
          this.killDemo();
          reject(new Error('Demo startup timeout'));
        }
      }, 60000);
    });
  }

  killDemo() {
    if (this.demoProcess) {
      console.log('🛑 Killing demo process...');
      try {
        this.demoProcess.kill('SIGKILL');
      } catch (e) {
        console.log('Process already terminated');
      }
      this.demoProcess = null;
    }
  }

  async testWithPuppeteer() {
    console.log('🧪 Starting visual test...');

    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    });

    try {
      const page = await browser.newPage();

      // Navigate to demo with longer timeout
      console.log('📱 Loading demo page...');
      await page.goto('http://localhost:3001', {
        waitUntil: 'networkidle2',
        timeout: 45000,
      });

      console.log('✅ Page loaded successfully');

      // Wait for map canvas
      console.log('🗺️ Waiting for map canvas...');
      await page.waitForSelector('[data-testid="map-canvas"]', { timeout: 20000 });
      console.log('✅ Map canvas found');

      // Wait for train markers (up to 45 seconds)
      console.log('🚂 Waiting for train markers...');
      try {
        await page.waitForSelector('[data-testid="train-marker"]', { timeout: 45000 });
        console.log('✅ Train markers found!');

        // Count markers
        const markerCount = await page.$$eval('[data-testid="train-marker"]', (els) => els.length);
        console.log(`📊 Found ${markerCount} train markers`);

        // Take screenshot
        await page.screenshot({
          path: `test-result-attempt-${this.attempt + 1}.png`,
          fullPage: true,
        });
        console.log(`📸 Screenshot saved as test-result-attempt-${this.attempt + 1}.png`);

        return { success: true, markerCount };
      } catch (e) {
        console.log('❌ No train markers found within 45 seconds');

        // Take screenshot anyway
        await page.screenshot({
          path: `test-result-no-markers-attempt-${this.attempt + 1}.png`,
          fullPage: true,
        });
        console.log(
          `📸 Screenshot saved as test-result-no-markers-attempt-${this.attempt + 1}.png`
        );

        // Check page content for debugging
        console.log('🔍 Page title:', await page.title());
        console.log('🔍 Page URL:', page.url());

        return { success: false, error: 'No markers found' };
      }
    } catch (error) {
      console.error('❌ Puppeteer test failed:', error.message);
      return { success: false, error: error.message };
    } finally {
      await browser.close();
    }
  }

  async run() {
    console.log('🎯 Starting robust test suite v2...');

    while (this.attempt < this.maxAttempts) {
      this.attempt++;
      console.log(`\n🔄 Test attempt ${this.attempt}/${this.maxAttempts}`);

      try {
        // Force kill all processes first
        await this.forceKillAll();

        // Start demo
        await this.startDemo();

        // Wait for everything to settle
        console.log('⏳ Waiting 15 seconds for everything to settle...');
        await new Promise((resolve) => setTimeout(resolve, 15000));

        // Run test
        const result = await this.testWithPuppeteer();

        if (result.success) {
          console.log(
            `🎉 SUCCESS on attempt ${this.attempt}! Found ${result.markerCount} train markers`
          );
          this.killDemo();
          return result;
        } else {
          console.log(`⚠️ Test failed on attempt ${this.attempt}: ${result.error}`);
          this.killDemo();

          if (this.attempt < this.maxAttempts) {
            console.log('⏳ Waiting 10 seconds before retry...');
            await new Promise((resolve) => setTimeout(resolve, 10000));
          }
        }
      } catch (error) {
        console.error(`❌ Attempt ${this.attempt} failed:`, error.message);
        this.killDemo();

        if (this.attempt < this.maxAttempts) {
          console.log('⏳ Waiting 10 seconds before retry...');
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      }
    }

    console.log('💥 All attempts failed');
    this.killDemo();
    throw new Error('All test attempts failed');
  }
}

// Run the robust test
const tester = new RobustTesterV2();
tester
  .run()
  .then((result) => {
    console.log('🎯 Test suite completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });
