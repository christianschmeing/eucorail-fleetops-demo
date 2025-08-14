const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

async function testFinal() {
  console.log('🎯 Starting final test...');
  
  // Start demo manually
  console.log('🚀 Starting demo...');
  const demoProcess = spawn('npm', ['run', 'demo'], {
    stdio: 'pipe',
    shell: true
  });

  let demoReady = false;
  let compilationReady = false;

  demoProcess.stdout.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Ready in')) {
      demoReady = true;
      console.log('✅ Demo ready');
    }
    if (text.includes('Compiled / in')) {
      compilationReady = true;
      console.log('✅ Compilation ready');
    }
    if (text.includes('GET / 200')) {
      console.log('✅ Page served successfully');
    }
  });

  demoProcess.stderr.on('data', (data) => {
    const text = data.toString();
    if (!text.includes('DeprecationWarning')) {
      console.log(`[DEMO-ERR] ${text.trim()}`);
    }
  });

  // Wait for demo to be ready
  console.log('⏳ Waiting for demo to start...');
  await new Promise(resolve => setTimeout(resolve, 25000));

  if (!demoReady) {
    console.log('❌ Demo not ready, but continuing anyway...');
  }

  // Test with Puppeteer
  console.log('🧪 Testing with Puppeteer...');
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    
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
    
    // Wait for markers with very long timeout
    console.log('🚂 Waiting for train markers (up to 90 seconds)...');
    try {
      await page.waitForSelector('[data-testid="train-marker"]', { timeout: 90000 });
      console.log('✅ Train markers found!');
      
      const markerCount = await page.$$eval('[data-testid="train-marker"]', els => els.length);
      console.log(`📊 Found ${markerCount} train markers`);
      
      await page.screenshot({ path: 'test-success.png', fullPage: true });
      console.log('📸 Screenshot saved as test-success.png');
      
      console.log('🎉 SUCCESS! Demo is working with train markers!');
      
    } catch (e) {
      console.log('❌ No train markers found within 90 seconds');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-no-markers.png', fullPage: true });
      console.log('📸 Screenshot saved as test-no-markers.png');
      
      // Check what's on the page
      const title = await page.title();
      const url = page.url();
      console.log('🔍 Page title:', title);
      console.log('🔍 Page URL:', url);
      
      // Check for any elements with data-testid
      const testElements = await page.$$eval('[data-testid]', els => 
        els.map(el => ({ 
          testid: el.getAttribute('data-testid'),
          tagName: el.tagName,
          className: el.className,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }))
      );
      console.log('🔍 Elements with data-testid:', testElements);
      
      // Check for any console errors
      const logs = await page.evaluate(() => {
        return window.console.logs || [];
      });
      console.log('🔍 Console logs:', logs);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
    
    // Kill demo process
    console.log('🛑 Stopping demo...');
    demoProcess.kill('SIGTERM');
  }
}

testFinal().catch(console.error);


