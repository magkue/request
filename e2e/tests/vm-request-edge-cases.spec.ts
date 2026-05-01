import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { VM_REQUEST_CONFIGS } from "../fixtures/test-data";
import { resetTestState, getLatestTicket } from "../helpers/debug-api";
import {
  clickNext,
  fillNewSSHKey,
  fillVMRequestForm,
  navigateFromHome,
} from "../helpers/form-fillers";
import { SERVER_URL } from "../playwright.config";

async function navigateToVMForm(page: Page) {
  await navigateFromHome(page, "Request a New VM");
  await page.getByText("Basic Information").waitFor();
}

async function clickNextAndWait(page: Page, nextStepTitle: string) {
  await clickNext(page);
  await page.getByRole("heading", { name: nextStepTitle }).waitFor();
}

async function clickPreviousAndWait(page: Page, prevStepTitle: string) {
  await page.getByRole("button", { name: "Previous" }).click();
  await page.getByRole("heading", { name: prevStepTitle }).waitFor();
}

test.describe("VM Request - Issue #1 Reproduction", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("exact issue #1: select thesis then switch to chair_project with public ports", async ({
    authenticatedPage: page,
    request,
  }) => {
    await navigateToVMForm(page);

    // Step 1: Fill basic info - FIRST select thesis (like the user likely did)
    await page.getByPlaceholder("my-vm-name").fill("e2e-issue1-vm");
    await page
      .getByPlaceholder("Describe what this VM will be used for")
      .fill("VM for the research study on ML interpretability");

    // Select thesis first and partially fill it
    await page.locator('label[for="thesis"]').click();

    // Then switch to Chair Project (the user's final choice per the screenshot)
    await page.locator('label[for="chair_project"]').click();
    await page.getByPlaceholder("Enter project name").waitFor();
    await page.getByPlaceholder("Enter project name").fill("ml-interpretability");
    await page
      .getByPlaceholder("Describe the chair project")
      .fill("A study to compare different ML explanation methods.");
    await page.getByPlaceholder("Enter responsible person").fill("Jane Doe");

    await clickNextAndWait(page, "Resource Configuration");

    // Step 2: Resources - set CPU to 2 (matching the issue screenshot)
    const cpuInput = page.locator('input[type="number"]').first();
    await cpuInput.fill("2");

    await clickNextAndWait(page, "Firewall Configuration");

    // Step 3: Firewall - add public ports 80 and 443
    await page.getByRole("button", { name: /Add Port/i }).click();
    await page.getByPlaceholder("Why is this port needed?").first().waitFor();
    const portInputs1 = page.locator('input[type="number"]');
    await portInputs1.last().fill("80");
    const protocolSelects1 = page.getByRole("combobox");
    await protocolSelects1.last().click();
    await page.getByRole("option", { name: "tcp" }).click();
    const reasonInputs1 = page.getByPlaceholder("Why is this port needed?");
    await reasonInputs1.last().fill("Web server");
    const publicCheckboxes1 = page.getByLabel("Publicly accessible");
    await publicCheckboxes1.last().check();
    const justificationInputs1 = page.getByPlaceholder(
      "Why does this port need to be publicly accessible?",
    );
    await justificationInputs1.last().waitFor();
    await justificationInputs1.last().fill("Standard");

    await page.getByRole("button", { name: /Add Port/i }).click();
    await expect(page.locator('input[type="number"]')).toHaveCount(2);
    const portInputs2 = page.locator('input[type="number"]');
    await portInputs2.last().fill("443");
    const protocolSelects2 = page.getByRole("combobox");
    await protocolSelects2.last().click();
    await page.getByRole("option", { name: "tcp" }).click();
    const reasonInputs2 = page.getByPlaceholder("Why is this port needed?");
    await reasonInputs2.last().fill("HTTPS server");
    const publicCheckboxes2 = page.getByLabel("Publicly accessible");
    await publicCheckboxes2.last().check();
    const justificationInputs2 = page.getByPlaceholder(
      "Why does this port need to be publicly accessible?",
    );
    await justificationInputs2.last().waitFor();
    await justificationInputs2.last().fill("Standard");

    await clickNextAndWait(page, "Additional User Accounts");

    // Step 4: Users
    await page.getByRole("button", { name: /Add User/i }).click();
    await page.getByPlaceholder("Enter username").first().waitFor();
    await page.getByPlaceholder("Enter username").last().fill("user-one");
    await page.getByRole("button", { name: /Add User/i }).click();
    await expect(page.getByPlaceholder("Enter username")).toHaveCount(2);
    await page.getByPlaceholder("Enter username").last().fill("user-two");

    await clickNextAndWait(page, "SSH Key");

    // Step 5: SSH Key
    await fillNewSSHKey(page);
    await clickNextAndWait(page, "Review Your Request");

    // Step 6: Submit
    await page.getByRole("button", { name: "Submit Request" }).click();
    await page.getByText("Request Submitted!").waitFor({ timeout: 15000 });

    // Verify the ticket has chair project data, NOT thesis data
    const ticket = await getLatestTicket(request);
    expect(ticket.summary).toContain("[VM Request]");
    expect(ticket.summary).toContain("e2e-issue1-vm");
    expect(ticket.description).toContain("Chair Project");
    expect(ticket.description).toContain("ml-interpretability");
    expect(ticket.description).toContain("Jane Doe");
    expect(ticket.description).toContain("80");
    expect(ticket.description).toContain("443");
    expect(ticket.description).toContain("user-one");
    expect(ticket.description).toContain("user-two");
    expect(ticket.description).toContain("**CPU Cores:** 2");
  });

  test("issue #1 config as direct submission (without switching)", async ({
    authenticatedPage: page,
    request,
  }) => {
    await fillVMRequestForm(page, VM_REQUEST_CONFIGS.issue_1_chair_project_with_public_ports);

    const ticket = await getLatestTicket(request);
    expect(ticket.summary).toContain("[VM Request]");
    expect(ticket.summary).toContain("e2e-issue1-vm");
    expect(ticket.description).toContain("Chair Project");
    expect(ticket.description).toContain("ml-interpretability");
    expect(ticket.description).toContain("Jane Doe");
    expect(ticket.description).toContain("**CPU Cores:** 2");
  });
});

