document.addEventListener("DOMContentLoaded", function () {
  const fontSelector = document.getElementById("fontSelector");
  const fontSizeInput = document.getElementById("fontSizeInput");
  const decreaseFontSizeButton = document.getElementById(
    "decreaseFontSizeButton"
  );
  const increaseFontSizeButton = document.getElementById(
    "increaseFontSizeButton"
  );
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
      saveFontSettingsToStorage(domain, selectedFont, function () {
        displayFontSettings(domain, selectedFont);
        // Ask background to apply settings for the domain now
        chrome.runtime.sendMessage({
          action: "applySettingsForDomain",
          domain: domain,
        });
      });
    });
  });

  applyFontSizeButton.addEventListener("click", function () {
    // selected value is an integer delta in pixels (e.g. "2" for +2px)
    const selectedFontSize = clampFontSizeValue(fontSizeInput.value);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const domain = new URL(activeTab.url).hostname;
      saveFontSizeSettingsToStorage(domain, selectedFontSize, function () {
        displayFontSizeSettings(domain, selectedFontSize);
        chrome.runtime.sendMessage({
          action: "applySettingsForDomain",
          domain: domain,
        });
      });
    });
  });

  // Increase/decrease buttons for the font-size input
  decreaseFontSizeButton.addEventListener("click", function () {
    const v = clampFontSizeValue(Number(fontSizeInput.value) - 1);
    fontSizeInput.value = v;
  });

  increaseFontSizeButton.addEventListener("click", function () {
    const v = clampFontSizeValue(Number(fontSizeInput.value) + 1);
    fontSizeInput.value = v;
  });

  // Allow manual entry but enforce integer and clamp on blur/change
  fontSizeInput.addEventListener("change", function () {
    fontSizeInput.value = clampFontSizeValue(fontSizeInput.value);
  });

  applyScalingButton.addEventListener("click", function () {
    const scalingFactor = scalingSelector.value;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const domain = new URL(activeTab.url).hostname;
      saveScalingSettingsToStorage(domain, scalingFactor, function () {
        displayScalingSettings(domain, scalingFactor);
        chrome.runtime.sendMessage({
          action: "applySettingsForDomain",
          domain: domain,
        });
      });
    });
  });

  resetFontButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      let domain = null;
      try {
        domain = new URL(activeTab.url).hostname;
      } catch (e) {
        // special page or invalid URL; we'll just reload as a fallback
      }
      if (domain) {
        removeFontSettingsFromStorage(domain, function () {
          // reload the tab so background re-applies remaining settings (or none)
          chrome.tabs.reload(activeTab.id);
        });
      } else {
        chrome.tabs.reload(activeTab.id);
      }
    });
  });

  resetFontSizeButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      let domain = null;
      try {
        domain = new URL(activeTab.url).hostname;
      } catch (e) {
        // Could be a special page (chrome://, about:, etc.). In that case just reload the tab.
      }
      // Remove fontSize only for this domain, then reload the page so changes take effect.
      if (domain) {
        removeFontSizeSettingsFromStorage(domain, function () {
          chrome.tabs.reload(activeTab.id);
        });
      } else {
        // No domain parsed; just reload the tab as a fallback.
        chrome.tabs.reload(activeTab.id);
      }
    });
  });

  resetScalingButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      let domain = null;
      try {
        domain = new URL(activeTab.url).hostname;
      } catch (e) {
        // fallback for special pages
      }
      if (domain) {
        removeScalingSettingsFromStorage(domain, function () {
          chrome.tabs.reload(activeTab.id);
        });
      } else {
        chrome.tabs.reload(activeTab.id);
      }
    });
  });

  // reset helpers moved to background; popup sends messages directly from handlers

  function saveFontSettingsToStorage(domain, font, callback) {
    // store under settingsByDomain[domain].font
    chrome.storage.sync.get(["settingsByDomain"], function (result) {
      const byDomain = result.settingsByDomain || {};
      const cfg = byDomain[domain] || {};
      cfg.font = font;
      byDomain[domain] = cfg;
      chrome.storage.sync.set({ settingsByDomain: byDomain }, function () {
        console.log("Font settings saved to Chrome storage.");
        if (typeof callback === "function") callback();
      });
    });
  }

  function saveFontSizeSettingsToStorage(domain, fontSize, callback) {
    // store numeric delta (px) under settingsByDomain[domain].fontSize
    chrome.storage.sync.get(["settingsByDomain"], function (result) {
      const byDomain = result.settingsByDomain || {};
      const cfg = byDomain[domain] || {};
      cfg.fontSize = Number(fontSize);
      byDomain[domain] = cfg;
      chrome.storage.sync.set({ settingsByDomain: byDomain }, function () {
        console.log("Font size settings saved to Chrome storage.");
        if (typeof callback === "function") callback();
      });
    });
  }

  function clampFontSizeValue(val) {
    let n = parseInt(val, 10);
    if (isNaN(n)) n = 0;
    if (n > 5) n = 5;
    if (n < -5) n = -5;
    return n;
  }

  function saveScalingSettingsToStorage(domain, scalingFactor, callback) {
    chrome.storage.sync.get(["settingsByDomain"], function (result) {
      const byDomain = result.settingsByDomain || {};
      const cfg = byDomain[domain] || {};
      // store scaling as a Number for consistency
      cfg.scaling = Number(scalingFactor);
      byDomain[domain] = cfg;
      chrome.storage.sync.set({ settingsByDomain: byDomain }, function () {
        console.log("Scaling settings saved to Chrome storage.");
        if (typeof callback === "function") callback();
      });
    });
  }

  function loadFontSettingsFromStorage() {
    chrome.storage.sync.get(["settingsByDomain"], function (result) {
      const byDomain = result.settingsByDomain || {};
      // clear textarea and display combined settings per domain
      fontSettingsTextarea.value = "";
      for (const domain in byDomain) {
        const cfg = byDomain[domain];
        if (cfg.font) displayFontSettings(domain, cfg.font);
        if (typeof cfg.fontSize !== "undefined")
          displayFontSizeSettings(domain, cfg.fontSize);
        if (typeof cfg.scaling !== "undefined")
          displayScalingSettings(domain, cfg.scaling);
      }
    });
  }

  function displayFontSettings(domain, font) {
    fontSettingsTextarea.value += `Domain: ${domain}, Font: ${font}\n`;
  }

  function displayFontSizeSettings(domain, fontSize) {
    fontSettingsTextarea.value += `Domain: ${domain}, Font Size delta: ${
      fontSize >= 0 ? "+" : ""
    }${fontSize}px\n`;
  }

  function displayScalingSettings(domain, scalingFactor) {
    fontSettingsTextarea.value += `Domain: ${domain}, Scaling Factor: ${scalingFactor}\n`;
  }

  // old per-key display helpers removed; popup now reads `settingsByDomain` and uses display* helpers

  function removeFontSettingsFromStorage(domain, callback) {
    chrome.storage.sync.get(["settingsByDomain"], function (result) {
      const byDomain = result.settingsByDomain || {};
      if (byDomain.hasOwnProperty(domain)) {
        const cfg = byDomain[domain];
        delete cfg.font;
        // if cfg now empty, remove the domain entirely
        if (
          !cfg.font &&
          typeof cfg.fontSize === "undefined" &&
          typeof cfg.scaling === "undefined"
        ) {
          delete byDomain[domain];
        } else {
          byDomain[domain] = cfg;
        }
        chrome.storage.sync.set({ settingsByDomain: byDomain }, function () {
          console.log("Font settings removed from Chrome storage.");
          if (typeof callback === "function") callback();
        });
      } else if (typeof callback === "function") {
        callback();
      }
    });
  }

  function removeFontSizeSettingsFromStorage(domain, callback) {
    chrome.storage.sync.get(["settingsByDomain"], function (result) {
      const byDomain = result.settingsByDomain || {};
      if (byDomain.hasOwnProperty(domain)) {
        const cfg = byDomain[domain];
        delete cfg.fontSize;
        if (
          !cfg.font &&
          typeof cfg.fontSize === "undefined" &&
          typeof cfg.scaling === "undefined"
        ) {
          delete byDomain[domain];
        } else {
          byDomain[domain] = cfg;
        }
        chrome.storage.sync.set({ settingsByDomain: byDomain }, function () {
          console.log("Font size settings removed from Chrome storage.");
          if (typeof callback === "function") callback();
        });
      } else if (typeof callback === "function") {
        callback();
      }
    });
  }

  function removeScalingSettingsFromStorage(domain, callback) {
    chrome.storage.sync.get(["settingsByDomain"], function (result) {
      const byDomain = result.settingsByDomain || {};
      if (byDomain.hasOwnProperty(domain)) {
        const cfg = byDomain[domain];
        delete cfg.scaling;
        if (
          !cfg.font &&
          typeof cfg.fontSize === "undefined" &&
          typeof cfg.scaling === "undefined"
        ) {
          delete byDomain[domain];
        } else {
          byDomain[domain] = cfg;
        }
        chrome.storage.sync.set({ settingsByDomain: byDomain }, function () {
          console.log("Scaling settings removed from Chrome storage.");
          if (typeof callback === "function") callback();
        });
      } else if (typeof callback === "function") {
        callback();
      }
    });
  }

  // All apply/reset actions are centralized and handled by the background script.
});
