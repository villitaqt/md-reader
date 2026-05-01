let findBar: HTMLElement | null = null;
let hits: HTMLElement[] = [];
let currentHit = -1;

function updateCounter(): void {
  const counter = document.getElementById("find-counter");
  if (!counter) return;
  counter.textContent =
    hits.length > 0 ? `${currentHit + 1}/${hits.length}` : hits.length === 0 ? "" : "Sin resultados";
}

function clearHits(): void {
  document.querySelectorAll("mark.hit").forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
      parent.normalize();
    }
  });
  hits = [];
  currentHit = -1;
  updateCounter();
}

function activateHit(index: number): void {
  hits.forEach((h) => h.classList.remove("active"));
  const hit = hits[index];
  if (hit) {
    hit.classList.add("active");
    hit.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function search(query: string): void {
  clearHits();
  if (!query.trim()) return;

  const content = document.getElementById("content");
  if (!content) return;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? "";
    if (!regex.test(text)) {
      regex.lastIndex = 0;
      continue;
    }
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const mark = document.createElement("mark");
      mark.className = "hit";
      mark.textContent = match[0];
      fragment.appendChild(mark);
      hits.push(mark);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  if (hits.length > 0) {
    currentHit = 0;
    activateHit(0);
  }
  updateCounter();
}

function navigate(direction: 1 | -1): void {
  if (hits.length === 0) return;
  currentHit = (currentHit + direction + hits.length) % hits.length;
  activateHit(currentHit);
  updateCounter();
}

function closeFindBar(): void {
  if (!findBar) return;
  findBar.classList.add("hidden");
  clearHits();
}

export function openFindBar(): void {
  if (!findBar) return;
  findBar.classList.remove("hidden");
  const input = document.getElementById("find-input") as HTMLInputElement | null;
  input?.focus();
  input?.select();
}

export function hideFindBar(): void {
  closeFindBar();
}

export function initFind(): void {
  findBar = document.createElement("div");
  findBar.id = "find-bar";
  findBar.className = "hidden";
  findBar.innerHTML = `
    <input id="find-input" type="text" placeholder="Buscar..." autocomplete="off" spellcheck="false" />
    <span id="find-counter"></span>
    <button id="find-prev" title="Anterior (Shift+Enter)">&#x25B2;</button>
    <button id="find-next" title="Siguiente (Enter)">&#x25BC;</button>
    <button id="find-close" title="Cerrar (Esc)">&#x2715;</button>
  `;
  document.getElementById("viewer")?.appendChild(findBar);

  const input = document.getElementById("find-input") as HTMLInputElement | null;
  input?.addEventListener("input", () => search(input?.value ?? ""));
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") navigate(e.shiftKey ? -1 : 1);
    if (e.key === "Escape") closeFindBar();
  });

  document.getElementById("find-prev")?.addEventListener("click", () => navigate(-1));
  document.getElementById("find-next")?.addEventListener("click", () => navigate(1));
  document.getElementById("find-close")?.addEventListener("click", closeFindBar);
  document.getElementById("btn-find")?.addEventListener("click", openFindBar);

  document.getElementById("content")?.addEventListener("file-load", clearHits);
}
