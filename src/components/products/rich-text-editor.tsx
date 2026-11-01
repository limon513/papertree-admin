import type { ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table,
  Underline,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Product description editor. Sends HTML; the API cleans it before saving. */
export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write about the product…' }),
    ],
    content: value,
    editorProps: { attributes: { id, class: 'rich-text min-h-48 px-3.5 py-3 focus:outline-none' } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-xs focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-100">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      table: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  const setLink = () => {
    const current = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link address (leave empty to remove the link)', current ?? 'https://');
    if (url === null) return;
    if (url.trim() === '' || url.trim() === 'https://') chain().extendMarkRange('link').unsetLink().run();
    else chain().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 px-1.5 py-1">
      <Tool label="Heading" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </Tool>
      <Tool label="Small heading" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </Tool>
      <Divider />
      <Tool label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </Tool>
      <Tool label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic />
      </Tool>
      <Tool label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline />
      </Tool>
      <Tool label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough />
      </Tool>
      <Divider />
      <Tool label="Bullet list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List />
      </Tool>
      <Tool label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered />
      </Tool>
      <Tool label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote />
      </Tool>
      <Tool label="Link" active={state.link} onClick={setLink}>
        <Link2 />
      </Tool>
      <Tool
        label={state.table ? 'Delete table' : 'Insert table'}
        active={state.table}
        onClick={() =>
          state.table ? chain().deleteTable().run() : chain().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()
        }
      >
        <Table />
      </Tool>
      <Tool label="Divider line" onClick={() => chain().setHorizontalRule().run()}>
        <Minus />
      </Tool>
      {state.table && (
        <>
          <Divider />
          <TextTool onClick={() => chain().addRowAfter().run()}>+ Row</TextTool>
          <TextTool onClick={() => chain().deleteRow().run()}>− Row</TextTool>
          <TextTool onClick={() => chain().addColumnAfter().run()}>+ Col</TextTool>
          <TextTool onClick={() => chain().deleteColumn().run()}>− Col</TextTool>
        </>
      )}
      <span className="ml-auto flex">
        <Tool label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
          <Undo2 />
        </Tool>
        <Tool label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
          <Redo2 />
        </Tool>
      </span>
    </div>
  );
}

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex size-8 cursor-pointer items-center justify-center rounded-md text-zinc-600 transition-colors [&_svg]:size-4',
        'hover:bg-zinc-200/70 hover:text-zinc-900 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent',
        active && 'bg-brand-100 text-brand-800 hover:bg-brand-100',
      )}
    >
      {children}
    </button>
  );
}

function TextTool({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-8 cursor-pointer rounded-md px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-zinc-300" />;
