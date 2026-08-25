import { chromium } from 'playwright';
const PAGES = [
  ['home','/'], ['essays','/essays/'], ['essay','/essays/god-remembered/'],
  ['moments','/moments/'], ['moment','/moments/out-of-the-water/'],
  ['leaders','/leaders/'], ['frameworks','/frameworks/'], ['framework','/frameworks/01-the-two-ages/'],
  ['reading','/reading/'], ['watch','/watch/'], ['about','/about/'], ['speaking','/speaking/'],
  ['subscribe','/subscribe/'], ['mark','/mark/'],
];
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const errors = [];
const ctx = await browser.newContext({ viewport:{width:1440,height:1000}, deviceScaleFactor:2, colorScheme:'light' });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR '+e.message));
for (const [name, path] of PAGES) {
  await page.goto('http://127.0.0.1:4321'+path, { waitUntil:'load' });
  try { await page.evaluate(() => document.fonts.ready); } catch {}
  // Walk the page to trigger scroll-reveal, then let the 2.5s hard timeout
  // in Base.astro guarantee everything is visible regardless.
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 700) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2700);
  await page.screenshot({ path:`/home/claude/shots2/${name}.png`, fullPage:true });
  console.log('  '+name);
}
console.log('CONSOLE ERRORS:', errors.length?JSON.stringify(errors.slice(0,10)):'none');
await browser.close();
