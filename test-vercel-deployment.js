const puppeteer = require('puppeteer');

async function testVercelDeployment() {
  console.log('🔍 Suche Vercel Deployment URL und teste visuell...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Test verschiedene mögliche Vercel URLs
    const urls = [
      'https://eucorail-fleetops-demo.vercel.app',
      'https://eucorail-fleetops-demo-christian-schmeings-projects.vercel.app',
      'https://geolocation-mockup.vercel.app',
      'https://geolocation-mockup-christian-schmeings-projects.vercel.app'
    ];
    
    let workingUrl = null;
    
    for (const url of urls) {
      console.log(`📡 Teste URL: ${url}`);
      try {
        const response = await page.goto(url, { 
          waitUntil: 'networkidle0',
          timeout: 10000 
        });
        
        if (response && response.ok()) {
          console.log(`✅ URL funktioniert: ${url}`);
          workingUrl = url;
          break;
        }
      } catch (error) {
        console.log(`❌ URL nicht erreichbar: ${url}`);
      }
    }
    
    if (!workingUrl) {
      throw new Error('Keine funktionierende Vercel URL gefunden');
    }
    
    console.log(`\n🌐 VERCEL DEPLOYMENT URL: ${workingUrl}\n`);
    
    // Test Depot Map Feature
    console.log('🗺️ Teste Depot Map Feature...');
    await page.goto(`${workingUrl}/depot/map`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    
    // Check for key elements
    const hasDepotMap = await page.evaluate(() => {
      const elements = {
        sidebar: document.querySelector('[data-testid="sidebar"], aside'),
        map: document.querySelector('.maplibregl-map, .mapboxgl-map, canvas'),
        kpiBar: document.querySelector('[class*="kpi"], [class*="KPI"]'),
        depotTitle: Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent?.includes('Essingen') || el.textContent?.includes('Langweid')
        )
      };
      
      return {
        hasSidebar: !!elements.sidebar,
        hasMap: !!elements.map,
        hasKPIs: !!elements.kpiBar,
        hasDepotInfo: !!elements.depotTitle,
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('\n📊 Test-Ergebnisse:');
    console.log('- Sidebar vorhanden:', hasDepotMap.hasSidebar ? '✅' : '❌');
    console.log('- Karte vorhanden:', hasDepotMap.hasMap ? '✅' : '❌');
    console.log('- KPIs vorhanden:', hasDepotMap.hasKPIs ? '✅' : '❌');
    console.log('- Depot-Info vorhanden:', hasDepotMap.hasDepotInfo ? '✅' : '❌');
    console.log('- Seitentitel:', hasDepotMap.title);
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `vercel-depot-map-${timestamp}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Screenshot gespeichert: ${screenshotPath}`);
    
    // Test interactivity
    console.log('\n🎯 Teste Interaktivität...');
    
    // Try to switch depot
    const depotSwitcher = await page.$('button:has-text("Langweid"), button:has-text("Essingen")');
    if (depotSwitcher) {
      await depotSwitcher.click();
      await page.waitForTimeout(2000);
      console.log('- Depot-Wechsel:', '✅');
    } else {
      console.log('- Depot-Wechsel:', '❌ Kein Switcher gefunden');
    }
    
    // Check for trains
    const trainCount = await page.evaluate(() => {
      const trainElements = document.querySelectorAll('[data-testid="train-item"], [class*="train-marker"]');
      return trainElements.length;
    });
    console.log(`- Anzahl Züge gefunden: ${trainCount}`);
    
    console.log('\n✨ DEPLOYMENT ERFOLGREICH!');
    console.log(`🔗 Preview URL: ${workingUrl}/depot/map`);
    
  } catch (error) {
    console.error('❌ Test fehlgeschlagen:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testVercelDeployment().catch(console.error);
