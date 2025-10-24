document.addEventListener("DOMContentLoaded", function () {
  const fontSelector = document.getElementById("fontSelector");
  const fontSizeSelector = document.getElementById("fontSizeSelector");
  const scalingSelector = document.getElementById("scalingSelector");
  const applyFontButton = document.getElementById("applyFontButton");
  const applyFontSizeButton = document.getElementById("applyFontSizeButton");
  const applyScalingButton = document.getElementById("applyScalingButton");
  const resetFontButton = document.getElementById("resetFontButton");
  const resetFontSizeButton = document.getElementById("resetFontSizeButton");
  const resetScalingButton = document.getElementById("resetScalingButton");
  const fontSettingsTextarea = document.getElementById("fontSettings");

  // Load the font settings from Chrome storage when the extension is loaded
  loadFontSettingsFromStorage();

  // Populate the font selector with available fonts
  chrome.fontSettings.getFontList(function (fonts) {
    for (let i = 0; i < fonts.length; i++) {
      const option = document.createElement("option");
      option.text = fonts[i].displayName;
      option.value = fonts[i].fontId;
      fontSelector.appendChild(option);
    }
  });

  applyFontButton.addEventListener("click", function () {
    const selectedFont = fontSelector.value;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const domain = new URL(activeTab.url).hostname;
      saveFontSettingsToStorage(domain, selectedFont);
      displayFontSettings(domain, selectedFont);
      applyFontToTabsWithDomain(domain, selectedFont);
    });
  });

  applyFontSizeButton.addEventListener("click", function () {
    // selected value is an integer delta in pixels (e.g. "2" for +2px)
    const selectedFontSize = parseInt(fontSizeSelector.value, 10);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const domain = new URL(activeTab.url).hostname;
      saveFontSizeSettingsToStorage(domain, selectedFontSize);
      displayFontSizeSettings(domain, selectedFontSize);
      applyFontSizeToTabsWithDomain(domain, selectedFontSize);
    });
  });

  applyScalingButton.addEventListener("click", function () {
    const scalingFactor = scalingSelector.value;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const domain = new URL(activeTab.url).hostname;
      saveScalingSettingsToStorage(domain, scalingFactor);
      displayScalingSettings(domain, scalingFactor);
      applyScalingToTabsWithDomain(domain, scalingFactor);
    });
  });

  resetFontButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const domain = new URL(activeTab.url).hostname;
      removeFontSettingsFromStorage(domain);
      resetFontOnTab(activeTab.id);
    });
  });

  resetFontSizeButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const domain = new URL(activeTab.url).hostname;
      removeFontSizeSettingsFromStorage(domain);
      resetFontSizeOnTab(activeTab.id);
    });
  });

  resetScalingButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const domain = new URL(activeTab.url).hostname;
      removeScalingSettingsFromStorage(domain);
      resetScalingOnTab(activeTab.id);
    });
  });

  function resetFontOnTab(tabId) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: () => {
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
      function: () => {
        // Restore original font sizes stored in data attribute
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

  function resetScalingOnTab(tabId) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: () => {
        const customScalingStyle =
          document.getElementById("customScalingStyle");
        if (customScalingStyle) {
          customScalingStyle.remove();
        }
      },
    });
  }

  function saveFontSettingsToStorage(domain, font) {
    chrome.storage.sync.get(["fontSettings"], function (result) {
      const fontSettings = result.fontSettings || {};
      fontSettings[domain] = font;
      chrome.storage.sync.set({ fontSettings }, function () {
        console.log("Font settings saved to Chrome storage.");
      });
    });
  }

  function saveFontSizeSettingsToStorage(domain, fontSize) {
    // store numeric delta (px) for the domain
    chrome.storage.sync.get(["fontSizeSettings"], function (result) {
      const fontSizeSettings = result.fontSizeSettings || {};
      fontSizeSettings[domain] = Number(fontSize);
      chrome.storage.sync.set({ fontSizeSettings }, function () {
        console.log("Font size settings saved to Chrome storage.");
      });
    });
  }

  function saveScalingSettingsToStorage(domain, scalingFactor) {
    chrome.storage.sync.get(["scalingSettings"], function (result) {
      const scalingSettings = result.scalingSettings || {};
      scalingSettings[domain] = scalingFactor;
      chrome.storage.sync.set({ scalingSettings }, function () {
        console.log("Scaling settings saved to Chrome storage.");
      });
    });
  }

  function loadFontSettingsFromStorage() {
    chrome.storage.sync.get(
      ["fontSettings", "fontSizeSettings", "scalingSettings"],
      function (result) {
        const fontSettings = result.fontSettings || {};
        const fontSizeSettings = result.fontSizeSettings || {};
        const scalingSettings = result.scalingSettings || {};
        displayFontSettingsInTextarea(fontSettings);
        displayFontSizeSettingsInTextarea(fontSizeSettings);
        displayScalingSettingsInTextarea(scalingSettings);
      }
    );
  }

  function displayFontSettings(domain, font) {
    fontSettingsTextarea.value += `Domain: ${domain}, Font: ${font}\n`;
  }

  function displayFontSizeSettings(domain, fontSize) {
    fontSettingsTextarea.value += `Domain: ${domain}, Font Size delta: +${fontSize}px\n`;
  }

  function displayScalingSettings(domain, scalingFactor) {
    fontSettingsTextarea.value += `Domain: ${domain}, Scaling Factor: ${scalingFactor}\n`;
  }

  function displayFontSettingsInTextarea(fontSettings) {
    fontSettingsTextarea.value = "";
    for (const domain in fontSettings) {
      const font = fontSettings[domain];
      displayFontSettings(domain, font);
    }
  }

  function displayFontSizeSettingsInTextarea(fontSizeSettings) {
    for (const domain in fontSizeSettings) {
      const fontSize = fontSizeSettings[domain];
      displayFontSizeSettings(domain, fontSize);
    }
  }

  function displayScalingSettingsInTextarea(scalingSettings) {
    for (const domain in scalingSettings) {
      const scalingFactor = scalingSettings[domain];
      displayScalingSettings(domain, scalingFactor);
    }
  }

  function removeFontSettingsFromStorage(domain) {
    chrome.storage.sync.get(["fontSettings"], function (result) {
      const fontSettings = result.fontSettings || {};
      if (fontSettings.hasOwnProperty(domain)) {
        delete fontSettings[domain];
        chrome.storage.sync.set({ fontSettings }, function () {
          console.log("Font settings removed from Chrome storage.");
        });
      }
    });
  }

  function removeFontSizeSettingsFromStorage(domain) {
    chrome.storage.sync.get(["fontSizeSettings"], function (result) {
      const fontSizeSettings = result.fontSizeSettings || {};
      if (fontSizeSettings.hasOwnProperty(domain)) {
        delete fontSizeSettings[domain];
        chrome.storage.sync.set({ fontSizeSettings }, function () {
          console.log("Font size settings removed from Chrome storage.");
        });
      }
    });
  }

  function removeScalingSettingsFromStorage(domain) {
    chrome.storage.sync.get(["scalingSettings"], function (result) {
      const scalingSettings = result.scalingSettings || {};
      if (scalingSettings.hasOwnProperty(domain)) {
        delete scalingSettings[domain];
        chrome.storage.sync.set({ scalingSettings }, function () {
          console.log("Scaling settings removed from Chrome storage.");
        });
      }
    });
  }

  function applyFontToTab(tabId, font) {
    if (font) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: (font) => {
          const style = document.createElement("style");
          style.id = "customFontStyle";
          style.innerHTML = `* { font-family: ${font} !important; }`;
          document.head.appendChild(style);
        },
        args: [font],
      });
    }
  }

  function applyFontSizeToTab(tabId, fontSize) {
    // fontSize is a numeric delta in px (e.g. 2 means +2px)
    if (typeof fontSize === "number" && !isNaN(fontSize) && fontSize !== 0) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (delta) => {
          // Iterate all elements and increase computed font-size by delta px.
          const els = document.querySelectorAll("*");
          els.forEach((el) => {
            try {
              // Save original computed font-size if not already saved
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
              // ignore nodes we can't read or set (like svg etc.)
            }
          });
        },
        args: [fontSize],
      });
    }
  }

  function applyScalingToTab(tabId, scalingFactor) {
    if (scalingFactor) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: (scalingFactor) => {
          const style = document.createElement("style");
          style.id = "customScalingStyle";
          style.innerHTML = `html { transform: scale(${scalingFactor}); transform-origin: 0 0; }`;
          document.head.appendChild(style);
        },
        args: [scalingFactor],
      });
    }
  }

  function applyFontToTabsWithDomain(domain, font) {
    chrome.tabs.query({}, function (tabs) {
      for (const tab of tabs) {
        const tabDomain = new URL(tab.url).hostname;
        if (tabDomain === domain) {
          applyFontToTab(tab.id, font);
        }
      }
    });
  }

  function applyFontSizeToTabsWithDomain(domain, fontSize) {
    chrome.tabs.query({}, function (tabs) {
      for (const tab of tabs) {
        try {
          const tabDomain = new URL(tab.url).hostname;
          if (tabDomain === domain) {
            applyFontSizeToTab(tab.id, fontSize);
          }
        } catch (e) {
          // ignore tabs without valid URL (chrome://, etc.)
        }
      }
    });
  }

  function applyScalingToTabsWithDomain(domain, scalingFactor) {
    chrome.tabs.query({}, function (tabs) {
      for (const tab of tabs) {
        const tabDomain = new URL(tab.url).hostname;
        if (tabDomain === domain) {
          applyScalingToTab(tab.id, scalingFactor);
        }
      }
    });
  }
});
