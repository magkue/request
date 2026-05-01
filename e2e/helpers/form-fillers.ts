import type { Page } from "@playwright/test";
import {
  TEST_SSH_KEY_NAME,
  TEST_SSH_PUBLIC_KEY,
  type VMRequestTestConfig,
  type VMAccessTestConfig,
  type ArtemisTestConfig,
  type TUMGuestTestConfig,
  type SupportTestConfig,
} from "../fixtures/test-data";
import { FAKE_TOKEN } from "../fixtures/auth";

import { SERVER_URL } from "../playwright.config";

// ── Navigation helpers ────────────────────────────────────────────────────

export async function navigateFromHome(page: Page, cardTitle: string): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("aet-request.whats-new.v1.dismissed", "true");
  });
  await page.goto("/");
  await page.getByText("Request Forms").waitFor({ timeout: 10000 });
  await page.getByText(cardTitle, { exact: true }).click();
  await page.waitForTimeout(500);
}

// ── Shared helpers ────────────────────────────────────────────────────────

export async function clickNext(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Next" }).click();
  // Wait for step transition
  await page.waitForTimeout(300);
}

async function clickSubmit(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Submit Request" }).click();
}

async function waitForSuccess(page: Page): Promise<void> {
  await page.getByText("Request Submitted!").waitFor({ timeout: 15000 });
}

async function selectRadioCard(page: Page, id: string): Promise<void> {
  // shadcn radio cards: the RadioGroupItem is sr-only, click the Label
  await page.locator(`label[for="${id}"]`).click();
}

