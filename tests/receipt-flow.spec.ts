import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
test("public routes reveal no operational interface", async ({
  page,
  request,
}) => {
  const root = await page.goto("/");
  expect(root?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Link tidak tersedia." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Dashboard|Orders|Masuk/ }),
  ).toHaveCount(0);
  const unknown = await page.goto("/r/" + "x".repeat(43));
  expect(unknown?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Link tidak tersedia." }),
  ).toBeVisible();
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali." }),
  ).toBeVisible();
  const blocked = await request.post("/api/admin/orders", { data: {} });
  expect(blocked.status()).toBe(403);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("staff creates multi-item order, uploads photos, edits status, confirms and opens private receipt", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(
    !process.env.TEST_STAFF_EMAIL || !process.env.TEST_STAFF_PASSWORD,
    "Configure dedicated test staff credentials.",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/admin/login");
  await page.getByLabel("Email staf").fill(process.env.TEST_STAFF_EMAIL!);
  await page.getByLabel("Kata sandi").fill(process.env.TEST_STAFF_PASSWORD!);
  await page.getByRole("button", { name: "Masuk ke studio" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: "+ Pesanan baru" }).click();
  await page
    .getByLabel("Nama pelanggan")
    .fill(`Rundori Test ${testInfo.project.name}`);
  await page.getByLabel("WhatsApp", { exact: true }).fill("081234567890");
  await page
    .getByLabel("Detail sepatu")
    .fill("TEST SAMPLE · White trainers · Size 42");
  await page.getByLabel("Harga per item").fill("65000");
  await page.getByRole("button", { name: "+ Tambah item" }).click();
  await page
    .getByLabel("Layanan", { exact: true })
    .nth(1)
    .fill("Special Treatment");
  await page
    .getByLabel("Detail sepatu")
    .nth(1)
    .fill("TEST SAMPLE · Black suede · Size 39");
  await page.getByLabel("Harga per item").nth(1).fill("85000");
  await page.getByLabel("Jumlah dibayar").fill("50000");
  await page
    .getByLabel("Catatan untuk pelanggan")
    .fill("Struk uji, bukan transaksi pelanggan.");
  await page
    .getByLabel("Catatan internal staf")
    .fill("INTERNAL SECRET MUST NOT APPEAR ON PUBLIC RECEIPT");
  await page.getByRole("button", { name: "Simpan & lanjut ke foto" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\/[a-f0-9-]+$/);
  const adminUrl = page.url();
  const uploaders = page.locator(".photo-uploader");
  await uploaders
    .nth(0)
    .locator("input[multiple]")
    .nth(0)
    .setInputFiles("tests/fixtures/before.png");
  await expect(uploaders.nth(0).getByRole("status")).toContainText(
    "1 foto tersimpan.",
  );
  await uploaders
    .nth(0)
    .locator("input[multiple]")
    .nth(1)
    .setInputFiles("tests/fixtures/after.png");
  await expect(uploaders.nth(0).getByRole("status")).toContainText(
    "1 foto tersimpan.",
  );
  await uploaders
    .nth(1)
    .locator("input[multiple]")
    .nth(0)
    .setInputFiles(["tests/fixtures/before.png", "tests/fixtures/after.png"]);
  await expect(uploaders.nth(1).getByRole("status")).toContainText(
    "2 foto tersimpan.",
  );
  await page.locator(".edit-details summary").click();
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("ready");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.locator(".page-heading .badge")).toHaveText("Siap diambil");
  await page.getByRole("button", { name: "Periksa & konfirmasi" }).click();
  await page.getByLabel("Detail dan foto sudah saya periksa.").check();
  await page.getByRole("button", { name: "Konfirmasi & buat link" }).click();
  const input = page.getByLabel("Link struk pribadi");
  await expect(input).toBeVisible();
  const url = await input.inputValue();
  expect(new URL(url).pathname).toMatch(/^\/r\/[A-Za-z0-9_-]{43}$/);
  const customer = await browser.newContext({
    viewport:
      testInfo.project.name === "mobile"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
  });
  const receipt = await customer.newPage();
  await receipt.goto(url);
  await expect(
    receipt.getByRole("heading", {
      name: `Terima kasih, Rundori Test ${testInfo.project.name}.`,
    }),
  ).toBeVisible();
  await expect(
    receipt.getByText(/Rp\s*100\.000/, { exact: true }),
  ).toBeVisible();
  await expect(
    receipt.getByText("INTERNAL SECRET MUST NOT APPEAR ON PUBLIC RECEIPT"),
  ).toHaveCount(0);
  await expect(
    receipt.getByRole("link", { name: /Dashboard|Settings|Orders/ }),
  ).toHaveCount(0);
  await expect(receipt.locator(".customer-gallery img")).toHaveCount(3);
  await expect
    .poll(() =>
      receipt
        .locator(".customer-gallery img")
        .evaluateAll((nodes) =>
          nodes.every(
            (n) =>
              (n as HTMLImageElement).complete &&
              (n as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await receipt.getByRole("tab", { name: "Sesudah 1" }).click();
  await expect(
    receipt.locator(".receipt-item").first().locator(".customer-gallery img"),
  ).toHaveCount(1);
  expect(
    await receipt.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await receipt.screenshot({
    path: `test-results/receipt-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.screenshot({
    path: `test-results/admin-${testInfo.project.name}.png`,
    fullPage: true,
  });
  writeFileSync(
    `test-results/sample-${testInfo.project.name}.json`,
    JSON.stringify({ adminUrl, url }, null, 2),
  );
  await page.getByRole("button", { name: "Periksa & konfirmasi" }).click();
  await page.getByLabel("Detail dan foto sudah saya periksa.").check();
  await page.getByRole("button", { name: "Konfirmasi & buat link" }).click();
  await expect(input).not.toHaveValue(url);
  await receipt.goto(url);
  await expect(
    receipt.getByRole("heading", { name: "Link tidak tersedia." }),
  ).toBeVisible();
  const newest = await input.inputValue();
  await receipt.goto(newest);
  await expect(
    receipt.getByRole("heading", { name: "Rincian pembayaran." }),
  ).toBeVisible();
  writeFileSync(
    `test-results/sample-${testInfo.project.name}.json`,
    JSON.stringify({ adminUrl, url: newest }, null, 2),
  );
  expect(errors).toEqual([]);
  await customer.close();
});
