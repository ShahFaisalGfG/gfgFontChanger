function applyFontToTab(tabId, domain) {
  chrome.storage.sync.get(
    ["fontSettings", "fontSizeSettings"],
    function (result) {
      const fontSettings = result.fontSettings || {};
      const fontSizeSettings = result.fontSizeSettings || {};

      if (fontSettings.hasOwnProperty(domain)) {
        const selectedFont = fontSettings[domain];
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (font) => {
            const style = document.createElement("style");
            style.id = "customFontStyle";
            style.innerHTML = `* { font-family: ${font} !important; }`;
            document.head.appendChild(style);
          },
          args: [selectedFont],
        });
      }

      if (fontSizeSettings.hasOwnProperty(domain)) {
        const selectedFontSize = Number(fontSizeSettings[domain]);
        if (!isNaN(selectedFontSize) && selectedFontSize !== 0) {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (delta) => {
              const els = document.querySelectorAll("*");
              els.forEach((el) => {
                try {
                  if (!el.hasAttribute("data-gfg-original-font-size")) {
                    const comp = window.getComputedStyle(el).fontSize || "";
                    el.setAttribute("data-gfg-original-font-size", comp);
                  }
                  const compSize = window.getComputedStyle(el).fontSize;
                  if (compSize) {
                    const current = parseFloat(compSize);
                    if (!isNaN(current)) {
                      el.style.fontSize = current + delta + "px";
                    }
                  }
                } catch (e) {
                  // ignore
                }
              });
            },
            args: [selectedFontSize],
          });
        }
      }
    }
  );
}

function resetFontOnTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const customFontStyle = document.getElementById("customFontStyle");
      if (customFontStyle) {
        customFontStyle.remove();
      }
    },
  });
}

function resetFontSizeOnTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const els = document.querySelectorAll("[data-gfg-original-font-size]");
      els.forEach((el) => {
        const original = el.getAttribute("data-gfg-original-font-size");
        if (original !== null) {
          el.style.fontSize = original || "";
          el.removeAttribute("data-gfg-original-font-size");
        }
      });
    },
  });
}

chrome.webNavigation.onCompleted.addListener(function (details) {
  const domain = new URL(details.url).hostname;
  applyFontToTab(details.tabId, domain);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "resetFontOnTab") {
    resetFontOnTab(request.tabId);
  } else if (request.action === "resetFontSizeOnTab") {
    resetFontSizeOnTab(request.tabId);
  }
});
