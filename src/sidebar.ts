import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { loadFile } from "./render";

type DirEntry = Awaited<ReturnType<typeof readDir>>[number];

function isMarkdown(name: string): boolean {
  return /\.(md|markdown)$/i.test(name);
}

function joinPath(base: string, name: string): string {
  return base.replace(/[/\\]+$/, "") + "/" + name;
}

function buildTree(entries: DirEntry[], basePath: string): HTMLUListElement {
  const ul = document.createElement("ul");

  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of sorted) {
    const fullPath = joinPath(basePath, entry.name);

    if (entry.isDirectory) {
      const li = document.createElement("li");
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = entry.name;
      details.appendChild(summary);

      let loaded = false;
      details.addEventListener("toggle", () => {
        if (details.open && !loaded) {
          loaded = true;
          readDir(fullPath)
            .then((children) => {
              const filtered = children.filter(
                (e) => e.isDirectory || isMarkdown(e.name)
              );
              if (filtered.length > 0) {
                details.appendChild(buildTree(filtered, fullPath));
              }
            })
            .catch(console.error);
        }
      });

      li.appendChild(details);
      ul.appendChild(li);
    } else if (isMarkdown(entry.name)) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "tree-file";
      btn.textContent = entry.name;
      btn.title = entry.name;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tree-file.active").forEach((el) =>
          el.classList.remove("active")
        );
        btn.classList.add("active");
        loadFile(fullPath).catch(console.error);
      });
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  return ul;
}

export async function openFolder(): Promise<void> {
  const selected = await open({ directory: true, multiple: false });
  if (!selected || typeof selected !== "string") return;

  const sidebar = document.getElementById("sidebar");
  const tree = document.getElementById("tree");
  if (!sidebar || !tree) return;

  sidebar.classList.remove("hidden");
  tree.innerHTML = "";

  const rootLabel = document.createElement("li");
  rootLabel.className = "tree-root";
  rootLabel.textContent = selected.split(/[/\\]/).pop() ?? selected;
  tree.appendChild(rootLabel);

  const entries = await readDir(selected);
  const filtered = entries.filter(
    (e) => e.isDirectory || isMarkdown(e.name)
  );
  tree.appendChild(buildTree(filtered, selected));
}

export function initSidebar(): void {
  document.getElementById("btn-open-folder")?.addEventListener("click", () => {
    openFolder().catch(console.error);
  });
}
