chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openPopup") {
      const popupURL = chrome.runtime.getURL("popup.html");
  
      // Open the popup window with the username passed
      chrome.windows.getCurrent((currentWindow) => {
        const popupWidth = 525;
        const popupHeight = 625;
      
        const left = Math.round(currentWindow.left + (currentWindow.width - popupWidth) / 2);
        const top = Math.round(currentWindow.top + (currentWindow.height - popupHeight) / 2);
      
        chrome.windows.create({
          url: `${popupURL}?username=${encodeURIComponent(request.username)}`,
          type: "popup",
          width: popupWidth,
          height: popupHeight,
          left: left,
          top: top
        });
      });
      
    }
  });
  