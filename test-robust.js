const { spawn, exec } = require('child_process');
const puppeteer = require('puppeteer');

class RobustTester {
  constructor() {
    this.demoProcess = null;
    this.testTimeout = null;
    this.maxAttempts = 3;
    this.attempt = 0;
  }

  async killExistingProcesses() {
    console.log('🛑 Killing existing processes...');
    try {
      await this.execCommand('npm run stop');
      // Additional cleanup
      await this.execCommand('pkill -f "next dev"');
      await this.execCommand('pkill -f "tsx watch"');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (e) {
      console.log('Cleanup completed');
    }
  }

  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
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
      });

      let output = '';
      let ready = false;
      let compiled = false;

      this.demoProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(`[DEMO] ${text.trim()}`);

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
        console.log(`[DEMO-ERR] ${text.trim()}`);
      });

      // Wait for demo to be ready
      const checkReady = setInterval(() => {
        if (ready && compiled) {
          clearInterval(checkReady);
          console.log('✅ Demo appears ready and compiled');
          resolve();
        }
      }, 1000);

      // Timeout after 45 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        if (!ready || !compiled) {
          console.log('⏰ Demo startup timeout');
          this.killDemo();
          reject(new Error('Demo startup timeout'));
        }
      }, 45000);
    });
  }

  killDemo() {
    if (this.demoProcess) {
      console.log('🛑 Killing demo process...');
      this.demoProcess.kill('SIGTERM');
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
        timeout: 30000,
      });

      console.log('✅ Page loaded successfully');

      // Wait for map canvas
      console.log('🗺️ Waiting for map canvas...');
      await page.waitForSelector('[data-testid="map-canvas"]', { timeout: 15000 });
      console.log('✅ Map canvas found');

      // Wait for train markers (up to 30 seconds)
      console.log('🚂 Waiting for train markers...');
      try {
        await page.waitForSelector('[data-testid="train-marker"]', { timeout: 30000 });
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
        console.log('❌ No train markers found within 30 seconds');

        // Take screenshot anyway
        await page.screenshot({
          path: `test-result-no-markers-attempt-${this.attempt + 1}.png`,
          fullPage: true,
        });
        console.log(
          `📸 Screenshot saved as test-result-no-markers-attempt-${this.attempt + 1}.png`
        );

        // Check page content for debugging
        const pageContent = await page.content();
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
    console.log('🎯 Starting robust test suite...');

    while (this.attempt < this.maxAttempts) {
      this.attempt++;
      console.log(`\n🔄 Test attempt ${this.attempt}/${this.maxAttempts}`);

      try {
        // Clean up first
        await this.killExistingProcesses();

        // Start demo
        await this.startDemo();

        // Wait a bit for everything to settle
        console.log('⏳ Waiting 10 seconds for everything to settle...');
        await new Promise((resolve) => setTimeout(resolve, 10000));

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
            console.log('⏳ Waiting 5 seconds before retry...');
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      } catch (error) {
        console.error(`❌ Attempt ${this.attempt} failed:`, error.message);
        this.killDemo();

        if (this.attempt < this.maxAttempts) {
          console.log('⏳ Waiting 5 seconds before retry...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    console.log('💥 All attempts failed');
    this.killDemo();
    throw new Error('All test attempts failed');
  }
}

// Run the robust test
const tester = new RobustTester();
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
