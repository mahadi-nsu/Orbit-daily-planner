import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64',
);
async function navigate(page: Page, name: string) {
  await expect(page.locator('.app-shell')).toBeVisible();
  const open = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await open.isVisible()) await open.click();
  await page.getByRole('button', { name, exact: true }).click();
}
async function createTopic(page: Page, title: string) {
  await page.getByLabel('Topic name', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Create topic', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Learning notes' })).toBeVisible();
}
test('complete local learning workflow with portable image backup', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My day.', exact: true })).toBeVisible();
  await navigate(page, 'Learning library');
  await page.getByRole('button', { name: 'New category', exact: true }).click();
  await page.getByLabel('Category name', { exact: true }).fill('Web security');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create category', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add topic to Web security', exact: true }).click();
  await createTopic(page, 'Security foundations');
  const parentUrl = page.url();
  const notes = page.getByRole('textbox', { name: 'Learning notes' });
  await notes.fill('Parent security notes: revision material and browser boundaries.');
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create subtopic', exact: true }).click();
  await createTopic(page, 'Stored XSS');
  const childUrl = page.url();
  await page
    .getByRole('textbox', { name: 'Learning notes' })
    .fill('Unique discovery: output encoding prevents script injection.');
  await page.getByRole('textbox', { name: 'Learning notes' }).press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Insert code block', exact: true }).click();
  await page.keyboard.type('const safe = encodeURIComponent(input);');
  await expect(page.getByLabel('Code language')).toBeVisible();
  await page.getByLabel('Code language').selectOption('typescript');
  await page.getByRole('button', { name: 'Copy code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Learning notes' }).press('ControlOrMeta+End');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.type('Use context-aware encoding for every output boundary.');
  await page.keyboard.press('Enter');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'learning-pixel.png', mimeType: 'image/png', buffer: pixel });
  await expect(page.locator('.editor-image img')).toBeVisible();
  await page.getByLabel('Image caption').fill('Learning diagram');
  await page.getByRole('button', { name: 'Add resource', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('XSS tutorial');
  await page.getByLabel('URL', { exact: true }).fill('https://www.youtube.com/watch?v=orbit-test');
  await page.getByLabel('Resume position (seconds)', { exact: true }).fill('125');
  await page.getByLabel('Progress', { exact: true }).selectOption('learning');
  await page.getByRole('button', { name: 'Save resource', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Resume', exact: true })).toHaveAttribute(
    'href',
    /t=125/,
  );
  await page.getByLabel('Topic status').selectOption('learning');
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('document', { name: 'Saved learning notes' })).toContainText(
    'output encoding',
  );
  await expect(page.locator('.editor-image img')).toBeVisible();
  await expect(page.locator('.editor-image figcaption')).toHaveText('Learning diagram');
  await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', /t=125/);
  await page.goto(parentUrl);
  await expect(page.getByRole('document', { name: 'Saved learning notes' })).toContainText(
    'Parent security notes',
  );
  await expect(page.getByRole('document', { name: 'Saved learning notes' })).not.toContainText(
    'output encoding',
  );
  await page.getByRole('button', { name: 'Stored XSS', exact: true }).last().click();
  await expect(page).toHaveURL(childUrl);
  await navigate(page, 'Routine planner');
  await page.getByRole('button', { name: 'New routine', exact: true }).click();
  await page.getByLabel('Routine name').fill('Seven days of security');
  await page.getByRole('button', { name: 'Create routine', exact: true }).click();
  await expect(page.locator('.routine-selector')).toContainText('7 days');
  await page.getByRole('button', { name: 'Add learning target', exact: true }).click();
  await page.getByLabel('Learning area', { exact: true }).selectOption({ label: 'Web security' });
  await page.getByLabel('Target hours', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Add target', exact: true }).click();
  const securityTarget = page.getByRole('region', { name: 'Web security target', exact: true });
  await securityTarget
    .getByLabel('Choose library topic for Web security')
    .selectOption({ label: 'Stored XSS' });
  await securityTarget.getByRole('button', { name: 'Add topic', exact: true }).click();
  await page.getByRole('button', { name: 'Open notes: Stored XSS', exact: true }).click();
  await expect(page).toHaveURL(childUrl);
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start focus', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await page.getByRole('button', { name: 'Resume timer' }).click();
  await page.getByRole('button', { name: 'Finish focus session' }).click();
  await page.getByLabel('Session note (optional)').fill('Understood safe output encoding.');
  await page.getByRole('button', { name: 'Save focus session', exact: true }).click();
  await expect(page.getByText('Understood safe output encoding.', { exact: true })).toBeVisible();
  await navigate(page, 'Routine planner');
  await page.getByRole('button', { name: 'Routine options' }).click();
  await page.getByRole('button', { name: 'Edit routine', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Duration', exact: true }).fill('14');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(page.locator('.routine-selector')).toContainText('14 days');
  await expect(page.locator('.routine-study-list')).toContainText('Stored XSS');
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search workspace' }).fill('output encoding');
  await page.getByRole('listbox', { name: 'Search results' }).getByRole('option').click();
  await expect(page).toHaveURL(childUrl);
  await navigate(page, 'Workspace settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.locator('input[type=file]').setInputFiles(path!);
  await page.getByLabel('Import behavior').selectOption('replace');
  await page.getByLabel('Type REPLACE to confirm').fill('REPLACE');
  await page.getByRole('button', { name: 'Restore workspace', exact: true }).click();
  await expect(page.getByText('Your workspace has been restored.', { exact: true })).toBeVisible();
  await page.goto(childUrl);
  await expect(page.getByRole('document', { name: 'Saved learning notes' })).toContainText(
    'output encoding',
  );
  await expect(page.locator('.editor-image img')).toBeVisible();
  await expect(page.locator('.editor-image figcaption')).toHaveText('Learning diagram');
  await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', /t=125/);
  await expect(page.getByText('Understood safe output encoding.', { exact: true })).toBeVisible();
  await navigate(page, 'Routine planner');
  await expect(page.locator('.routine-selector')).toContainText('14 days');
  await expect(page.locator('.routine-study-list')).toContainText('Stored XSS');
  expect(errors).toEqual([]);
});
test('navigation and the library work with reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/library');
  await expect(
    page.getByRole('heading', { name: 'Your knowledge, connected.', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Learning overview', exact: true })).toHaveCount(0);
  await navigate(page, 'My day');
  await expect(page.getByRole('heading', { name: 'My day.', exact: true })).toBeVisible();
  await expect(page.locator('.main-content')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: `test-results/orbit-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the removed learning overview route no longer renders a workspace page', async ({ page }) => {
  const response = await page.goto('/overview');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
});

test('reading protects fresh notes, displays rich content, and keeps both themes across reloads', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.app-main')).toHaveCSS('background-color', 'rgb(247, 248, 250)');
  await navigate(page, 'Learning library');
  await page.getByRole('button', { name: 'New topic', exact: true }).click();
  await createTopic(page, 'Reading with room to think');
  const notes = page.getByRole('textbox', { name: 'Learning notes' });
  await notes.fill('Reading should feel calm. Save this fresh thought before switching modes.');
  await notes.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Insert code block', exact: true }).click();
  await page.keyboard.type('const learning = "a little further";');
  await notes.press('ControlOrMeta+End');
  await page.keyboard.press('ArrowDown');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'reading-image.png', mimeType: 'image/png', buffer: pixel });
  await page.getByLabel('Image caption').fill('A saved learning image');
  await page.locator('.editor-image img').click();
  await page.getByLabel('Image width').press('Home');
  await notes.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add link', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('URL', { exact: true })
    .fill('https://example.com/learning');
  await page.getByRole('button', { name: 'Insert link', exact: true }).click();
  // Switch immediately, before the debounce: the same document must stay visible and save.
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  const reader = page.getByRole('document', { name: 'Saved learning notes' });
  await expect(reader).toContainText('Save this fresh thought');
  await expect(reader).toHaveAttribute('contenteditable', 'false');
  await expect(page.locator('.editor-toolbar')).toHaveCount(0);
  await expect(page.getByLabel('Image caption')).toHaveCount(0);
  await expect(page.getByLabel('Code language')).toHaveCount(0);
  await expect(reader.locator('figcaption')).toHaveText('A saved learning image');
  await expect(reader.locator('img')).toBeVisible();
  await expect(reader.getByRole('link')).toHaveAttribute('href', 'https://example.com/learning');
  await page.getByRole('button', { name: 'Copy code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  expect(
    await reader.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(18);
  const savedBlocks = reader.locator('p, .code-block pre, figcaption');
  const original = await savedBlocks.allTextContents();
  await reader.click();
  await page.keyboard.type('Should not change the saved notes');
  expect(await savedBlocks.allTextContents()).toEqual(original);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/orbit-reading-light-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByRole('document', { name: 'Saved learning notes' })).toContainText(
    'Save this fresh thought',
  );
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.app-main')).toHaveCSS('background-color', 'rgb(17, 18, 20)');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Learning notes' })).toHaveAttribute(
    'contenteditable',
    'true',
  );
  await expect(page.getByLabel('Image caption')).toHaveValue('A saved learning image');
  await expect(page.getByLabel('Code language')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('document', { name: 'Saved learning notes' })).toContainText(
    'Reading should feel calm.',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
