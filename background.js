chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openPopup") {
      const popupURL = chrome.runtime.getURL("popup.html");
  
      // Open the popup window with the username passed
      chrome.windows.create({
        url: `${popupURL}?username=${encodeURIComponent(request.username)}`,
        type: "popup",
        width: 525,
        height: 525,
      });
    }
  });
  