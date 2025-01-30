// Track processed elements
const processedElements = new WeakSet();

function addActivityButtons() {
  // Select all relevant faceplate-tracker elements
  const targetElements = document.querySelectorAll(
    'faceplate-tracker[noun="comment_author"]:not(.user-hover-card *), ' +
    'faceplate-tracker[noun="user_profile"]:not(.user-hover-card *), ' +
    'faceplate-tracker[noun="user"]:not(.user-hover-card *)'
  );
  
  targetElements.forEach((element) => {
    // Skip if this element is already processed
    if (processedElements.has(element)) return;

    // Mark this element as processed
    processedElements.add(element);

    // Find the username anchor within the faceplate-tracker
    const usernameAnchor = element.querySelector("a[href*='/user/']");
    if (!usernameAnchor) return; // Skip if no username anchor exists

    // Check if the button already exists
    if (element.querySelector(".activity-button")) return;

    // Extract the username from the anchor text
    const username = usernameAnchor.textContent.trim().replace("u/", "");

    // Create the button
    const button = document.createElement("button");
    button.textContent = "📊";
    button.title = "Get Activity";
    button.className = "activity-button";
    button.style.cursor = "pointer";
    button.style.background = "transparent";
    button.style.fontSize = "12px";

    if (window.location.pathname.includes("/comments/")) 
    {
      button.style.marginLeft = "5px";
    } 
    else if (window.location.pathname.includes("/r/"))
    {
        button.style.position = "absolute";
        button.style.top = "0";
        button.style.left = "calc(100% + 5px)";
    }

    // Add click listener
    button.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        action: "openPopup",
        username: username,
      });
    });

    // Append the button after the username
    usernameAnchor.parentNode.insertBefore(button, usernameAnchor.nextSibling);
  });
}

// Run the function initially to add buttons
addActivityButtons();

// Observe for dynamically added elements
const observer = new MutationObserver(() => addActivityButtons());
observer.observe(document.body, { childList: true, subtree: true });
