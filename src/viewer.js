/* Standalone viewer page: drop / choose / paste XML, then render. */
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

  function show(xmlText, name) {
    storedTheme((theme) => {
      card.remove();
      document.title = (name || "pasted") + " – XML Viewer";
      XMLV.buildViewer(document, document.body, xmlText, {
        theme,
        filename: (name || "pasted").replace(/\.[^.]+$/, ""),
        onTheme(t) { try { chrome.storage.sync.set({ theme: t }); } catch (e) {} },
      });
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
  go.addEventListener("click", () => { if (paste.value.trim()) show(paste.value, "pasted.xml"); });
  paste.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && paste.value.trim()) show(paste.value, "pasted.xml");
  });
})();
