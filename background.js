function applySettingsForTab(tabId, domain) {
  chrome.storage.sync.get(["settingsByDomain"], function (result) {
    const byDomain = result.settingsByDomain || {};
    const cfg = byDomain[domain] || {};

    // apply font
    if (cfg.font) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (font) => {
          const style = document.createElement("style");
          style.id = "customFontStyle";
          style.innerHTML = `* { font-family: '${font}' !important; }`;
          document.head.appendChild(style);
        },
        args: [cfg.font],
      });
    }

    // apply font size delta (including zero)
    if (typeof cfg.fontSize !== "undefined") {
      const selectedFontSize = Number(cfg.fontSize);
      if (!isNaN(selectedFontSize)) {
        if (selectedFontSize === 0) {
          // A delta of 0 explicitly means: restore original sizes (reset)
          // Use the same logic as resetFontSizeOnTab so that applying +0
          // will set elements back to their original sizes and remove
          // the namespaced data attribute.
          resetFontSizeOnTab(tabId);
        } else {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (delta) => {
              const els = document.querySelectorAll("*");
              els.forEach((el) => {
                try {
                  // namespaced attribute to avoid collisions with page
                  const dataAttr = "data-gfgfc-original-font-size";
                  let original = el.getAttribute(dataAttr);
                  if (!original) {
                    // store the computed original size once
                    const comp = window.getComputedStyle(el).fontSize || "";
                    el.setAttribute(dataAttr, comp);
                    original = comp;
                  }
                  // Use the stored original as the baseline so applying is idempotent
                  const origValue = parseFloat(original);
                  if (!isNaN(origValue)) {
                    el.style.fontSize = origValue + delta + "px";
                  }
                } catch (e) {
                  // ignore errors on exotic elements
                }
              });
            },
            args: [selectedFontSize],
          });
        }
      }
    }

    // apply scaling (treat 1 as explicit reset)
    if (typeof cfg.scaling !== "undefined") {
      const scalingValue = Number(cfg.scaling);
      if (!isNaN(scalingValue)) {
        if (scalingValue === 1) {
          // 100% selected — explicitly remove any injected scaling style
          resetScalingOnTab(tabId);
        } else {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (scale) => {
              const style = document.createElement("style");
              style.id = "customScalingStyle";
              style.innerHTML = `html { transform: scale(${scale}); transform-origin: 0 0; }`;
              document.head.appendChild(style);
            },
            args: [scalingValue],
          });
        }
      }
    }
  });
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
      const els = document.querySelectorAll("[data-gfgfc-original-font-size]");
      els.forEach((el) => {
        const original = el.getAttribute("data-gfgfc-original-font-size");
        if (original !== null) {
          el.style.fontSize = original || "";
          el.removeAttribute("data-gfgfc-original-font-size");
        }
      });
    },
  });
}

function resetScalingOnTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const customScalingStyle = document.getElementById("customScalingStyle");
      if (customScalingStyle) {
        customScalingStyle.remove();
      }
    },
  });
}

chrome.webNavigation.onCompleted.addListener(function (details) {
  const domain = new URL(details.url).hostname;
  applySettingsForTab(details.tabId, domain);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "resetFontOnTab") {
    resetFontOnTab(request.tabId);
  } else if (request.action === "resetFontSizeOnTab") {
    resetFontSizeOnTab(request.tabId);
  } else if (request.action === "resetScalingOnTab") {
    resetScalingOnTab(request.tabId);
  } else if (request.action === "applySettingsForDomain") {
    // apply stored settings to all open tabs for that domain
    const domain = request.domain;
    if (domain) {
      chrome.tabs.query({}, function (tabs) {
        for (const tab of tabs) {
          try {
            const tabDomain = new URL(tab.url).hostname;
            if (tabDomain === domain) {
              applySettingsForTab(tab.id, domain);
            }
          } catch (e) {
            // ignore invalid urls
          }
        }
      });
    }
  }
});
