// Parcours client de bout en bout : connexion → réservation → paiement simulé → services → messagerie.
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE || "http://localhost:3100";
const OUT = ".impeccable/review";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const log = (...a) => console.log("•", ...a);
const shot = (n) => p.screenshot({ path: `${OUT}/e2e-${n}.png` });

try {
  // 1. connexion
  await p.goto(`${BASE}/connexion`, { waitUntil: "networkidle0" });
  await p.type('input[type="email"]', "client@les2palmiers.site");
  await p.type('input[type="password"]', "Demo2026!");
  await Promise.all([
    p.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
    p.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 1500));
  log("après connexion:", p.url());
  await shot("01-dashboard");

  // 2. réservation
  await p.goto(`${BASE}/reserver?start=2026-11-10&end=2026-11-14&guests=2`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1400)); // devis
  await shot("02-reserver");
  const confirmBtn = await p.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => /Confirmer et payer/i.test(b.textContent)),
  );
  if (confirmBtn && (await confirmBtn.evaluate((el) => !!el))) {
    await confirmBtn.click();
    await new Promise((r) => setTimeout(r, 2500));
    log("après confirmation:", p.url());
    await shot("03-reservation-detail");

    // 3. paiement simulé
    const pay = await p.evaluateHandle(() =>
      [...document.querySelectorAll("button")].find((b) => /Continuer vers le paiement/i.test(b.textContent)),
    );
    if (pay && (await pay.evaluate((el) => !!el))) {
      await pay.click();
      await new Promise((r) => setTimeout(r, 1200));
      await shot("04-payment-screen");
      const ok = await p.evaluateHandle(() =>
        [...document.querySelectorAll("button")].find((b) => /Confirmer le paiement/i.test(b.textContent)),
      );
      await ok.click();
      await new Promise((r) => setTimeout(r, 2500));
      await shot("05-payment-done");
      const statusText = await p.evaluate(() => document.body.innerText.match(/Confirmée|En attente de paiement/)?.[0]);
      log("statut réservation après paiement:", statusText);
    }
  } else {
    log("!! bouton Confirmer introuvable");
  }

  // 4. services
  await p.goto(`${BASE}/app/services`, { waitUntil: "networkidle0" });
  await shot("06-services");
  await p.goto(`${BASE}/app/services/entretien`, { waitUntil: "networkidle0" });
  await shot("07-service-order");
  // remplir + envoyer
  await p.evaluate(() => {
    const sel = document.querySelector("select");
    if (sel) { sel.value = sel.options[1]?.value ?? ""; sel.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await new Promise((r) => setTimeout(r, 300));
  const sendReq = await p.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => /Envoyer la demande/i.test(b.textContent)),
  );
  if (sendReq) {
    await sendReq.click();
    await new Promise((r) => setTimeout(r, 2000));
    await shot("08-service-sent");
    log("demande service:", await p.evaluate(() => document.body.innerText.match(/Demande envoyée/)?.[0] ?? "??"));
  }

  // 5. messagerie
  await p.goto(`${BASE}/app/messages`, { waitUntil: "networkidle0" });
  await p.type("textarea", "Bonjour, à quelle heure puis-je arriver le jour de mon arrivée ?");
  await p.click('button[aria-label="Envoyer"]');
  await new Promise((r) => setTimeout(r, 1800));
  await shot("09-messages");
  log("message visible:", await p.evaluate(() => document.body.innerText.includes("à quelle heure puis-je arriver")));

  // 6. compte
  await p.goto(`${BASE}/app/compte`, { waitUntil: "networkidle0" });
  await shot("10-compte");

  log("OK — parcours terminé");
} catch (e) {
  console.error("ÉCHEC:", e.message);
  await shot("ERROR");
} finally {
  await b.close();
}
