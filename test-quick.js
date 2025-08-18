const { spawn, exec } = require('child_process');
const puppeteer = require('puppeteer');

class QuickTester {
  constructor() {
    this.apiProcess = null;
    this.webProcess = null;
  }

  async cleanup() {
    console.log('🛑 Cleaning up...');
    exec('pkill -9 -f "next dev"', () => {});
    exec('pkill -9 -f "tsx watch"', () => {});
    exec('lsof -ti:3001 | xargs kill -9', () => {});
    exec('lsof -ti:4100 | xargs kill -9', () => {});
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  async startAPI() {
    console.log('🔧 Starting API...');
    return new Promise((resolve, reject) => {
      this.apiProcess = spawn('npm', ['--workspace', 'packages/api', 'run', 'dev'], {
        env: { ...process.env, PORT: '4100' },
        stdio: 'pipe',
      });

      this.apiProcess.stdout.on('data', (data) => {
        const text = data.toString();
        if (text.includes('Server listening')) {
          console.log('✅ API ready');
          resolve();
        }
      });

      this.apiProcess.stderr.on('data', (data) => {
        console.log(`[API-ERR] ${data.toString().trim()}`);
      });

      setTimeout(() => {
        if (!this.apiProcess.killed) {
          console.log('✅ API started (timeout)');
          resolve();
        }
      }, 10000);
    });
  }

  async startWeb() {
    console.log('🌐 Starting Web...');
    return new Promise((resolve, reject) => {
      this.webProcess = spawn('npm', ['--workspace', 'apps/web', 'run', 'dev'], {
        env: { ...process.env, PORT: '3001' },
        stdio: 'pipe',
      });

      this.webProcess.stdout.on('data', (data) => {
        const text = data.toString();
        if (text.includes('Ready in')) {
          console.log('✅ Web ready');
          resolve();
        }
      });

      this.webProcess.stderr.on('data', (data) => {
        console.log(`[WEB-ERR] ${data.toString().trim()}`);
      });

      setTimeout(() => {
        if (!this.webProcess.killed) {
          console.log('✅ Web started (timeout)');
          resolve();
        }
      }, 15000);
    });
  }

  async testWithPuppeteer() {
    console.log('🧪 Testing with Puppeteer...');

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
        timeout: 30000,
      });

      console.log('✅ Page loaded');

      // Wait for map
      console.log('🗺️ Waiting for map...');
      await page.waitForSelector('[data-testid="map-canvas"]', { timeout: 20000 });
      console.log('✅ Map found');

      // Wait for markers
      console.log('🚂 Waiting for train markers...');
      try {
        await page.waitForSelector('[data-testid="train-marker"]', { timeout: 60000 });
        console.log('✅ Train markers found!');

        const markerCount = await page.$$eval('[data-testid="train-marker"]', (els) => els.length);
        console.log(`📊 Found ${markerCount} train markers`);

        await page.screenshot({ path: 'test-success.png', fullPage: true });
        console.log('📸 Screenshot saved as test-success.png');

        return { success: true, markerCount };
      } catch (e) {
        console.log('❌ No train markers found');

        // Take screenshot for debugging
        await page.screenshot({ path: 'test-no-markers.png', fullPage: true });
        console.log('📸 Screenshot saved as test-no-markers.png');

        // Check what's on the page
        const title = await page.title();
        const url = page.url();
        console.log('🔍 Page title:', title);
        console.log('🔍 Page URL:', url);

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
    console.log('🎯 Starting quick test...');

    try {
      await this.cleanup();

      // Run seeds
      console.log('🌱 Running seeds...');
      await new Promise((resolve, reject) => {
        exec('npm run seed:lines && npm run seed:fleet', (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      await this.startAPI();
      await this.startWeb();

      console.log('⏳ Waiting 10 seconds for everything to settle...');
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const result = await this.testWithPuppeteer();

      if (result.success) {
        console.log(`🎉 SUCCESS! Found ${result.markerCount} train markers`);
      } else {
        console.log(`⚠️ Test failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
      return { success: false, error: error.message };
    } finally {
      // Cleanup
      if (this.apiProcess) this.apiProcess.kill('SIGKILL');
      if (this.webProcess) this.webProcess.kill('SIGKILL');
    }
  }
}

// Run the test
const tester = new QuickTester();
tester
  .run()
  .then((result) => {
    if (result.success) {
      console.log('🎯 Test completed successfully!');
      process.exit(0);
    } else {
      console.log('⚠️ Test completed but with issues');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  });