async function selectShadcnOption(
  page: Page,
  triggerLabel: string,
  optionText: string,
): Promise<void> {
  // The combobox has an accessible name matching the form label
  await page.getByRole("combobox", { name: triggerLabel }).click();
  // Wait for the dropdown to render (portaled content)
  await page.getByRole("option", { name: optionText, exact: true }).waitFor({ state: "visible", timeout: 5000 });
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

export async function fillNewSSHKey(page: Page): Promise<void> {
  await selectRadioCard(page, "new");
  await page.getByPlaceholder("e.g., My Laptop, Work Desktop").fill(TEST_SSH_KEY_NAME);
  await page.getByPlaceholder("ssh-ed25519 AAAA").fill(TEST_SSH_PUBLIC_KEY);
  // Wait for key validation
  await page.waitForTimeout(500);
}

async function selectExistingSSHKey(page: Page): Promise<void> {
  await selectRadioCard(page, "existing");
  // Wait for keys to load
  await page.waitForTimeout(1000);
  // Click the first available key
  const firstKey = page.locator('input[type="radio"][name]').filter({ hasText: /./}).first();
  // The existing keys are radio buttons inside labeled containers
  const keyContainer = page.locator(".flex.items-center.space-x-3").first();
  await keyContainer.locator("button, input, label").first().click();
}

/**
 * Seed an SSH key via API for "existing key" test cases.
 * Returns the key ID.
 */
export async function seedSSHKey(page: Page): Promise<string> {
  const response = await page.request.post(`${SERVER_URL}/api/v1/ssh-keys`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FAKE_TOKEN}`,
    },
    data: {
      name: "e2e-seeded-key",
      public_key: TEST_SSH_PUBLIC_KEY,
    },
  });
  const data = await response.json();
  return data.id;
}

// ── Date picker helper ────────────────────────────────────────────────────

async function fillDatePicker(
  page: Page,
  dateStr: string,
): Promise<void> {
  // dateStr is YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const day = parseInt(dayStr);

  const shortMonths = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const fullMonths = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Click the date picker trigger button (accessible name comes from FormLabel)
  await page.getByRole("button", { name: "Date of Birth" }).click();
  await page.waitForTimeout(300);

  // The calendar uses combobox dropdowns (captionLayout="dropdown")
  await page.getByRole("combobox", { name: "Choose the Year" }).selectOption(String(year));
  await page.waitForTimeout(200);
  await page.getByRole("combobox", { name: "Choose the Month" }).selectOption(shortMonths[month]);
  await page.waitForTimeout(200);

  // Day buttons have accessible names like "Monday, January 15th, 1990"
  // Match a button whose name contains the full month, the day ordinal, and year
  const targetMonth = fullMonths[month];
  // Build a regex that matches e.g. "January 15th, 1990" or "January 1st, 1990"
  const dayRegex = new RegExp(`${targetMonth} ${day}\\w*,? ${year}`);
  await page.getByRole("gridcell").getByRole("button", { name: dayRegex }).click();

  // Close the popover by pressing Escape
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

// ── VM Request form filler ────────────────────────────────────────────────

export async function fillVMRequestForm(
  page: Page,
  config: VMRequestTestConfig,
): Promise<void> {
  // Navigate from homepage
  await navigateFromHome(page, "Request a New VM");

  // Step 1: Basic Info
  await page.getByPlaceholder("my-vm-name").fill(config.hostname);
  await page.getByPlaceholder("Describe what this VM will be used for").fill(config.description);

  // Select project type
  await selectRadioCard(page, config.projectType);
  await page.waitForTimeout(300);

  // Fill project-specific fields
  if (config.projectType === "ipraktikum") {
    await page.getByPlaceholder("Enter team name").fill(config.teamName!);
    await page.getByPlaceholder("Enter coach name").fill(config.coachName!);
    await page.getByPlaceholder("Enter project lead name").fill(config.projectLead!);
  } else if (config.projectType === "thesis") {
    await selectRadioCard(page, `level-${config.studyLevel}`);
    await page.getByPlaceholder("Enter thesis title").fill(config.thesisTitle!);
    await page.getByPlaceholder("Enter advisor name").fill(config.advisor!);
  } else if (config.projectType === "chair_project") {
    await page.getByPlaceholder("Enter project name").fill(config.projectName!);
    await page.getByPlaceholder("Describe the chair project").fill(config.projectDescription!);
    if (config.responsiblePerson) {
      await page.getByPlaceholder("Enter responsible person").fill(config.responsiblePerson);
    }
  }

  await clickNext(page);

  // Step 2: Resources
  if (config.cpuCores && config.cpuCores !== 4) {
    const cpuInput = page.locator('input[type="number"]').first();
    await cpuInput.fill(String(config.cpuCores));
  }
  if (config.ramGb && config.ramGb !== 4) {
    const ramInput = page.locator('input[type="number"]').nth(1);
    await ramInput.fill(String(config.ramGb));
  }
  if (config.justification) {
    await page
      .getByPlaceholder("Please explain why you need more than the default resources")
      .fill(config.justification);
  }

  await clickNext(page);

  // Step 3: Firewall
  if (config.defaultPorts === false) {
    // Uncheck default ports checkbox
    await page.getByLabel("Enable Default Ports").uncheck();
  }
  if (config.additionalPorts) {
    for (const port of config.additionalPorts) {
      await page.getByRole("button", { name: /Add Port/i }).click();
      await page.waitForTimeout(200);
      // Fill the last port entry
      const portInputs = page.locator('input[type="number"]');
      await portInputs.last().fill(String(port.port));
      // Select protocol
      const protocolSelects = page.getByRole("combobox");
      await protocolSelects.last().click();
      await page.getByRole("option", { name: port.protocol }).click();
      // Fill reason
      const reasonInputs = page.getByPlaceholder("Why is this port needed?");
      await reasonInputs.last().fill(port.reason);
      // Public access
      if (port.publicAccess) {
        const publicCheckboxes = page.getByLabel("Publicly accessible");
        await publicCheckboxes.last().check();
        await page.waitForTimeout(200);
        const justificationInputs = page.getByPlaceholder(
          "Why does this port need to be publicly accessible?",
        );
        await justificationInputs.last().fill(port.publicJustification!);
      }
    }
  }

  await clickNext(page);

  // Step 4: Users
  if (config.additionalUsers) {
    for (const username of config.additionalUsers) {
      await page.getByRole("button", { name: /Add User/i }).click();
      await page.waitForTimeout(200);
      const usernameInputs = page.getByPlaceholder("Enter username");
      await usernameInputs.last().fill(username);
    }
  }

  await clickNext(page);

  // Step 5: SSH Key
  if (config.sshKeyType === "new") {
    await fillNewSSHKey(page);
  } else {
    await selectExistingSSHKey(page);
  }

  await clickNext(page);

  // Step 6: Review
  if (config.additionalComments) {
    await page
      .getByPlaceholder("Any additional information or special requirements")
      .fill(config.additionalComments);
  }

  await clickSubmit(page);
  await waitForSuccess(page);
}

// ── VM Access Request form filler ─────────────────────────────────────────

export async function fillVMAccessForm(
  page: Page,
  config: VMAccessTestConfig,
): Promise<void> {
  await navigateFromHome(page, "Request VM Access");

  // Step 1: Access Details
  await page.getByPlaceholder("vm-hostname").fill(config.hostname);
  await page
    .getByPlaceholder("Please explain why you need access to this VM")
    .fill(config.justification);
  if (config.contactPerson) {
    await page
      .getByPlaceholder("Name of person who can confirm your request")
      .fill(config.contactPerson);
  }

  await clickNext(page);

  // Step 2: SSH Key
  if (config.sshKeyType === "new") {
    await fillNewSSHKey(page);
  } else {
    await selectExistingSSHKey(page);
  }

  await clickNext(page);

  // Step 3: Review
  await clickSubmit(page);
  await waitForSuccess(page);
}

// ── Artemis Developer Request form filler ─────────────────────────────────

export async function fillArtemisForm(
  page: Page,
  config: ArtemisTestConfig,
): Promise<void> {
  await navigateFromHome(page, "Artemis Developer Access");

  // Auth choice (anonymous only): click "Continue without sign in"
  if (!config.isAuthenticated) {
    await page.getByRole("button", { name: "Continue without sign in" }).click();
    await page.waitForTimeout(300);
  }

  // Step 1 (anonymous only): Personal Info
  if (!config.isAuthenticated) {
    await page.getByPlaceholder("Your full name").fill(config.name!);
    await page.getByPlaceholder("your.email@example.com").first().fill(config.mainEmail!);
    await clickNext(page);
  }

  // GitHub step
  await page.getByPlaceholder("your-github-username").fill(config.githubUsername);
  await page.getByRole("button", { name: "Verify" }).click();
  // Wait for GitHub verification result (profile card appears on success)
  await page.getByText("Test GitHub User").waitFor({ timeout: 10000 });
  // Check the profile acknowledgment checkbox
  await page.getByRole("checkbox").check();

  await clickNext(page);

  // Contact step
  // The "your.email@example.com" placeholder appears for both slack email and (in anon) main email
  // Slack email is specifically labeled
  await page.getByPlaceholder("your.email@example.com").last().fill(config.slackEmail);
  await page.getByPlaceholder("Name of your main contact").fill(config.contactPerson);
  await page.getByPlaceholder("Your thesis or project advisor").fill(config.advisor);

  // Select subteams (checkboxes)
  for (const subteam of config.subteams) {
    const label = subteam === "lti" ? "LTI" : subteam === "mobile-apps" ? "Mobile Apps" : subteam.charAt(0).toUpperCase() + subteam.slice(1);
    await page.getByLabel(label, { exact: true }).check();
  }

  if (config.otherSubteam) {
    await page.getByPlaceholder("Enter subteam name").fill(config.otherSubteam);
  }

  if (config.additionalComments) {
    await page.getByPlaceholder("Any additional information").fill(config.additionalComments);
  }

  await clickNext(page);

  // Review step
  await clickSubmit(page);
  await waitForSuccess(page);
}

// ── TUM Guest Request form filler ─────────────────────────────────────────

export async function fillTUMGuestForm(
  page: Page,
  config: TUMGuestTestConfig,
): Promise<void> {
  await navigateFromHome(page, "TUM Guest Account");

  // Step 1 (anonymous only): Request Type
  if (!config.isAuthenticated) {
    if (config.requestingForSelf) {
      // Click "For myself" radio card
      await page.getByText("For myself", { exact: true }).click();
    } else {
      await page.getByText("For someone else", { exact: true }).click();
    }
    await clickNext(page);
  }

  // Guest Info step
  await page.getByRole("textbox", { name: "First Name" }).fill(config.firstName);
  await page.getByRole("textbox", { name: "Last Name" }).fill(config.lastName);
  await page.getByRole("textbox", { name: "External Email" }).fill(config.email);

  // Date of birth - use the date picker
  await fillDatePicker(page, config.birthDate);

  // Gender (Select dropdown)
  const genderLabel =
    config.gender === "male" ? "Male" : config.gender === "female" ? "Female" : "Diverse";
  await selectShadcnOption(page, "Gender", genderLabel);

  // Nationality (Select dropdown)
  const nationalityLabel = config.nationality === "other"
    ? "Other"
    : config.nationality.charAt(0).toUpperCase() + config.nationality.slice(1);
  await selectShadcnOption(page, "Nationality", nationalityLabel);

  if (config.nationality === "other" && config.nationalityOther) {
    await page.getByPlaceholder("Enter nationality").fill(config.nationalityOther);
  }

  if (!config.isAuthenticated && config.contactPerson) {
    await page.getByPlaceholder("Name of your TUM contact").fill(config.contactPerson);
  }

  await clickNext(page);

  // Guest Type step
  const guestTypeLabel =
    config.guestType === "ipraktikum-customer"
      ? "iPraktikum Customer"
      : config.guestType === "artemis"
        ? "Artemis"
        : "Other";
  await page.getByText(guestTypeLabel, { exact: true }).click();
  await page.waitForTimeout(300);

  if (config.guestType === "ipraktikum-customer") {
    await page.getByPlaceholder("e.g., Team Alpha").fill(config.teamName!);
    await page.getByPlaceholder("Name of coach or PL").fill(config.coachName!);
  } else if (config.guestType === "artemis") {
    await page
      .getByPlaceholder("e.g., Stanford University or Acme Corp")
      .fill(config.universityOrCompany!);
  } else if (config.guestType === "other") {
    await page
      .getByPlaceholder("Please explain why a TUM guest account is needed")
      .fill(config.otherReason!);
  }

  if (config.additionalComments) {
    await page.getByPlaceholder("Any additional information").fill(config.additionalComments);
  }

  await clickNext(page);

  // Review step
  await clickSubmit(page);
  await waitForSuccess(page);
}

// ── Support Request form filler ───────────────────────────────────────────

export async function fillSupportForm(
  page: Page,
  config: SupportTestConfig,
): Promise<void> {
  await navigateFromHome(page, "Support Request");

  // Auth choice (anonymous only): click "Continue without sign in"
  if (!config.isAuthenticated) {
    await page.getByRole("button", { name: "Continue without sign in" }).click();
    await page.waitForTimeout(300);
  }

  // Anonymous identity fields
  if (!config.isAuthenticated) {
    await page.getByPlaceholder("Your full name").fill(config.fullName!);
    await page.getByPlaceholder("your.email@example.com").fill(config.email!);
    if (config.tumId) {
      await page.getByPlaceholder("e.g., ab12cde").fill(config.tumId);
    }
  }

  // Support details
  await page.getByPlaceholder("Brief summary of your request").fill(config.subject);

  // Select category via radio card
  await selectRadioCard(page, `cat-${config.category}`);

  await page
    .getByPlaceholder("Please describe your issue or request in detail")
    .fill(config.description);

  await clickSubmit(page);
  await waitForSuccess(page);
}
