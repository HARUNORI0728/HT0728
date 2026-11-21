// 使い方: node brand/zoom/render.js   → brand/zoom/*.png を書き出す
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'zoom-backgrounds.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const ids = await page.$$eval('.bg', els => els.map(e => e.id));
  for (const id of ids) {
    await page.locator('#' + id).screenshot({ path: path.join(__dirname, `zoom-${id}.png`) });
    console.log('saved', `zoom-${id}.png`);
  }
  await browser.close();
})();
