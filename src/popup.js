(function () {
  "use strict";
  document.getElementById("open").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
  });
  document.getElementById("fileAccess").addEventListener("click", () => {
    document.getElementById("fileNote").style.display = "block";
    chrome.tabs.create({ url: "chrome://extensions/?id=" + chrome.runtime.id });
  });
  const theme = document.getElementById("theme");
  chrome.storage.sync.get({ theme: "auto" }, (v) => { theme.value = (v && v.theme) || "auto"; });
  theme.addEventListener("change", () => chrome.storage.sync.set({ theme: theme.value }));
  const json = document.getElementById("json");
  chrome.storage.sync.get({ json: true }, (v) => { json.checked = !v || v.json !== false; });
  json.addEventListener("change", () => chrome.storage.sync.set({ json: json.checked }));
})();
