const { chromium } = require('playwright');

const OUT = 'C:/HADOOP~1/claude/c--Users-Huawei-OneDrive-Desktop-turpoint-marketplace/e72dff05-8341-4b7b-8a69-53e869c434b9/scratchpad';

const targets = [
  { url: 'https://www.airbnb.com/host/homes', name: 'airbnb-host' },
  { url: 'https://www.getyourguide.com/supplier/', name: 'gyg-supplier' },
  { url: 'https://www.viator.com/partners', name: 'viator-partners' },
];

(async () => {
  const browser = await chromium.launch();
  for (const t of targets) {
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${OUT}/ref-${t.name}.png` });
      console.log('OK', t.url);
      await page.close();
    } catch (e) {
      console.log('FAILED', t.url, e.message);
    }
  }
  await browser.close();
})();
