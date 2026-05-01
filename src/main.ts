import "highlight.js/styles/github-dark-dimmed.css";
import "./styles.css";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { loadFile } from "./render";
import { initSidebar } from "./sidebar";
import { initFind, openFindBar, hideFindBar } from "./find";

function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

window.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initFind();

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
