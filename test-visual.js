const puppeteer = require('puppeteer');

async function testDemo() {
  console.log('🚀 Starting visual test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to demo
    console.log('📱 Loading demo page...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    // Wait for map canvas
    console.log('🗺️ Waiting for map canvas...');
    await page.waitForSelector('[data-testid="map-canvas"]', { timeout: 10000 });
    console.log('✅ Map canvas found');
    
    // Wait for train markers (up to 15 seconds)
    console.log('🚂 Waiting for train markers...');
    try {
      await page.waitForSelector('[data-testid="train-marker"]', { timeout: 15000 });
      console.log('✅ Train markers found!');
      
      // Count markers
      const markerCount = await page.$$eval('[data-testid="train-marker"]', els => els.length);
      console.log(`📊 Found ${markerCount} train markers`);
      
      // Take screenshot
      await page.screenshot({ path: 'test-result.png', fullPage: true });
      console.log('📸 Screenshot saved as test-result.png');
      
    } catch (e) {
      console.log('❌ No train markers found within 15 seconds');
      
      // Check if WebSocket connection is working
      const logs = await page.evaluate(() => {
        return window.console.logs || [];
      });
      
      console.log('🔍 Checking console logs for connection issues...');
      
      // Take screenshot anyway
      await page.screenshot({ path: 'test-result-no-markers.png', fullPage: true });
      console.log('📸 Screenshot saved as test-result-no-markers.png');
    }
    
    // Wait a bit more to see if markers appear
    console.log('⏳ Waiting additional 10 seconds for delayed markers...');
    await page.waitForTimeout(10000);
    
    const finalMarkerCount = await page.$$eval('[data-testid="train-marker"]', els => els.length);
    console.log(`📊 Final marker count: ${finalMarkerCount}`);
    
    if (finalMarkerCount > 0) {
      console.log('🎉 SUCCESS: Demo is working with train markers!');
    } else {
      console.log('⚠️ WARNING: No train markers visible - need to investigate');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run test
testDemo().catch(console.error);
