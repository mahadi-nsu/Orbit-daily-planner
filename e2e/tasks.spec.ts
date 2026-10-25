import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
async function addTask(page: Page, title: string) {
  await page.getByRole('textbox', { name: 'New task', exact: true }).fill(title);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Edit task: ${title}`, exact: true }),
  ).toBeVisible();
}
async function navigate(page: Page, name: string) {
  await expect(page.locator('.app-shell')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name, exact: true }).click();
}

test('home manages tasks by date, optional details, statuses, completion, and backup', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My day.', exact: true })).toBeVisible();
  const date = page.getByLabel('Choose task date'),
    today = await date.inputValue();
  await page
    .getByRole('textbox', { name: 'New task', exact: true })
    .fill('Review the pull request');
  await page.getByRole('button', { name: 'Add task details', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'New task details' })
    .fill('Check the loading and empty states.');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(
    page
      .getByRole('button', { name: 'Edit task: Review the pull request', exact: true })
      .getByText('Check the loading and empty states.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Status for Review the pull request' })
    .selectOption('in-progress');
  await expect(
    page.getByRole('combobox', { name: 'Status for Review the pull request' }),
  ).toHaveValue('in-progress');
  await expect(
    page
      .getByRole('region', { name: 'In progress', exact: true })
      .getByRole('button', { name: 'Edit task: Review the pull request', exact: true }),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: 'Complete task: Review the pull request' }).check();
  await expect(
    page.getByRole('checkbox', { name: 'Reopen task: Review the pull request' }),
  ).toBeChecked();
  await expect(page.getByRole('region', { name: 'In progress', exact: true })).toHaveCount(0);
  await page
    .getByRole('group', { name: 'Filter tasks' })
    .getByRole('button', { name: /^Done/ })
    .click();
  await expect(
    page.getByRole('button', { name: 'Edit task: Review the pull request' }),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: 'Reopen task: Review the pull request' }).uncheck();
  await page
    .getByRole('group', { name: 'Filter tasks' })
    .getByRole('button', { name: /^All/ })
    .click();
  await addTask(page, 'Write down the next steps');
  await page.getByRole('button', { name: 'Edit task: Review the pull request' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Task', { exact: true })
    .fill('Review and merge the pull request');
  await page
    .getByRole('dialog')
    .getByLabel('Details (optional)')
    .fill('Check loading, empty, and error states.');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.getByRole('button', { name: 'Next day', exact: true }).click();
  const tomorrow = await date.inputValue();
  expect(tomorrow).not.toBe(today);
  await expect(
    page.getByRole('button', { name: 'Edit task: Write down the next steps' }),
  ).toHaveCount(0);
  await addTask(page, 'Prepare tomorrow’s agenda');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Edit task: Write down the next steps' }).click();
  await page.getByRole('dialog').getByLabel('Task date').fill(tomorrow);
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit task: Write down the next steps' }),
  ).toHaveCount(0);
  await page
    .getByRole('checkbox', { name: 'Complete task: Review and merge the pull request' })
    .check();
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: 'Reopen task: Review and merge the pull request' }),
  ).toBeChecked();
  await expect(
    page.getByText('Check loading, empty, and error states.', { exact: true }),
  ).toBeVisible();
  await date.fill(tomorrow);
  await expect(
    page.getByRole('button', { name: 'Edit task: Write down the next steps' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit task: Prepare tomorrow’s agenda' }),
  ).toBeVisible();
  // A confirmed deletion removes only that task.
  await page.getByRole('button', { name: 'Edit task: Prepare tomorrow’s agenda' }).click();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit task: Prepare tomorrow’s agenda' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Edit task: Write down the next steps' }),
  ).toBeVisible();
  await navigate(page, 'Workspace settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise,
    path = await download.path();
  expect(path).toBeTruthy();
  await page.locator('input[type=file]').setInputFiles(path!);
  await page.getByLabel('Import behavior').selectOption('replace');
  await page.getByLabel('Type REPLACE to confirm').fill('REPLACE');
  await page.getByRole('button', { name: 'Restore workspace', exact: true }).click();
  await expect(page.getByText('Your workspace has been restored.', { exact: true })).toBeVisible();
  await navigate(page, 'My day');
  await expect(
    page.getByRole('checkbox', { name: 'Reopen task: Review and merge the pull request' }),
  ).toBeChecked();
  await date.fill(tomorrow);
  await expect(
    page.getByRole('button', { name: 'Edit task: Write down the next steps' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await addTask(page, 'Draft the meeting notes');
  await page
    .getByRole('combobox', { name: 'Status for Draft the meeting notes' })
    .selectOption('in-progress');
  await addTask(page, 'Plan the next study session');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('.task-week button[aria-pressed=true]')).toContainText('3 tasks');
  await expect(page.locator('.toast.visible')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/orbit-tasks-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('earlier unfinished tasks remain discoverable without changing their original dates', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My day.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Previous day', exact: true }).click();
  const yesterday = await page.getByLabel('Choose task date').inputValue();
  await addTask(page, 'Follow up on yesterday’s draft');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: /Unfinished from earlier days/ }).click();
  await expect(
    page
      .getByRole('list', { name: 'Earlier unfinished tasks' })
      .getByRole('button', { name: 'Edit task: Follow up on yesterday’s draft' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit task: Follow up on yesterday’s draft' }).click();
  await expect(page.getByRole('dialog').getByLabel('Task date')).toHaveValue(yesterday);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Complete task: Follow up on yesterday’s draft' })
    .check();
  await expect(page.getByRole('button', { name: /Unfinished from earlier days/ })).toHaveCount(0);
});
