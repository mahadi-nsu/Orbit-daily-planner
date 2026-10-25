'use client';
import { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import {
  EditorContent,
  useEditor,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
  type JSONContent,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  ImagePlus,
  Link2,
  Table2,
  Undo2,
  Redo2,
  Copy,
  Check,
  ChevronDown,
  BookOpen,
  Pencil,
} from 'lucide-react';
import { db, uid, repository } from '@/lib/db';
import { safeUrl } from '@/lib/models';
import { report } from '@/lib/store';
import { IconButton, Modal, Field, Button } from '@/components/ui';
const lowlight = createLowlight(common);
const ReadModeContext = createContext(false);

function hasSavedContent(content: JSONContent): boolean {
  return (
    Boolean(content.text?.trim()) ||
    ['image', 'horizontalRule', 'table'].includes(content.type || '') ||
    Boolean(content.content?.some(hasSavedContent))
  );
}
function LocalImage({ node, updateAttributes, selected }: NodeViewProps) {
  const readOnly = useContext(ReadModeContext);
  const [src, setSrc] = useState('');
  useEffect(() => {
    let url = '';
    let active = true;
    void db.images.get(String(node.attrs.src).slice(12)).then((asset) => {
      if (asset && active) {
        url = URL.createObjectURL(asset.blob);
        setSrc(url);
      }
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [node.attrs.src]);
  return (
    <NodeViewWrapper
      as="figure"
      className={`editor-image ${selected ? 'selected' : ''}`}
      style={{ width: `${node.attrs.width || 100}%` }}
    >
      {src ? (
        <img src={src} alt={node.attrs.alt || 'Learning note image'} />
      ) : (
        <div className="image-loading">Loading local image…</div>
      )}
      {readOnly ? (
        node.attrs.caption ? (
          <figcaption>{node.attrs.caption}</figcaption>
        ) : null
      ) : (
        <figcaption contentEditable={false}>
          <input
            aria-label="Image caption"
            placeholder="Add a caption…"
            value={node.attrs.caption || ''}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
          />
        </figcaption>
      )}
      {!readOnly && selected && (
        <label className="image-resize" contentEditable={false}>
          Width{' '}
          <input
            aria-label="Image width"
            type="range"
            min="20"
            max="100"
            value={node.attrs.width || 100}
            onChange={(e) => updateAttributes({ width: Number(e.target.value) })}
          />
        </label>
      )}
    </NodeViewWrapper>
  );
}
const AssetImage = Image.extend({
  parseHTML() {
    return [{ tag: 'img[data-orbit-asset^="orbit-image:"]' }];
  },
  addInputRules() {
    return [];
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-orbit-asset'),
        renderHTML: (attributes) => ({ 'data-orbit-asset': attributes.src }),
      },
      caption: { default: '' },
      width: { default: 100 },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(LocalImage);
  },
}).configure({ allowBase64: false });
function CodeBlock({ node, updateAttributes }: NodeViewProps) {
  const readOnly = useContext(ReadModeContext);
  const [copied, setCopied] = useState(false);
  return (
    <NodeViewWrapper className="code-block">
      <div contentEditable={false} className="code-header">
        {readOnly ? (
          <span className="code-language">{node.attrs.language || 'plaintext'}</span>
        ) : (
          <select
            aria-label="Code language"
            value={node.attrs.language || 'plaintext'}
            onChange={(e) => updateAttributes({ language: e.target.value })}
          >
            {[
              'plaintext',
              'javascript',
              'typescript',
              'python',
              'css',
              'html',
              'json',
              'bash',
              'sql',
              'rust',
              'go',
              'java',
            ].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(node.textContent)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
              .catch(report);
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <pre>
        <NodeViewContent as="div" className={`language-${node.attrs.language || 'plaintext'}`} />
      </pre>
    </NodeViewWrapper>
  );
}
export function LearningEditor({
  topicId,
  initialContent,
}: {
  topicId: string;
  initialContent: JSONContent;
}) {
  const [saved, setSaved] = useState('Saved locally'),
    [linkOpen, setLinkOpen] = useState(false),
    [link, setLink] = useState(''),
    [readOnly, setReadOnly] = useState(() => hasSavedContent(initialContent));
  const file = useRef<HTMLInputElement>(null),
    pending = useRef<{ content: JSONContent; text: string } | null>(null),
    timeout = useRef<ReturnType<typeof setTimeout> | null>(null),
    inFlight = useRef(0);
  const flush = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    const value = pending.current;
    if (!value) return;
    pending.current = null;
    setSaved('Saving…');
    inFlight.current += 1;
    void repository
      .saveDocument(topicId, value.content, value.text)
      .catch((error) => {
        pending.current ??= value;
        setSaved('Save failed — retry');
        report(error);
      })
      .finally(() => {
        inFlight.current -= 1;
        if (!inFlight.current && !pending.current) setSaved('Saved locally');
      });
  }, [topicId]);
  const insertImages = useRef<(files: File[], position?: number) => Promise<void>>(async () => {});
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          protocols: ['http', 'https'],
          isAllowedUri: (url) => {
            try {
              safeUrl(url);
              return true;
            } catch {
              return false;
            }
          },
        },
      }),
      AssetImage,
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlock);
        },
      }).configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: true } }),
      Placeholder.configure({ placeholder: 'Capture an idea. Connect the dots. Make it yours…' }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'learning-prose',
        role: readOnly ? 'document' : 'textbox',
        'aria-label': readOnly ? 'Saved learning notes' : 'Learning notes',
        ...(readOnly ? {} : { 'aria-multiline': 'true' }),
      },
      handlePaste: (_view, event) => {
        if (readOnly) return false;
        const files = Array.from(event.clipboardData?.files || []).filter((f) =>
          f.type.startsWith('image/'),
        );
        if (files.length) {
          event.preventDefault();
          void insertImages.current(files).catch(report);
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        if (readOnly) return false;
        const files = Array.from(event.dataTransfer?.files || []).filter((f) =>
          f.type.startsWith('image/'),
        );
        if (files.length) {
          event.preventDefault();
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          void insertImages.current(files, pos).catch(report);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      pending.current = { content: editor.getJSON(), text: editor.getText() };
      setSaved('Unsaved changes');
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(flush, 600);
    },
  });
  useEffect(() => {
    editor?.setEditable(!readOnly, false);
  }, [editor, readOnly]);
  insertImages.current = async (files, position) => {
    if (!editor) return;
    for (const f of files) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(f.type))
        throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
      if (f.size > 20 * 1024 * 1024) throw new Error('Images must be smaller than 20 MB.');
      const id = uid();
      await db.images.add({ id, topicId, blob: f, name: f.name });
      const chain = editor.chain().focus();
      if (position !== undefined) chain.setTextSelection(position);
      chain
        .insertContent([
          { type: 'image', attrs: { src: `orbit-image:${id}`, alt: f.name } },
          { type: 'paragraph' },
        ])
        .run();
    }
  };
  useEffect(() => {
    const visibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('orbit:flush', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      flush();
      window.removeEventListener('orbit:flush', flush);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [flush]);
  if (!editor) return <div className="editor-loading">Opening your notes…</div>;
  const tools = [
    {
      label: 'Bold',
      icon: Bold,
      active: editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      active: editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline',
      icon: Underline,
      active: editor.isActive('underline'),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Inline code',
      icon: Code,
      active: editor.isActive('code'),
      run: () => editor.chain().focus().toggleCode().run(),
    },
    {
      label: 'Bullet list',
      icon: List,
      active: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      active: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Checklist',
      icon: ListTodo,
      active: editor.isActive('taskList'),
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: 'Quote',
      icon: Quote,
      active: editor.isActive('blockquote'),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    { label: 'Divider', icon: Minus, run: () => editor.chain().focus().setHorizontalRule().run() },
  ];
  return (
    <ReadModeContext.Provider value={readOnly}>
      <div className={`editor-container ${readOnly ? 'reading-mode' : 'writing-mode'}`}>
        <header className="document-mode-bar">
          <span className="document-mode-caption">
            {readOnly ? <BookOpen size={16} /> : <Pencil size={15} />}{' '}
            {readOnly ? 'A little space to read.' : 'Make your next discovery.'}
          </span>
          <div className="document-mode-switch" role="group" aria-label="Notes mode">
            <button
              type="button"
              aria-pressed={readOnly}
              onClick={() => {
                flush();
                setReadOnly(true);
              }}
            >
              <BookOpen size={15} />
              Read
            </button>
            <button type="button" aria-pressed={!readOnly} onClick={() => setReadOnly(false)}>
              <Pencil size={14} />
              Edit
            </button>
          </div>
        </header>
        {!readOnly && (
          <div className="editor-toolbar">
            <div className="heading-select">
              <select
                aria-label="Text style"
                value={
                  editor.isActive('heading', { level: 1 })
                    ? '1'
                    : editor.isActive('heading', { level: 2 })
                      ? '2'
                      : editor.isActive('heading', { level: 3 })
                        ? '3'
                        : '0'
                }
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!n) editor.chain().focus().setParagraph().run();
                  else
                    editor
                      .chain()
                      .focus()
                      .toggleHeading({ level: n as 1 | 2 | 3 })
                      .run();
                }}
              >
                <option value="0">Normal text</option>
                <option value="1">Heading 1</option>
                <option value="2">Heading 2</option>
                <option value="3">Heading 3</option>
              </select>
              <ChevronDown size={12} />
            </div>
            <span className="tool-separator" />
            {tools.map((t) => (
              <IconButton
                key={t.label}
                label={t.label}
                className={t.active ? 'active' : ''}
                onClick={t.run}
              >
                <t.icon size={15} />
              </IconButton>
            ))}
            <span className="tool-separator" />
            <IconButton
              label="Add link"
              onClick={() => {
                setLink(editor.getAttributes('link').href || '');
                setLinkOpen(true);
              }}
            >
              <Link2 size={15} />
            </IconButton>
            <IconButton
              label="Insert code block"
              onClick={() =>
                editor.chain().focus().toggleCodeBlock({ language: 'javascript' }).run()
              }
            >
              <span className="code-icon">{'{ }'}</span>
            </IconButton>
            <IconButton label="Insert image" onClick={() => file.current?.click()}>
              <ImagePlus size={15} />
            </IconButton>
            <IconButton
              label="Insert table"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            >
              <Table2 size={15} />
            </IconButton>
            <div className="toolbar-spacer" />
            <IconButton
              label="Undo"
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo2 size={15} />
            </IconButton>
            <IconButton
              label="Redo"
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo2 size={15} />
            </IconButton>
          </div>
        )}
        {!readOnly && editor.isActive('link') && (
          <div className="table-controls">
            <a href={editor.getAttributes('link').href} target="_blank" rel="noopener noreferrer">
              Open selected link ↗
            </a>
            <button
              type="button"
              onClick={() => {
                setLink(editor.getAttributes('link').href || '');
                setLinkOpen(true);
              }}
            >
              Edit link
            </button>
            <button type="button" onClick={() => editor.chain().focus().unsetLink().run()}>
              Remove link
            </button>
          </div>
        )}
        {!readOnly && editor.isActive('table') && (
          <div className="table-controls">
            <button onClick={() => editor.chain().focus().addRowAfter().run()}>+ Row</button>
            <button onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Column</button>
            <button onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</button>
            <button onClick={() => editor.chain().focus().deleteColumn().run()}>
              Delete column
            </button>
            <button onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</button>
          </div>
        )}
        <EditorContent editor={editor} />
        <footer className="editor-footer">
          <span>
            {editor.getText().trim().split(/\s+/).filter(Boolean).length} words{' '}
            <span className="dot-separator">·</span>{' '}
            {readOnly
              ? `${Math.max(1, Math.ceil(editor.getText().trim().split(/\s+/).filter(Boolean).length / 200))} min read`
              : 'Markdown shortcuts supported'}
          </span>
          {!readOnly && (
            <button
              type="button"
              className="save-indicator"
              onClick={flush}
              title="Save pending notes"
            >
              <span className={saved === 'Saved locally' ? 'saved-dot' : 'saving-dot'} />
              {saved}
            </button>
          )}
        </footer>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          ref={file}
          hidden
          multiple
          onChange={(e) => {
            void insertImages.current(Array.from(e.target.files || [])).catch(report);
            e.target.value = '';
          }}
        />
        {!readOnly && linkOpen && (
          <Modal title="Insert a link" onClose={() => setLinkOpen(false)}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const href = safeUrl(link);
                  const selection = editor.state.selection;
                  // Code blocks cannot contain link marks. Keep their code intact
                  // and place the requested link in a following paragraph.
                  if (editor.isActive('codeBlock'))
                    editor
                      .chain()
                      .focus()
                      .insertContentAt(selection.$from.after(), {
                        type: 'paragraph',
                        content: [
                          { type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] },
                        ],
                      })
                      .run();
                  else if (selection.empty)
                    editor
                      .chain()
                      .focus()
                      .insertContent({
                        type: 'text',
                        text: href,
                        marks: [{ type: 'link', attrs: { href } }],
                      })
                      .run();
                  else editor.chain().focus().setLink({ href }).run();
                  setLinkOpen(false);
                } catch (error) {
                  report(error);
                }
              }}
            >
              <Field label="URL">
                <input
                  autoFocus
                  type="url"
                  required
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <div className="form-actions">
                <Button
                  secondary
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setLinkOpen(false);
                  }}
                >
                  Remove link
                </Button>
                <Button type="submit">Insert link</Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </ReadModeContext.Provider>
  );
}
