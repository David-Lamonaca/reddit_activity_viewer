// Track processed elements
const processedElements = new WeakSet();

function addActivityButtons() {
  // Select all relevant faceplate-tracker elements
  const targetElements = document.querySelectorAll(
    'faceplate-tracker[noun="comment_author"], faceplate-tracker[noun="user_profile"], faceplate-tracker[noun="user"]'
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
    button.style.marginLeft = "5px";
    button.style.cursor = "pointer";
    button.style.background = "transparent";
    button.style.fontSize = "12px";

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
