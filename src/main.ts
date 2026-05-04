import "highlight.js/styles/github-dark-dimmed.css";
import "./styles.css";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { loadFile, getCurrentSource, renderMarkdown } from "./render";
import { initSidebar } from "./sidebar";
import { initFind, openFindBar, hideFindBar } from "./find";

function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

window.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initFind();

  const modeToggle = document.getElementById("mode-toggle") as HTMLElement;
  const btnView = modeToggle.querySelector('[data-mode="view"]') as HTMLButtonElement;
  const btnEdit = modeToggle.querySelector('[data-mode="edit"]') as HTMLButtonElement;
  const editor = document.getElementById("editor") as HTMLTextAreaElement;
  const content = document.getElementById("content") as HTMLElement;
  const viewer = document.getElementById("viewer") as HTMLElement;
  let isEditMode = false;
  let workingSource = "";

  function autoResize() {
    editor.style.height = "auto";
    editor.style.height = editor.scrollHeight + "px";
  }

  function enterViewMode() {
    workingSource = editor.value;
    content.innerHTML = renderMarkdown(workingSource);
    editor.classList.add("hidden");
    content.classList.remove("hidden");
    btnView.classList.add("mode-btn--active");
    btnEdit.classList.remove("mode-btn--active");
    isEditMode = false;
    viewer.scrollTop = 0;
  }

  function enterEditMode() {
    editor.value = workingSource;
    content.classList.add("hidden");
    editor.classList.remove("hidden");
    btnEdit.classList.add("mode-btn--active");
    btnView.classList.remove("mode-btn--active");
    isEditMode = true;
    autoResize();
    editor.focus();
  }

  editor.addEventListener("input", autoResize);

  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.slice(0, start) + "  " + editor.value.slice(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
    }
  });

  btnView.addEventListener("click", () => { if (isEditMode) enterViewMode(); });
  btnEdit.addEventListener("click", () => { if (!isEditMode) enterEditMode(); });

  content.addEventListener("file-load", () => {
    modeToggle.classList.remove("hidden");
    if (isEditMode) {
      editor.classList.add("hidden");
      content.classList.remove("hidden");
      btnEdit.classList.remove("mode-btn--active");
      btnView.classList.add("mode-btn--active");
      isEditMode = false;
    }
    workingSource = getCurrentSource();
  });

  document.getElementById("btn-open-file")?.addEventListener("click", () => {
    open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    })
      .then((selected) => {
        if (selected && typeof selected === "string") {
          loadFile(selected).catch(console.error);
        }
      })
      .catch(console.error);
  });

  getCurrentWebview()
    .onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        const paths = event.payload.paths ?? [];
        const first = paths.find(isMarkdownPath);
        if (first) loadFile(first).catch(console.error);
      }
    })
    .catch(console.error);

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      openFindBar();
    }
    if (e.key === "Escape") {
      hideFindBar();
    }
  });
});
