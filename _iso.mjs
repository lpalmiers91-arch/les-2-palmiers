import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = "https://les-2-palmiers.vercel.app";
const OUT = "C:/Users/USER/Desktop/les-2-palmiers/.impeccable/review/";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });

async function fresh() {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  return { ctx, p };
}
const goto = (p, path) => p.goto(base + path, { waitUntil: "networkidle2", timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function loginTeam(p, email) {
  await goto(p, "/equipe");
  await p.type('input[type="email"]', email);
  await p.type('input[type="password"]', "Demo2026!");
  await Promise.all([p.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}), p.click('button[type="submit"]')]);
  await wait(1500);
}
async function loginClient(p, email) {
  await goto(p, "/connexion");
  await p.type('input[type="email"]', email);
  await p.type('input[type="password"]', "Demo2026!");
  await Promise.all([p.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}), p.click('button[type="submit"]')]);
  await wait(1500);
}
async function tryPath(p, path) {
  await goto(p, path);
  await wait(800);
  return p.url().replace(base, "");
}

const R = [];
// 1. team login -> admin
{
  const { ctx, p } = await fresh();
  await loginTeam(p, "admin@les2palmiers.site");
  R.push(["admin /equipe login lands", p.url().replace(base, "")]);
  R.push(["admin -> /app", await tryPath(p, "/app")]);
  R.push(["admin -> /app/messages", await tryPath(p, "/app/messages")]);
  R.push(["admin -> /connexion", await tryPath(p, "/connexion")]);
  R.push(["admin -> /reserver", await tryPath(p, "/reserver")]);
  R.push(["admin -> /staff (ok)", await tryPath(p, "/staff")]);
  // notification bell links
  await goto(p, "/admin");
  await wait(1000);
  await p.click('button[aria-label^="Notifications"]').catch(() => {});
  await wait(800);
  const bellLinks = await p.$$eval('a[href^="/app"], a[href^="/staff"], a[href^="/admin"]', (els) =>
    els.map((e) => e.getAttribute("href")).filter((h) => /messages|notif|reservation|verific/.test(h)),
  ).catch(() => []);
  R.push(["admin bell links", JSON.stringify(bellLinks.slice(0, 6))]);
  await ctx.close();
}
// 2. staff login
{
  const { ctx, p } = await fresh();
  await loginTeam(p, "staff@les2palmiers.site");
  R.push(["staff /equipe login lands", p.url().replace(base, "")]);
  R.push(["staff -> /admin", await tryPath(p, "/admin")]);
  R.push(["staff -> /app", await tryPath(p, "/app")]);
  await ctx.close();
}
// 3. client login
{
  const { ctx, p } = await fresh();
  await loginClient(p, "client@les2palmiers.site");
  R.push(["client /connexion login lands", p.url().replace(base, "")]);
  R.push(["client -> /staff", await tryPath(p, "/staff")]);
  R.push(["client -> /admin", await tryPath(p, "/admin")]);
  R.push(["client -> /equipe", await tryPath(p, "/equipe")]);
  R.push(["client -> /app (ok)", await tryPath(p, "/app")]);
  await ctx.close();
}
// 4. logged out
{
  const { ctx, p } = await fresh();
  R.push(["anon -> /staff", await tryPath(p, "/staff")]);
  R.push(["anon -> /admin", await tryPath(p, "/admin")]);
  R.push(["anon -> /app", await tryPath(p, "/app")]);
  await goto(p, "/equipe");
  await wait(600);
  const hasForm = await p.$('input[type="password"]');
  R.push(["anon /equipe renders form", !!hasForm]);
  await p.screenshot({ path: OUT + "prod-equipe.png" });
  await ctx.close();
}

await b.close();
console.log("\n=== ISOLATION AUDIT ===");
for (const [k, v] of R) console.log(k.padEnd(34), "->", v);
