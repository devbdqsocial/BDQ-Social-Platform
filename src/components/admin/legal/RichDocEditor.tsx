"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Heading2, Pilcrow, List, ListOrdered, Link2, Link2Off, Undo2, Redo2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MERGE_TOKENS } from "@/lib/legal-tokens";
import type { DocSection } from "@/lib/legal-sections";
import { sectionsToTiptapDoc, tiptapDocToSections } from "./sections-tiptap";

/** Word-like editor over the persisted sections format. Every H2 starts a new section; the
 *  serialized DocSection[] travels in the hidden `sections` input of the surrounding form. */

const CANVAS =
  "mx-auto w-full max-w-3xl min-h-[60vh] px-6 py-5 text-sm outline-none [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:first:mt-0 [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5";

function ToolbarButton({
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
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={active ? "bg-muted text-foreground" : "text-muted-foreground"}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function RichDocEditor({ initialSections, saveLabel }: { initialSections: DocSection[]; saveLabel: string }) {
  const [sections, setSections] = React.useState<DocSection[]>(initialSections);
  const [, bump] = React.useReducer((x: number) => x + 1, 0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        hardBreak: false,
        link: { openOnClick: false, autolink: false },
      }),
    ],
    content: sectionsToTiptapDoc(initialSections),
    immediatelyRender: false,
    editorProps: { attributes: { class: CANVAS, "aria-label": "Document content" } },
    onUpdate: ({ editor: e }) => setSections(tiptapDocToSections(e.getJSON())),
    onSelectionUpdate: () => bump(),
  });

  const problem =
    sections.length === 0
      ? "Write something before saving."
      : sections.length > 60
        ? "Too many sections (max 60)."
        : sections.some((s) => !s.body.trim())
          ? "Every heading needs at least one paragraph or list under it."
          : null;

  const setLink = () => {
    if (!editor) return;
    const prev = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Link URL (/path, https://…, mailto:…, tel:…)", prev);
    if (url === null) return;
    if (!url.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="min-w-0 space-y-3">
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />
      <div className="rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
          <ToolbarButton label="Section heading" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Paragraph" active={editor?.isActive("paragraph")} onClick={() => editor?.chain().focus().setParagraph().run()}>
            <Pilcrow className="size-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic className="size-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Bullet list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Add or edit link" active={editor?.isActive("link")} onClick={setLink}>
            <Link2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Remove link" disabled={!editor?.isActive("link")} onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}>
            <Link2Off className="size-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Undo" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 className="size-4" />
          </ToolbarButton>
          <div className="ms-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()}>
                  Merge field <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                {MERGE_TOKENS.map((t) => (
                  <DropdownMenuItem key={t.token} onSelect={() => editor?.chain().focus().insertContent(t.token).run()}>
                    <span className="font-mono text-xs">{t.token}</span>
                    <span className="ms-2 text-muted-foreground">{t.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <EditorContent editor={editor} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!!problem}>{saveLabel}</Button>
        {problem && <p className="text-sm text-muted-foreground">{problem}</p>}
      </div>
    </div>
  );
}