test.describe("VM Request - Project Type Switching", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("switch from ipraktikum to thesis before submitting", async ({
    authenticatedPage: page,
    request,
  }) => {
    await navigateToVMForm(page);

    // Step 1: Fill basic info
    await page.getByPlaceholder("my-vm-name").fill("e2e-switch-to-thesis");
    await page
      .getByPlaceholder("Describe what this VM will be used for")
      .fill("Testing project type switch from ipraktikum to thesis");

    // First select iPraktikum and fill its fields
    await page.locator('label[for="ipraktikum"]').click();
    await page.getByPlaceholder("Enter team name").waitFor();
    await page.getByPlaceholder("Enter team name").fill("Team Switch");
    await page.getByPlaceholder("Enter coach name").fill("Coach Switch");
    await page.getByPlaceholder("Enter project lead name").fill("PL Switch");

    // Now switch to thesis
    await page.locator('label[for="thesis"]').click();
    await page.getByPlaceholder("Enter thesis title").waitFor();
    await page.locator('label[for="level-BA"]').click();
    await page.getByPlaceholder("Enter thesis title").fill("Switched Thesis Title");
    await page.getByPlaceholder("Enter advisor name").fill("Prof. Switched");

    await clickNextAndWait(page, "Resource Configuration");

    // Step 2: Resources (defaults)
    await clickNextAndWait(page, "Firewall Configuration");

    // Step 3: Firewall (defaults)
    await clickNextAndWait(page, "Additional User Accounts");

    // Step 4: Users (none)
    await clickNextAndWait(page, "SSH Key");

    // Step 5: SSH Key
    await fillNewSSHKey(page);
    await clickNextAndWait(page, "Review Your Request");

    // Step 6: Review & Submit
    await page.getByRole("button", { name: "Submit Request" }).click();
    await page.getByText("Request Submitted!").waitFor({ timeout: 15000 });

    // Verify the ticket has thesis data, NOT iPraktikum data
    const ticket = await getLatestTicket(request);
    expect(ticket.summary).toContain("[VM Request]");
    expect(ticket.summary).toContain("e2e-switch-to-thesis");
    expect(ticket.description).toContain("Thesis");
    expect(ticket.description).toContain("BA");
    expect(ticket.description).toContain("Switched Thesis Title");
    expect(ticket.description).toContain("Prof. Switched");
    expect(ticket.description).not.toContain("Team Switch");
  });

  test("switch from thesis to chair_project before submitting", async ({
    authenticatedPage: page,
    request,
  }) => {
    await navigateToVMForm(page);

    await page.getByPlaceholder("my-vm-name").fill("e2e-switch-to-chair");
    await page
      .getByPlaceholder("Describe what this VM will be used for")
      .fill("Testing project type switch from thesis to chair project");

    // First select thesis and fill its fields
    await page.locator('label[for="thesis"]').click();
    await page.getByPlaceholder("Enter thesis title").waitFor();
    await page.locator('label[for="level-MA"]').click();
    await page.getByPlaceholder("Enter thesis title").fill("Abandoned Thesis");
    await page.getByPlaceholder("Enter advisor name").fill("Prof. Abandoned");

    // Switch to chair_project
    await page.locator('label[for="chair_project"]').click();
    await page.getByPlaceholder("Enter project name").waitFor();
    await page.getByPlaceholder("Enter project name").fill("Final Chair Project");
    await page
      .getByPlaceholder("Describe the chair project")
      .fill("This is the actual project after switching from thesis");

    await clickNextAndWait(page, "Resource Configuration");

    // Steps 2-5: defaults
    await clickNextAndWait(page, "Firewall Configuration");
    await clickNextAndWait(page, "Additional User Accounts");
    await clickNextAndWait(page, "SSH Key");

    // SSH Key
    await fillNewSSHKey(page);
    await clickNextAndWait(page, "Review Your Request");

    // Submit
    await page.getByRole("button", { name: "Submit Request" }).click();
    await page.getByText("Request Submitted!").waitFor({ timeout: 15000 });

    const ticket = await getLatestTicket(request);
    expect(ticket.summary).toContain("e2e-switch-to-chair");
    expect(ticket.description).toContain("Chair Project");
    expect(ticket.description).toContain("Final Chair Project");
    expect(ticket.description).not.toContain("Abandoned Thesis");
  });

  test("switch from chair_project to ipraktikum before submitting", async ({
    authenticatedPage: page,
    request,
  }) => {
    await navigateToVMForm(page);

    await page.getByPlaceholder("my-vm-name").fill("e2e-switch-to-iprak");
    await page
      .getByPlaceholder("Describe what this VM will be used for")
      .fill("Testing project type switch from chair project to ipraktikum");

    // First select chair_project
    await page.locator('label[for="chair_project"]').click();
    await page.getByPlaceholder("Enter project name").waitFor();
    await page.getByPlaceholder("Enter project name").fill("Old Project");
    await page
      .getByPlaceholder("Describe the chair project")
      .fill("This will be abandoned");

    // Switch to ipraktikum
    await page.locator('label[for="ipraktikum"]').click();
    await page.getByPlaceholder("Enter team name").waitFor();
    await page.getByPlaceholder("Enter team name").fill("Team Final");
    await page.getByPlaceholder("Enter coach name").fill("Coach Final");
    await page.getByPlaceholder("Enter project lead name").fill("PL Final");

    await clickNextAndWait(page, "Resource Configuration");

    // Steps 2-5: defaults
    await clickNextAndWait(page, "Firewall Configuration");
    await clickNextAndWait(page, "Additional User Accounts");
    await clickNextAndWait(page, "SSH Key");

    // SSH Key
    await fillNewSSHKey(page);
    await clickNextAndWait(page, "Review Your Request");

    // Submit
    await page.getByRole("button", { name: "Submit Request" }).click();
    await page.getByText("Request Submitted!").waitFor({ timeout: 15000 });

    const ticket = await getLatestTicket(request);
    expect(ticket.summary).toContain("e2e-switch-to-iprak");
    expect(ticket.description).toContain("iPraktikum");
    expect(ticket.description).toContain("Team Final");
    expect(ticket.description).not.toContain("Old Project");
  });
});

