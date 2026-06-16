"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  Loader2Icon,
  RefreshCwIcon,
  WandSparklesIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COVER_LETTER_MAX_WORDS } from "@/lib/constants";
import type { RefineAction } from "@/lib/schemas";
import { cn, wordCount } from "@/lib/utils";
import { EditorToolbar } from "./editor-toolbar";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToHtml(text: string): string {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim().length > 0);
  if (blocks.length === 0) return "<p></p>";
  return blocks.map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`).join("");
}

export function CoverLetterEditor({
  content,
  regenerating,
  onChange,
  onRegenerate,
  onRefine,
  onCopy,
  onDownloadTxt,
  onDownloadDocx,
}: {
  content: string;
  regenerating: boolean;
  onChange: (text: string) => void;
  onRegenerate: () => void;
  onRefine: (action: RefineAction) => void;
  onCopy: () => void;
  onDownloadTxt: () => void;
  onDownloadDocx: () => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: textToHtml(content),
    editorProps: {
      attributes: {
        class: "tiptap",
        "aria-label": "Cover letter editor",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getText({ blockSeparator: "\n\n" })),
  });

  // Reset the editor when a new letter arrives (initial generate / regenerate).
  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getText({ blockSeparator: "\n\n" });
    if (content !== current) {
      editor.commands.setContent(textToHtml(content), false);
    }
  }, [content, editor]);

  const words = wordCount(content);
  const overLimit = words > COVER_LETTER_MAX_WORDS;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Your tailored cover letter</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <WandSparklesIcon />
              Refine
              <ChevronDownIcon className="size-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={() => onRefine("concise")}>More concise</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRefine("formal")}>More formal</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRefine("shorten")}>
                Shorten to ~250 words
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRefine("grammar")}>Fix grammar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating}>
            {regenerating ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
            Regenerate
          </Button>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        {editor ? <EditorToolbar editor={editor} /> : null}
        <div className="relative px-4 py-3">
          <EditorContent editor={editor} />
          {regenerating ? (
            <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-[1px]">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Rewriting...
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3 border-t px-4 py-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                overLimit ? "bg-orange-500" : "bg-primary",
              )}
              style={{ width: `${Math.min(100, (words / COVER_LETTER_MAX_WORDS) * 100)}%` }}
            />
          </div>
          <span
            className={cn(
              "shrink-0 text-xs tabular-nums text-muted-foreground",
              overLimit && "font-medium text-orange-600 dark:text-orange-400",
            )}
          >
            {words} / {COVER_LETTER_MAX_WORDS} words
          </span>
        </div>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        This is an AI-generated draft -- review and personalize the details before you send it.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button onClick={onCopy} className="h-10">
          <CopyIcon />
          Copy to clipboard
        </Button>
        <Button variant="outline" onClick={onDownloadTxt} className="h-10">
          <DownloadIcon />
          Download as TXT
        </Button>
        <Button variant="outline" onClick={onDownloadDocx} className="h-10">
          <DownloadIcon />
          Download as DOCX
        </Button>
      </div>
    </section>
  );
}
