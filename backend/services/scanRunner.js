/**
 * ScanRunner — Orchestrate the Puppeteer + axe-core scanning lifecycle.
 *
 * Responsibilities:
 *   - validates URL via SSRF guard. (done)
 *   - Launch headless Chromium via Puppeteer
 *   - Navigate to the target URL
 *   - Inject axe-core library into the page context
 *   - Execute axe.run() with WCAG 2.1 AA tags
 *   - Transform raw results via axeTransformer.transform()
 *   - Return the equalView-compatible ScanResult
 */

const {validate} = require('./ssrfGuard');
const puppeteer = require('puppeteer');
const { transform } = require('./axeTransformer');
const axe = require('axe-core');


class ScanRunner {
  async run(url) {
    // Validate the URL against SSRF policy before proceeding.
    const guard = validate(url);

    if (!guard.ok) {
      throw new Error(`SSRF validation failed: ${guard.reason}`);
    }

    // Launch headless Chromium via Puppeteer
    let browser;

    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Inject axe-core library into the page context and execute axe.run()
    try {
      await page.addScriptTag({ content: axe.source });
      const axeResults = await page.evaluate(() => {
        return new Promise((resolve) => {
          axe.run((err, results) => {
            if (err) throw err;
            resolve(results);
            });
        });
      });

      // Transform raw results via axeTransformer.transform() and return the ScanResult
      const scanResult = transform(axeResults);
      return scanResult;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      // Ensure the browser is closed even if an error occurs.
      if (browser) {
        await browser.close();
      }
    }
  }

  async getResults(url) {
    // TODO: implement getResults
    return null;
  }
}

module.exports = ScanRunner;