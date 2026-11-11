import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "playwright-core";
import type { applicationFixture } from "../sidecar/applications/test-fixture";
import type { Applications } from "../sidecar/applications/service";

export async function runVisualFlow({ page, fixture, applications, dir }: { page: Page; fixture: Awaited<ReturnType<typeof applicationFixture>>; applications: Applications; dir: string }) {
  await page.getByRole("button", { name: "Job applications", exact: true }).click();
  await page.getByLabel("Job application URL").fill(`${fixture.url}/canvas`);
  await page.getByRole("button", { name: "Open application", exact: true }).click();
  await page.getByLabel("Applicant facts and answers").fill("Full name: Iris Test.");
  const cv = join(dir, "iris-visual-cv.txt");
  writeFileSync(cv, "Synthetic visual-browser test CV. Not a real application.");
  await page.getByLabel("Add a CV or supporting document").setInputFiles(cv);
  await page.getByRole("button", { name: "Use iris-visual-cv.txt as facts" }).waitFor();
  assert.equal((await applications.refresh()).application!.fields.some(f => f.kind === "text"), false);
  await page.getByRole("button", { name: "Fill from my facts", exact: true }).click();
  await page.getByRole("button", { name: "Allow once", exact: true }).waitFor({ timeout: 100_000 });
  assert.equal(fixture.received.length, 0);
  const payload = await page.getByLabel("Exact request content").inputValue();
  assert.match(payload, /Iris Test/); assert.match(payload, /iris-visual-cv.txt/);
  await page.screenshot({ path: join(dir, "01-visual-review.png"), fullPage: true });
  await page.getByRole("button", { name: "Allow once", exact: true }).click();
  await page.getByText("The site confirmed:", { exact: false }).waitFor();
  assert.equal(fixture.received.length, 1);
  assert.equal(fixture.received[0]!.fields.name, "Iris Test");
  assert.equal(fixture.received[0]!.files[0]!.name, "iris-visual-cv.txt");
  assert.match(fixture.received[0]!.files[0]!.text, /Synthetic visual-browser test CV/);
  assert.equal((await applications.refresh()).application!.status, "submitted");
  await page.screenshot({ path: join(dir, "02-visual-confirmation.png"), fullPage: true });
  return ["standard Fill action automatically switched to real screenshot-based control for a custom canvas", "agent operated its custom CV chooser and final submit control", "zero requests sent before approval; one application and CV received after approval", "new destination confirmation observed"];
}

export async function runConfirmationFlow({ page, fixture, applications, dir }: { page: Page; fixture: Awaited<ReturnType<typeof applicationFixture>>; applications: Applications; dir: string }) {
  await page.getByRole("button", { name: "Job applications", exact: true }).click();
  await page.getByLabel("Job application URL").fill(`${fixture.url}/french`);
  await page.getByRole("button", { name: "Open application", exact: true }).click();
  await page.getByLabel("Full name (required)", { exact: true }).fill("Iris Test");
  await page.getByRole("button", { name: "Save corrections to form" }).click();
  await page.getByLabel("Site button to use").selectOption({ label: "Submit application" });
  await page.getByLabel("This is the final application submission").check();
  await page.getByRole("button", { name: "Review submission", exact: true }).click();
  await page.getByRole("button", { name: "Allow once", exact: true }).waitFor();
  assert.equal(fixture.received.length, 0);
  await page.getByRole("button", { name: "Allow once", exact: true }).click();
  await page.getByLabel("Site's acceptance message").waitFor({ timeout: 15_000 });
  await page.getByLabel("Site's acceptance message").fill("Votre candidature a été reçue.");
  await page.getByLabel("I can see that the site accepted the application").check();
  await page.getByRole("button", { name: "Record the site confirmation", exact: true }).click();
  await page.getByText("You confirmed the site's application acceptance:", { exact: false }).waitFor();
  assert.equal(fixture.received.length, 1);
  assert.equal((await applications.refresh()).application!.status, "submitted");
  await page.screenshot({ path: join(dir, "01-foreign-confirmation.png"), fullPage: true });
  return ["French destination acceptance remained uncertain until the person supplied its observed quote", "explicit confirmation recorded through Heel's UI; no duplicate submission"];
}
