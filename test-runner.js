// test-runner.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = [];
    this.timestamp = new Date().toISOString();
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    const start = Date.now();
    try {
      const result = await testFunction();
      const duration = Date.now() - start;
      this.results.push({
        test: testName,
        status: 'PASS',
        duration: `${duration}ms`,
        details: result,
      });
      console.log(`✅ PASS (${duration}ms)`);
      return { success: true, details: result };
    } catch (error) {
      const duration = Date.now() - start;
      this.results.push({
        test: testName,
        status: 'FAIL',
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
      });
      console.log(`❌ FAIL: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testCommand(command, expectedOutput = null) {
    try {
      const output = execSync(command, { encoding: 'utf-8' });
      if (expectedOutput && !output.includes(expectedOutput)) {
        throw new Error(`Output doesn't contain: ${expectedOutput}`);
      }
      return output;
    } catch (error) {
      throw new Error(`Command failed: ${error.message}`);
    }
  }

  async testFile(filePath, checks = []) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const check of checks) {
      if (check.contains && !content.includes(check.contains)) {
        throw new Error(`File doesn't contain: ${check.contains}`);
      }
      if (check.notContains && content.includes(check.notContains)) {
        throw new Error(`File shouldn't contain: ${check.notContains}`);
      }
      if (check.regex && !check.regex.test(content)) {
        throw new Error(`File doesn't match regex: ${check.regex}`);
      }
    }
    return { path: filePath, size: content.length, lines: content.split('\n').length };
  }

  async testAPI(endpoint, options = {}) {
    const fetch = (await import('node-fetch')).default;
    const url = `http://localhost:${options.port || 4100}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (options.expectedStatus && response.status !== options.expectedStatus) {
        throw new Error(`Expected status ${options.expectedStatus}, got ${response.status}`);
      }
      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      throw new Error(`API test failed: ${error.message}`);
    }
  }

  async testUI(url, checks = []) {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      const results = {};
      for (const check of checks) {
        if (check.selector) {
          const element = await page.$(check.selector);
          if (!element && check.required) {
            throw new Error(`Required element not found: ${check.selector}`);
          }
          results[check.name || check.selector] = !!element;
        }
        if (check.text) {
          const hasText = await page.evaluate((text) => {
            return document.body.innerText.includes(text);
          }, check.text);
          if (!hasText && check.required) {
            throw new Error(`Required text not found: ${check.text}`);
          }
          results[`text_${check.text}`] = hasText;
        }
      }
      await page.screenshot({ path: `test-screenshots/${Date.now()}.png`, fullPage: true });
      await browser.close();
      return results;
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  generateReport() {
    const report = {
      timestamp: this.timestamp,
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.status === 'PASS').length,
        failed: this.results.filter((r) => r.status === 'FAIL').length,
      },
      results: this.results,
    };
    fs.writeFileSync(`test-report-${Date.now()}.json`, JSON.stringify(report, null, 2));
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Total: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log('='.repeat(50));
    const failures = this.results.filter((r) => r.status === 'FAIL');
    if (failures.length > 0) {
      console.log('\n❌ FAILURES:');
      failures.forEach((f) => {
        console.log(`\n- ${f.test}`);
        console.log(`  Error: ${f.error}`);
      });
    }
    return report;
  }
}

module.exports = TestRunner;
