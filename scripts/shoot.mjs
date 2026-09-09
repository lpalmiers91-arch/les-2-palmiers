// Capture d'écran via le Chrome du système (puppeteer-core).
// usage: node scripts/shoot.mjs <url> <out.png> [width] [height] [--full] [--mobile]
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const [url, out, w = "1440", h = "900", ...flags] = process.argv.slice(2);
const full = flags.includes("--full");
const mobile = flags.includes("--mobile");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
});
const page = await browser.newPage();
// captures nettes : on fige les animations d'entrée
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "reduce" },
]);
await page.setViewport({
  width: +w,
  height: +h,
  deviceScaleFactor: 2,
  isMobile: mobile,
  hasTouch: mobile,
});
if (mobile) {
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  );
}
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
// défilement progressif pour déclencher le lazy-load des images
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: out, fullPage: full });
console.log("shot:", out);
await browser.close();
