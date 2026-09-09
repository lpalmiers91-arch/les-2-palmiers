import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const B = "http://localhost:3100";
const OUT = ".impeccable/review";

async function session(email, pw) {
  const br = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  const p = await br.newPage();
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.goto(`${B}/connexion`, { waitUntil: "networkidle0" });
  await p.type('input[type="email"]', email);
  await p.type('input[type="password"]', pw);
  await Promise.all([p.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), p.click('button[type="submit"]')]);
  await new Promise((r) => setTimeout(r, 1500));
  return { br, p };
}

async function grab(p, path, name) {
  await p.goto(B + path, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const err = await p.evaluate(() => document.body.innerText.includes("Application error") || document.body.innerText.includes("digest"));
  console.log(`  ${path} -> ${p.url().includes(path.split("?")[0]) ? "ok" : "REDIR " + p.url()}${err ? " !!ERR" : ""}`);
}

// STAFF
{
  console.log("STAFF —", "staff@les2palmiers.site");
  const { br, p } = await session("staff@les2palmiers.site", "Demo2026!");
  console.log("  landed:", p.url());
  for (const [path, name] of [
    ["/staff", "st-dashboard"],
    ["/staff/reservations", "st-reservations"],
    ["/staff/demandes", "st-demandes"],
    ["/staff/clients", "st-clients"],
    ["/staff/messages", "st-messages"],
    ["/staff/catalogue", "st-catalogue"],
  ]) await grab(p, path, name);
  await br.close();
}

// ADMIN
{
  console.log("ADMIN —", "admin@les2palmiers.site");
  const { br, p } = await session("admin@les2palmiers.site", "Demo2026!");
  console.log("  landed:", p.url());
  for (const [path, name] of [
    ["/admin", "ad-dashboard"],
    ["/admin/statistiques", "ad-stats"],
    ["/admin/equipe", "ad-equipe"],
    ["/admin/paiements", "ad-paiements"],
    ["/admin/audit", "ad-audit"],
    ["/admin/assistant", "ad-assistant"],
  ]) await grab(p, path, name);

  // ASSISTANT WIDGET test
  await p.goto(B + "/admin", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  const btn = await p.$('button[aria-label="Ouvrir l\'assistant"]');
  if (btn) {
    await btn.click();
    await new Promise((r) => setTimeout(r, 500));
    await p.type('input[placeholder="Votre question…"]', "Quel est le revenu ce mois-ci ?");
    await p.click('button[aria-label="Envoyer"]');
    await new Promise((r) => setTimeout(r, 4000));
    await p.screenshot({ path: `${OUT}/ad-assistant-chat.png` });
    const reply = await p.evaluate(() => {
      const bubbles = [...document.querySelectorAll(".bg-bone-2")];
      return bubbles.map((b) => b.textContent).join(" | ").slice(0, 200);
    });
    console.log("  assistant reply:", reply || "(vide)");
  } else console.log("  !! bouton assistant introuvable");
  await br.close();
}
console.log("DONE");
