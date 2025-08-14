const { spawn, exec } = require('child_process');
const puppeteer = require('puppeteer');

class StableTester {
  constructor() {
    this.demoProcess = null;
    this.maxAttempts = 3;
    this.attempt = 0;
  }

  async forceKillAll() {
    console.log('🛑 Force killing all processes...');
    const commands = [
      'pkill -9 -f "next dev"',
      'pkill -9 -f "tsx watch"',
      'pkill -9 -f "node scripts/demo.mjs"',
      'lsof -ti:3000 | xargs kill -9',
      'lsof -ti:3001 | xargs kill -9',
      'lsof -ti:4100 | xargs kill -9'
    ];

    for (const cmd of commands) {
      try {
        await this.execCommand(cmd);
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
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
    console.log(`🚀 Starting demo (attempt ${this.attempt + 1}/${this.maxAttempts})...`);
    
    return new Promise((resolve, reject) => {
      this.demoProcess = spawn('npm', ['run', 'demo'], {
        stdio: 'pipe',
        shell: true
      });

      let ready = false;
      let compiled = false;
      let lastActivity = Date.now();

      const checkHanging = () => {
        const now = Date.now();
        if (now - lastActivity > 30000) { // 30 seconds without activity
          console.log('⏰ Process hanging detected, killing...');
          this.killDemo();
          reject(new Error('Process hanging detected'));
        }
      };

      const hangingCheck = setInterval(checkHanging, 5000);

      this.demoProcess.stdout.on('data', (data) => {
        const text = data.toString();
        lastActivity = Date.now();
        
        if (text.includes('Ready in') || text.includes('Server listening')) {
          ready = true;
        }
        if (text.includes('Compiled / in')) {
          compiled = true;
        }
        
        // Only log important messages
        if (text.includes('Ready in') || text.includes('Server listening') || 
            text.includes('Compiled / in') || text.includes('GET / 200')) {
          console.log(`[DEMO] ${text.trim()}`);
        }
      });

      this.demoProcess.stderr.on('data', (data) => {
        const text = data.toString();
        lastActivity = Date.now();
        if (!text.includes('DeprecationWarning')) {
          console.log(`[DEMO-ERR] ${text.trim()}`);
        }
      });

      this.demoProcess.on('error', (error) => {
        clearInterval(hangingCheck);
        reject(error);
      });

      this.demoProcess.on('exit', (code) => {
        clearInterval(hangingCheck);
        if (code !== 0 && code !== null) {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      const checkReady = setInterval(() => {
        if (ready && compiled) {
          clearInterval(checkReady);
          clearInterval(hangingCheck);
          console.log('✅ Demo ready and compiled');
          resolve();
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkReady);
        clearInterval(hangingCheck);
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
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      console.log('📱 Loading page...');
      await page.goto('http://localhost:3001', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      console.log('✅ Page loaded');
      
      // Wait for map
      console.log('🗺️ Waiting for map...');
      await page.waitForSelector('[data-testid="map-canvas"]', { timeout: 15000 });
      console.log('✅ Map found');
      
      // Wait for markers with longer timeout
      console.log('🚂 Waiting for train markers...');
      try {
        await page.waitForSelector('[data-testid="train-marker"]', { timeout: 60000 });
        console.log('✅ Train markers found!');
        
        const markerCount = await page.$$eval('[data-testid="train-marker"]', els => els.length);
        console.log(`📊 Found ${markerCount} train markers`);
        
        await page.screenshot({ path: 'test-success.png', fullPage: true });
        console.log('📸 Screenshot saved as test-success.png');
        
        return { success: true, markerCount };
        
      } catch (e) {
        console.log('❌ No train markers found within 60 seconds');
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-no-markers.png', fullPage: true });
        console.log('📸 Screenshot saved as test-no-markers.png');
        
        // Check page content
        const title = await page.title();
        const url = page.url();
        console.log('🔍 Page title:', title);
        console.log('🔍 Page URL:', url);
        
        // Check console for errors
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
    console.log('🎯 Starting stable test suite...');
    
    while (this.attempt < this.maxAttempts) {
      this.attempt++;
      console.log(`\n🔄 Test attempt ${this.attempt}/${this.maxAttempts}`);
      
      try {
        await this.forceKillAll();
        await this.startDemo();
        
        console.log('⏳ Waiting 20 seconds for everything to settle...');
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        const result = await this.testWithPuppeteer();
        
        if (result.success) {
          console.log(`🎉 SUCCESS on attempt ${this.attempt}! Found ${result.markerCount} train markers`);
          this.killDemo();
          return result;
        } else {
          console.log(`⚠️ Test failed on attempt ${this.attempt}: ${result.error}`);
          this.killDemo();
          
          if (this.attempt < this.maxAttempts) {
            console.log('⏳ Waiting 10 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
        
      } catch (error) {
        console.error(`❌ Attempt ${this.attempt} failed:`, error.message);
        this.killDemo();
        
        if (this.attempt < this.maxAttempts) {
          console.log('⏳ Waiting 10 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
    
    console.log('💥 All attempts failed');
    this.killDemo();
    throw new Error('All test attempts failed');
  }
}

// Run the stable test
const tester = new StableTester();
tester.run()
  .then(result => {
    console.log('🎯 Test suite completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });

