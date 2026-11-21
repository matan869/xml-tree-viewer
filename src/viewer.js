/* Standalone viewer page: drop / choose / paste JSON or XML, then render. */
(function () {
  "use strict";
  const card = document.getElementById("card");
  const drop = document.getElementById("drop");
  const file = document.getElementById("file");
  const paste = document.getElementById("paste");
  const go = document.getElementById("go");

  function storedTheme(cb) {
    try { chrome.storage.sync.get({ theme: "auto" }, (v) => cb((v && v.theme) || "auto")); }
    catch (e) { cb("auto"); }
  }

  function isJson(text, name) {
    if (/\.(json|jsonl|ndjson|geojson|har)$/i.test(name || "")) return true;
    return XMLV.looksLikeJson(text);
  }

  function show(text, name) {
    storedTheme((theme) => {
      card.remove();
      const json = isJson(text, name);
      document.title = (name || "pasted") + (json ? " – JSON Viewer" : " – XML Viewer");
      const o = {
        theme,
        filename: (name || "pasted").replace(/\.[^.]+$/, ""),
        onTheme(t) { try { chrome.storage.sync.set({ theme: t }); } catch (e) {} },
      };
      if (json) XMLV.buildJsonViewer(document, document.body, text, o);
      else XMLV.buildViewer(document, document.body, text, o);
    });
  }

  function readFile(f) {
    const r = new FileReader();
    r.onload = () => show(String(r.result), f.name);
    r.readAsText(f);
  }

  drop.addEventListener("click", () => file.click());
  file.addEventListener("change", () => { if (file.files[0]) readFile(file.files[0]); });
  ["dragover", "dragenter"].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.add("over");
  }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.remove("over");
  }));
  drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) readFile(f);
  });
  go.addEventListener("click", () => { if (paste.value.trim()) show(paste.value, "pasted"); });
  paste.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && paste.value.trim()) show(paste.value, "pasted");
  });
})();
