function applyFontToTab(tabId, domain) {
  chrome.storage.sync.get(['fontSettings', 'fontSizeSettings'], function (result) {
    const fontSettings = result.fontSettings || {};
    const fontSizeSettings = result.fontSizeSettings || {};

    if (fontSettings.hasOwnProperty(domain)) {
      const selectedFont = fontSettings[domain];
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (font) => {
          const style = document.createElement('style');
          style.id = 'customFontStyle';
          style.innerHTML = `* { font-family: ${font} !important; }`;
          document.head.appendChild(style);
        },
        args: [selectedFont],
      });
    }

    if (fontSizeSettings.hasOwnProperty(domain)) {
      const selectedFontSize = fontSizeSettings[domain];
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (fontSize) => {
          const style = document.createElement('style');
          style.id = 'customFontSizeStyle';
          style.innerHTML = `* { font-size: ${fontSize} !important; }`;
          document.head.appendChild(style);
        },
        args: [selectedFontSize],
      });
    }
  });
}

function resetFontOnTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const customFontStyle = document.getElementById('customFontStyle');
      if (customFontStyle) {
        customFontStyle.remove();
      }
    }
  });
}

function resetFontSizeOnTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const customFontSizeStyle = document.getElementById('customFontSizeStyle');
      if (customFontSizeStyle) {
        customFontSizeStyle.remove();
      }
    }
  });
}

chrome.webNavigation.onCompleted.addListener(function (details) {
  const domain = new URL(details.url).hostname;
  applyFontToTab(details.tabId, domain);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'resetFontOnTab') {
    resetFontOnTab(request.tabId);
  } else if (request.action === 'resetFontSizeOnTab') {
    resetFontSizeOnTab(request.tabId);
  }
});
