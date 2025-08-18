const { spawn, exec } = require('child_process');
const puppeteer = require('puppeteer');

class RobustFinalTester {
  constructor() {
    this.demoProcess = null;
  }

  async forceKillAll() {
    console.log('🛑 Force killing all processes...');
    const commands = [
      'pkill -9 -f "next dev"',
      'pkill -9 -f "tsx watch"',
      'pkill -9 -f "node scripts/demo.mjs"',
      'lsof -ti:3000 | xargs kill -9',
      'lsof -ti:3001 | xargs kill -9',
      'lsof -ti:4100 | xargs kill -9',
    ];

    for (const cmd of commands) {
      try {
        await this.execCommand(cmd);
      } catch (e) {
        // Ignore errors
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('✅ Cleanup completed');
  }

  execCommand(command) {
    return new Promise((resolve) => {
      exec(command, { timeout: 5000 }, (error) => {
        if (error) {
          console.log(`Command failed: ${command}`);
        }
        resolve();
      });
    });
  }

  async startDemo() {
    console.log('🚀 Starting demo...');

    return new Promise((resolve, reject) => {
      this.demoProcess = spawn('npm', ['run', 'demo'], {
        stdio: 'pipe',
        shell: true,
      });

      let ready = false;
      let compiled = false;

      this.demoProcess.stdout.on('data', (data) => {
        const text = data.toString();

        if (text.includes('Ready in')) {
          ready = true;
          console.log('✅ Demo ready');
        }
        if (text.includes('Compiled / in')) {
          compiled = true;
          console.log('✅ Compilation ready');
        }
        if (text.includes('GET / 200')) {
          console.log('✅ Page served successfully');
        }

        // Log important messages
        if (
          text.includes('Ready in') ||
          text.includes('Server listening') ||
          text.includes('Compiled / in') ||
          text.includes('GET / 200')
        ) {
          console.log(`[DEMO] ${text.trim()}`);
        }
      });

      this.demoProcess.stderr.on('data', (data) => {
        const text = data.toString();
        if (!text.includes('DeprecationWarning')) {
          console.log(`[DEMO-ERR] ${text.trim()}`);
        }
      });

      this.demoProcess.on('error', (error) => {
        console.error('[DEMO] Process error:', error.message);
        reject(error);
      });

      this.demoProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.log(`[DEMO] Process exited with code ${code}`);
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      // Wait for demo to be ready
      const checkReady = setInterval(() => {
        if (ready && compiled) {
          clearInterval(checkReady);
          console.log('✅ Demo ready and compiled');
          resolve();
        }
      }, 1000);

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        if (!ready || !compiled) {
          console.log('⏰ Demo startup timeout, but continuing...');
          resolve(); // Continue anyway
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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Enable console logging
      page.on('console', (msg) => {
        console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
      });

      console.log('📱 Loading page...');
      await page.goto('http://localhost:3001', {
        waitUntil: 'networkidle2',
        timeout: 45000,
      });

      console.log('✅ Page loaded');

      // Wait for map
      console.log('🗺️ Waiting for map...');
      await page.waitForSelector('[data-testid="map-canvas"]', { timeout: 20000 });
      console.log('✅ Map found');

      // Wait for markers with very long timeout
      console.log('🚂 Waiting for train markers (up to 120 seconds)...');
      try {
        await page.waitForSelector('[data-testid="train-marker"]', { timeout: 120000 });
        console.log('✅ Train markers found!');

        const markerCount = await page.$$eval('[data-testid="train-marker"]', (els) => els.length);
        console.log(`📊 Found ${markerCount} train markers`);

        await page.screenshot({ path: 'test-success.png', fullPage: true });
        console.log('📸 Screenshot saved as test-success.png');

        return { success: true, markerCount };
      } catch (e) {
        console.log('❌ No train markers found within 120 seconds');

        // Take screenshot for debugging
        await page.screenshot({ path: 'test-no-markers.png', fullPage: true });
        console.log('📸 Screenshot saved as test-no-markers.png');

        // Check what's on the page
        const title = await page.title();
        const url = page.url();
        console.log('🔍 Page title:', title);
        console.log('🔍 Page URL:', url);

        // Check for any elements with data-testid
        const testElements = await page.$$eval('[data-testid]', (els) =>
          els.map((el) => ({
            testid: el.getAttribute('data-testid'),
            tagName: el.tagName,
            className: el.className,
            visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          }))
        );
        console.log('🔍 Elements with data-testid:', testElements);

        // Check for any console errors
        const logs = await page.evaluate(() => {
          return window.console.logs || [];
        });
        console.log('🔍 Console logs:', logs);

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
    console.log('🎯 Starting robust final test...');

    try {
      await this.forceKillAll();
      await this.startDemo();

      console.log('⏳ Waiting 30 seconds for everything to settle...');
      await new Promise((resolve) => setTimeout(resolve, 30000));

      const result = await this.testWithPuppeteer();

      if (result.success) {
        console.log(`🎉 SUCCESS! Found ${result.markerCount} train markers`);
        this.killDemo();
        return result;
      } else {
        console.log(`⚠️ Test failed: ${result.error}`);
        this.killDemo();
        return result;
      }
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
      this.killDemo();
      return { success: false, error: error.message };
    }
  }
}

// Run the robust final test
const tester = new RobustFinalTester();
tester
  .run()
  .then((result) => {
    if (result.success) {
      console.log('🎯 Test suite completed successfully!');
      process.exit(0);
    } else {
      console.log('⚠️ Test completed but with issues');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });
