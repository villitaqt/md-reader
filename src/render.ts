import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
import hljs from "highlight.js";
import DOMPurify from "dompurify";
import { readTextFile } from "@tauri-apps/plugin-fs";

function highlight(str: string, lang: string): string {
  if (lang && hljs.getLanguage(lang)) {
    return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
  }
  return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
}

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight,
})
  .use(taskLists, { enabled: false })
  .use(anchor)
  .use(footnote);

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(md.render(source), { USE_PROFILES: { html: true } });
}

export async function loadFile(path: string): Promise<void> {
  const source = await readTextFile(path);
  const content = document.getElementById("content");
  const viewer = document.getElementById("viewer");
  if (!content) return;
  content.dispatchEvent(new Event("file-load"));
  content.innerHTML = renderMarkdown(source);
  if (viewer) viewer.scrollTop = 0;
}
