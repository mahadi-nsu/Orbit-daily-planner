import { test, expect } from './fixtures';

test('creates and selects missing categories and parents without losing the topic draft', async ({
  page,
}, testInfo) => {
  await page.goto('/library');
  await page.getByRole('button', { name: 'New topic', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Create a topic', exact: true });
  await form.getByLabel('Topic name', { exact: true }).fill('Caching strategies');
  await form.getByRole('button', { name: 'New category', exact: true }).click();
  await form.getByLabel('New category name', { exact: true }).fill('System design');
  await expect(form.getByRole('button', { name: 'Create topic', exact: true })).toBeDisabled();
  await page.screenshot({
    path: `test-results/orbit-inline-category-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await form.getByRole('button', { name: 'Add category', exact: true }).click();
  await expect(form.getByLabel('Category', { exact: true }).locator('option:checked')).toHaveText(
    'System design',
  );
  await expect(form.getByLabel('Topic name', { exact: true })).toHaveValue('Caching strategies');
  await form.getByRole('button', { name: 'New parent topic', exact: true }).click();
  await form.getByLabel('New parent topic name', { exact: true }).fill('Distributed systems');
  await page.screenshot({
    path: `test-results/orbit-inline-parent-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await form.getByRole('button', { name: 'Add parent topic', exact: true }).click();
  await expect(
    form.getByLabel('Parent topic', { exact: true }).locator('option:checked'),
  ).toHaveText('Distributed systems');
  // A parent cannot carry across to an unrelated category.
  await form.getByLabel('Category', { exact: true }).selectOption({ label: 'Backend' });
  await expect(form.getByLabel('Parent topic', { exact: true })).toHaveValue('');
  await expect(
    form
      .getByLabel('Parent topic', { exact: true })
      .getByRole('option', { name: 'Distributed systems', exact: true }),
  ).toHaveCount(0);
  await form.getByLabel('Category', { exact: true }).selectOption({ label: 'System design' });
  await form
    .getByLabel('Parent topic', { exact: true })
    .selectOption({ label: 'Distributed systems' });
  await form.getByRole('button', { name: 'Create topic', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Caching strategies', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Learning notes', exact: true })
    .fill('Cache invalidation notes belong only to the child.');
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('document', { name: 'Saved learning notes' })).toContainText(
    'Cache invalidation notes',
  );
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: 'Learning library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your knowledge, connected.', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Toggle Distributed systems subtopics', exact: true })
    .click();
  await expect(
    page.locator('.library-topic-name').filter({ hasText: 'Caching strategies' }),
  ).toBeVisible();
  await page.locator('.library-topic-name').filter({ hasText: 'Distributed systems' }).click();
  await expect(
    page.getByRole('heading', { name: 'Distributed systems', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Learning notes' })).not.toContainText(
    'Cache invalidation notes',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('cancels inline creation and selects existing matches without duplicate categories or parents', async ({
  page,
}) => {
  await page.goto('/library');
  await page.getByRole('button', { name: 'New topic', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Create a topic', exact: true });
  await form.getByLabel('Topic name', { exact: true }).fill('Keep my draft');
  await form.getByRole('button', { name: 'New category', exact: true }).click();
  await form.getByLabel('New category name', { exact: true }).fill('Do not create this');
  await form.getByRole('button', { name: 'Cancel category', exact: true }).click();
  await expect(
    form
      .getByLabel('Category', { exact: true })
      .getByRole('option', { name: 'Do not create this', exact: true }),
  ).toHaveCount(0);
  await form.getByRole('button', { name: 'New category', exact: true }).click();
  await form.getByLabel('New category name', { exact: true }).fill('frontend');
  await form.getByRole('button', { name: 'Add category', exact: true }).click();
  await expect(
    form
      .getByLabel('Category', { exact: true })
      .getByRole('option', { name: 'Frontend', exact: true }),
  ).toHaveCount(1);
  await form.getByRole('button', { name: 'New parent topic', exact: true }).click();
  await form.getByLabel('New parent topic name', { exact: true }).fill('Foundations');
  await form.getByLabel('New parent topic name', { exact: true }).press('Enter');
  await expect(
    form.getByLabel('Parent topic', { exact: true }).locator('option:checked'),
  ).toHaveText('Foundations');
  await form.getByRole('button', { name: 'New parent topic', exact: true }).click();
  await form.getByLabel('New parent topic name', { exact: true }).fill('foundations');
  await form.getByRole('button', { name: 'Add parent topic', exact: true }).click();
  await expect(
    form
      .getByLabel('Parent topic', { exact: true })
      .getByRole('option', { name: 'Foundations', exact: true }),
  ).toHaveCount(1);
  await expect(form.getByLabel('Topic name', { exact: true })).toHaveValue('Keep my draft');
});
