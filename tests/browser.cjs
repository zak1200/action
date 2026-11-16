/* Run with a locally installed Playwright, or set PLAYWRIGHT_PATH / CHROMIUM_PATH.
   No browser/test dependency is shipped with the static website. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const output = path.resolve(process.env.ARTIFACT_DIR || "test-results");
const url = process.env.DEMO_URL || "http://127.0.0.1:4173";

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Europe/Paris",
  });
  const page = await context.newPage();
  const errors = [],
    failedLocal = [],
    report = { url, widths: [], checks: [], accessibility: [] };
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(url) && r.status() >= 400)
      failedLocal.push(`${r.status()} ${r.url()}`);
  });
  const check = (label, condition) => {
    assert.ok(condition, label);
    report.checks.push(label);
  };
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    check(
      "Six semantic service cards",
      (await page.locator(".service-card button").count()) === 6,
    );
    check(
      "No third-party iframe loaded before consent click",
      (await page.locator("iframe").count()) === 0,
    );
    check(
      "Preview SEO and robots preserved",
      (await page.locator("meta[name=robots]").getAttribute("content")) ===
        "noindex,nofollow" &&
        (await page.title()) ===
          "Action Étrangers — Avançons dans vos démarches",
    );
    check(
      "All brand images loaded without distortion",
      await page
        .locator('img[src*="action-etranger-logo"]')
        .evaluateAll((images) =>
          images.every(
            (i) =>
              i.complete &&
              i.naturalWidth === 512 &&
              Math.abs(i.width - i.height) < 1,
          ),
        ),
    );
    check(
      "Both self-hosted fonts loaded",
      await page.evaluate(
        () =>
          document.fonts.check("600 20px Manrope") &&
          document.fonts.check('400 18px "Source Sans 3"'),
      ),
    );
    check(
      "All internal links resolve",
      await page
        .locator('a[href^="#"]')
        .evaluateAll((links) =>
          links.every(
            (a) =>
              a.hash === "" ||
              a.hash === "#admin" ||
              document.getElementById(a.hash.slice(1)),
          ),
        ),
    );
    for (const width of [1440, 1024, 768, 390, 375]) {
      await page.setViewportSize({ width, height: width >= 1024 ? 1000 : 844 });
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      check(
        `No overflow at ${width}px`,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const dimensions = await page
        .locator(".service-card")
        .evaluateAll((cards) =>
          cards.map((c) => ({ width: c.offsetWidth, height: c.offsetHeight })),
        );
      report.widths.push({ width, cards: dimensions });
      await page.screenshot({
        path: path.join(output, `desktop-${width}.png`),
        fullPage: true,
      });
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: path.join(
            output,
            width === 1440 ? "desktop.png" : "mobile.png",
          ),
        });
    }
    if (process.env.AXE_PATH) {
      const AxeBuilder = require(process.env.AXE_PATH).default;
      const audit = async (label) => {
        const result = await new AxeBuilder({ page })
          .withTags([
            "wcag2a",
            "wcag2aa",
            "wcag21a",
            "wcag21aa",
            "wcag22aa",
            "best-practice",
          ])
          .analyze();
        report.accessibility.push({ label, violations: result.violations });
        assert.equal(
          result.violations.length,
          0,
          `${label}: ${result.violations.map((v) => v.id + ": " + v.nodes.map((n) => n.target).join(",")).join("; ")}`,
        );
      };
      await audit("Mobile homepage");
      await page.setViewportSize({ width: 1440, height: 1000 });
      await audit("Desktop homepage");
      await page
        .getByRole("button", {
          name: "Parlons de votre situation",
          exact: true,
        })
        .click();
      await audit("Appointment form");
      await page.keyboard.press("Escape");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
      .click();
    check(
      "Mobile menu opens with accessible state",
      (await page.locator(".menu-toggle").getAttribute("aria-expanded")) ===
        "true",
    );
    await page.keyboard.press("Escape");
    check(
      "Escape closes menu and restores toggle focus",
      await page
        .locator(".menu-toggle")
        .evaluate(
          (el) =>
            el === document.activeElement &&
            el.getAttribute("aria-expanded") === "false",
        ),
    );
    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
      .click();
    await page.locator('#navigation a[href="#services"]').click();
    check(
      "Mobile anchor closes menu and marks destination",
      (await page.locator(".menu-toggle").getAttribute("aria-expanded")) ===
        "false" &&
        (await page
          .locator('#navigation a[href="#services"]')
          .getAttribute("aria-current")) === "location",
    );
    const names = [
      "Titre de séjour",
      "Naturalisation",
      "Regroupement familial",
      "DCEM",
      "Permis de conduire",
      "OQTF et orientation",
    ];
    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
      check(
        `Service dialog: ${name}`,
        (await page.locator("#info-title").innerText()) === name,
      );
      if (name === "OQTF et orientation")
        check(
          "OQTF legal orientation disclaimer retained",
          /avocat/.test(await page.locator("#info-content").innerText()),
        );
      await page
        .getByRole("button", { name: "Parler de cette démarche" })
        .click();
      check(
        `Service preselected: ${name}`,
        (await page.locator("#booking-service").inputValue()) === name,
      );
      await page.keyboard.press("Escape");
    }
    await page
      .getByRole("button", { name: "Titre de séjour", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Parler de cette démarche" })
      .click();
    check(
      "30 minutes, €10, refund qualification retained",
      /30 minutes · 10 €/.test(
        await page.locator("#booking-dialog").innerText(),
      ) &&
        /non remboursable, sous réserve/.test(
          await page.locator("#booking-dialog").innerText(),
        ),
    );
    check(
      "Description stays optional",
      (await page
        .locator("textarea[name=description]")
        .getAttribute("required")) === null,
    );
    const min = await page.locator("#booking-date").getAttribute("min");
    const saturday = new Date(`${min}T12:00:00Z`);
    saturday.setUTCDate(
      saturday.getUTCDate() + ((6 - saturday.getUTCDay() + 7) % 7),
    );
    await page
      .locator("#booking-date")
      .fill(saturday.toISOString().slice(0, 10));
    check(
      "Weekend rejected with visible explanation",
      /lundi au vendredi/.test(await page.locator("#date-error").innerText()),
    );
    const day = new Date(`${min}T12:00:00Z`);
    do {
      day.setUTCDate(day.getUTCDate() + 1);
    } while ([0, 6].includes(day.getUTCDay()));
    const date = day.toISOString().slice(0, 10);
    await page.locator("#booking-date").fill(date);
    check(
      "16 half-hour slots between 09:00 and 16:30",
      (await page.locator("#booking-time option").count()) === 17,
    );
    await page.locator("#booking-time").selectOption("09:00");
    await page.locator("[name=name]").fill("<img src=x onerror=alert(1)>");
    await page.locator("[name=email]").fill("demo@example.com");
    await page.locator("[name=consent]").check();
    await page.getByRole("button", { name: "Simuler mon rendez-vous" }).click();
    check(
      "Simulation succeeds without optional description",
      /Aucun rendez-vous réel/.test(
        await page.locator("#booking-success").innerText(),
      ),
    );
    await page.getByRole("button", { name: "Voir la démo admin" }).click();
    check(
      "Admin lists the simulated appointment",
      (await page.locator("#booking-count").innerText()) === "1",
    );
    check(
      "User input rendered safely as text",
      (await page.locator(".booking-row img").count()) === 0 &&
        (await page.locator(".booking-row").innerText()).includes(
          "<img src=x onerror=alert(1)>",
        ),
    );
    await page.screenshot({
      path: path.join(output, "admin-mobile.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Ajouter une simulation" }).click();
    await page.locator("#booking-date").fill(date);
    check(
      "Booked slot excluded",
      (await page.locator('#booking-time option[value="09:00"]').count()) === 0,
    );
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Annuler la simulation" }).click();
    check(
      "Cancellation updates count",
      (await page.locator("#booking-count").innerText()) === "0",
    );
    await page.getByRole("button", { name: "Ajouter une simulation" }).click();
    await page.locator("#booking-date").fill(date);
    check(
      "Cancellation releases the slot",
      (await page.locator('#booking-time option[value="09:00"]').count()) === 1,
    );
    await page.keyboard.press("Escape");
    await page.reload();
    check(
      "Reload clears all demo data",
      (await page.locator(".booking-row").count()) === 0,
    );
    await page.getByRole("link", { name: "Revenir au site" }).click();
    for (const summary of await page.locator("summary").all()) {
      await summary.click();
      check(
        "FAQ answer expands",
        await summary.evaluate((el) => el.parentElement.open),
      );
      await summary.click();
    }
    await page.getByRole("button", { name: "À propos de cette démo" }).click();
    check(
      "Privacy/demo disclosure preserved",
      /Aucun formulaire n’est transmis/.test(
        await page.locator("#info-content").innerText(),
      ),
    );
    await page.keyboard.press("Escape");
    await page.emulateMedia({ reducedMotion: "reduce" });
    check(
      "Reduced motion respected",
      await page.evaluate(
        () =>
          getComputedStyle(document.documentElement).scrollBehavior ===
            "auto" &&
          getComputedStyle(document.querySelector(".button"))
            .transitionDuration === "0s",
      ),
    );
    await page
      .getByRole("button", { name: "Afficher la carte", exact: true })
      .click();
    check(
      "Google Maps still loads on request",
      (await page.locator("#map-wrap iframe").getAttribute("src")) ===
        "https://www.google.com/maps?q=14+Boulevard+Charles+Nedelec+13001+Marseille&output=embed",
    );
    for (const [index, id] of [
      "7690160346375540000",
      "7623823855907294486",
    ].entries()) {
      await page.locator("[data-video]").first().click();
      check(
        `TikTok ${index + 1} correct player URL`,
        (await page
          .locator(".video-art iframe")
          .nth(index)
          .getAttribute("src")) ===
          `https://www.tiktok.com/player/v1/${id}?autoplay=0`,
      );
      check(
        `TikTok ${index + 1} fallback link present`,
        (await page
          .locator(".external-video-link")
          .nth(index)
          .getAttribute("href")) ===
          `https://www.tiktok.com/@action.etrangers/video/${id}`,
      );
    }
    check("No application JavaScript errors", errors.length === 0);
    check("No missing local assets", failedLocal.length === 0);
    report.status = "passed";
    console.log(
      `PASS: ${report.checks.length} checks, five responsive widths, ${report.accessibility.length} accessibility scans.`,
    );
  } catch (error) {
    report.status = "failed";
    report.error = error.message;
    throw error;
  } finally {
    report.errors = errors;
    report.failedLocal = failedLocal;
    await fs.writeFile(
      path.join(output, "verification.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
