import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Empty } from '@/components/ui';
import { SearchPalette } from '@/features/workspace/search-palette';
import type { Workspace } from '@/lib/models';
describe('accessible UI', () => {
  it('exposes a usable empty state action', () => {
    const create = vi.fn();
    render(
      <Empty
        title="Start your library"
        description="Make room for a topic."
        action={<Button onClick={create}>Create topic</Button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create topic' }));
    expect(create).toHaveBeenCalledOnce();
  });
  it('finds a topic using saved document text and opens the result', () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
    const open = vi.fn(),
      data: Workspace = {
        tasks: [],
        categories: [{ id: 'cat', title: 'Frontend', color: '#a897f9', order: 0, archived: false }],
        topics: [
          {
            id: 'topic',
            categoryId: 'cat',
            parentTopicId: null,
            title: 'React rendering',
            status: 'learning',
            order: 0,
            archived: false,
            createdAt: 0,
            updatedAt: 0,
            openedAt: 0,
          },
        ],
        documents: [
          {
            id: 'topic',
            text: 'Reconciliation connects the virtual tree.',
            content: { type: 'doc' },
            updatedAt: 0,
          },
        ],
        resources: [],
        routines: [],
        scheduled: [],
        studies: [],
      };
    render(<SearchPalette data={data} onClose={vi.fn()} onNavigate={vi.fn()} onOpen={open} />);
    fireEvent.change(screen.getByLabelText('Search workspace'), {
      target: { value: 'reconciliation' },
    });
    fireEvent.click(screen.getByRole('option'));
    expect(open).toHaveBeenCalledWith('topic');
  });
});