test.describe("VM Request - Error Handling Preserves Form Data", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("form data is preserved after submission failure and retry succeeds", async ({
    authenticatedPage: page,
    request,
  }) => {
    await navigateToVMForm(page);

    // Fill the full form
    await page.getByPlaceholder("my-vm-name").fill("e2e-error-retry");
    await page
      .getByPlaceholder("Describe what this VM will be used for")
      .fill("Testing error handling preserves form data");

    await page.locator('label[for="ipraktikum"]').click();
    await page.getByPlaceholder("Enter team name").waitFor();
    await page.getByPlaceholder("Enter team name").fill("Error Team");
    await page.getByPlaceholder("Enter coach name").fill("Error Coach");
    await page.getByPlaceholder("Enter project lead name").fill("Error PL");

    await clickNextAndWait(page, "Resource Configuration");
    await clickNextAndWait(page, "Firewall Configuration");
    await clickNextAndWait(page, "Additional User Accounts");
    await clickNextAndWait(page, "SSH Key");

    // SSH Key
    await fillNewSSHKey(page);
    await clickNextAndWait(page, "Review Your Request");

    // Intercept the API call ONCE to simulate server error
    let intercepted = false;
    await page.route(`${SERVER_URL}/api/v1/vm-requests`, async (route) => {
      if (!intercepted && route.request().method() === "POST") {
        intercepted = true;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Internal Server Error" }),
        });
      } else {
        await route.continue();
      }
    });

    // Submit - should fail
    await page.getByRole("button", { name: "Submit Request" }).click();

    // Verify error toast appears
    await expect(page.getByText(/Submission failed/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("Our server ran into a problem. Please try again later."),
    ).toBeVisible();

    // Verify the form is still visible (review step should still be showing)
    await expect(
      page.getByRole("button", { name: "Retry Submission" }),
    ).toBeVisible();

    // Navigate back to step 1 to verify data is preserved
    await clickPreviousAndWait(page, "SSH Key");
    await clickPreviousAndWait(page, "Additional User Accounts");
    await clickPreviousAndWait(page, "Firewall Configuration");
    await clickPreviousAndWait(page, "Resource Configuration");
    await clickPreviousAndWait(page, "Basic Information");

    // Verify step 1 data is preserved
    await expect(page.getByPlaceholder("my-vm-name")).toHaveValue(
      "e2e-error-retry",
    );
    await expect(page.getByPlaceholder("Enter team name")).toHaveValue("Error Team");

    // Navigate forward to review and retry submission
    await clickNextAndWait(page, "Resource Configuration");
    await clickNextAndWait(page, "Firewall Configuration");
    await clickNextAndWait(page, "Additional User Accounts");
    await clickNextAndWait(page, "SSH Key");
    await clickNextAndWait(page, "Review Your Request");

    // Retry - should succeed now (route interceptor only blocks once)
    await page.getByRole("button", { name: "Retry Submission" }).click();
    await page.getByText("Request Submitted!").waitFor({ timeout: 15000 });

    const ticket = await getLatestTicket(request);
    expect(ticket.summary).toContain("e2e-error-retry");
    expect(ticket.description).toContain("Error Team");
  });
});
