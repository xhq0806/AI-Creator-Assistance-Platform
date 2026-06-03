import { useEffect, useRef } from "react";
import type { FormEvent, DragEvent } from "react";
import styles from "../index.less";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToHtml(value: string) {
  return value
    .split(/\n/)
    .map((line) => {
      const html = escapeHtml(line).replace(
        /\*\*([^*]+)\*\*/g,
        "<strong>$1</strong>"
      );
      return html ? `<p>${html}</p>` : "<p><br /></p>";
    })
    .join("");
}

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const children = Array.from(node.childNodes).map(nodeToMarkdown).join("");
  const tagName = node.tagName.toLowerCase();

  if (tagName === "strong" || tagName === "b") {
    return `**${children}**`;
  }
  if (tagName === "br") {
    return "\n";
  }
  if (tagName === "p" || tagName === "div") {
    return `${children}\n`;
  }

  return children;
}

type RichContentEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

export default function RichContentEditor({
  value = "",
  onChange,
  placeholder,
}: RichContentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  function insertMarkdown(before: string, after = "") {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const selected = range.toString();
    const wrapped = `${before}${selected}${after}`;
    range.deleteContents();
    range.insertNode(document.createTextNode(wrapped));
    onChange?.(editor.textContent || "");
  }

  function insertBlock(prefix: string) {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const text = range.toString();
    const wrapped = text ? `${prefix}${text}` : prefix;
    range.deleteContents();
    range.insertNode(document.createTextNode(wrapped));
    onChange?.(editor.textContent || "");
  }

  function insertImageMarkdown(url: string, alt = "配图") {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const imageMd = `![${alt}](${url})`;
    range.deleteContents();
    range.insertNode(document.createTextNode(imageMd));
    onChange?.(editor.textContent || "");
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const url = event.dataTransfer.getData("text/plain");
    if (url) {
      insertImageMarkdown(url, "素材图片");
    }
  }

  const toolbarItems = [
    { label: "H", title: "标题", action: () => insertBlock("## ") },
    { label: "B", title: "加粗", action: () => insertMarkdown("**", "**") },
    { label: "I", title: "斜体", action: () => insertMarkdown("*", "*") },
    { label: ">", title: "引用", action: () => insertBlock("> ") },
    { label: "•", title: "列表", action: () => insertBlock("- ") },
    { label: "1.", title: "编号", action: () => insertBlock("1. ") },
    { label: "</>", title: "代码", action: () => insertBlock("`") },
    { label: "🔗", title: "链接", action: () => insertMarkdown("[", "](url)") },
    { label: "—", title: "分割线", action: () => insertBlock("\n---\n") },
    {
      label: "🖼",
      title: "插入图片标记",
      action: () => insertBlock("![配图描述](url)"),
    },
  ];

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) {
      return;
    }
    editor.innerHTML = value ? markdownToHtml(value) : "";
  }, [value]);

  function handleInput(event: FormEvent<HTMLDivElement>) {
    const markdown = Array.from(event.currentTarget.childNodes)
      .map(nodeToMarkdown)
      .join("")
      .trim();
    onChange?.(markdown);
  }

  return (
    <div className={styles.editorWrap}>
      <div className={styles.editorToolbar}>
        {toolbarItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={styles.toolbarBtn}
            title={item.title}
            onMouseDown={(e) => {
              e.preventDefault();
              item.action();
            }}
          >
            {item.label}
          </button>
        ))}
        <span className={styles.toolbarHint}>支持 Markdown 语法</span>
      </div>
      <div
        ref={editorRef}
        className={styles.richEditor}
        contentEditable
        data-placeholder={placeholder}
        onInput={handleInput}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        suppressContentEditableWarning
      />
    </div>
  );
}
