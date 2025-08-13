const puppeteer = require('puppeteer');
const { exec } = require('child_process');

async function testDemo() {
  console.log('🎯 Starting simple test...');
  
  // First, kill any existing processes
  console.log('🛑 Cleaning up...');
  try {
    exec('npm run stop', () => {});
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (e) {
    // Ignore errors
  }
  
  // Start demo in background
  console.log('🚀 Starting demo...');
  const demoProcess = exec('npm run demo', (error, stdout, stderr) => {
    if (error) {
      console.log('Demo process error:', error.message);
    }
  });
  
  // Wait for demo to start
  console.log('⏳ Waiting for demo to start...');
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  // Test with Puppeteer
  console.log('🧪 Testing with Puppeteer...');
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
    
    // Wait for markers
    console.log('🚂 Waiting for train markers...');
    try {
      await page.waitForSelector('[data-testid="train-marker"]', { timeout: 30000 });
      console.log('✅ Train markers found!');
      
      const markerCount = await page.$$eval('[data-testid="train-marker"]', els => els.length);
      console.log(`📊 Found ${markerCount} train markers`);
      
      await page.screenshot({ path: 'test-success.png', fullPage: true });
      console.log('📸 Screenshot saved as test-success.png');
      
      console.log('🎉 SUCCESS! Demo is working with train markers!');
      
    } catch (e) {
      console.log('❌ No train markers found');
      await page.screenshot({ path: 'test-no-markers.png', fullPage: true });
      console.log('📸 Screenshot saved as test-no-markers.png');
      
      // Check what's on the page
      const title = await page.title();
      const url = page.url();
      console.log('🔍 Page title:', title);
      console.log('🔍 Page URL:', url);
      
      // Check for any errors in console
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

testDemo().catch(console.error);
