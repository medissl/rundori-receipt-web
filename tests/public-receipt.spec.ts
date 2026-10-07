import { test, expect } from "@playwright/test";

test("existing sample receipt is read-only, private and usable on each viewport", async ({
  page,
}, info) => {
  test.skip(
    !process.env.TEST_RECEIPT_URL,
    "Provide the marked sample receipt URL.",
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(process.env.TEST_RECEIPT_URL!);
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(
    page.getByRole("heading", { name: "Rincian pembayaran." }),
  ).toBeVisible();
  await expect(page.getByText(/Rp\s*100\.000/, { exact: true })).toBeVisible();
  await expect(
    page.getByText("PRIVATE TEST NOTE", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Dashboard|Orders|Settings|Masuk/ }),
  ).toHaveCount(0);
  await expect(page.locator("form")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Hubungi via WhatsApp ↗" }),
  ).toHaveAttribute("href", /wa\.me/);
  await expect
    .poll(() =>
      page
        .locator(".customer-gallery img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.getByRole("tab", { name: "Sesudah 1", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".receipt-item")
        .first()
        .locator(".customer-gallery img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Perbesar foto 1", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Tutup foto", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/live-receipt-${info.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("heading", { name: "Rincian pembayaran." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
