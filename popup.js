import CONFIG from "./config.js";

document.addEventListener("DOMContentLoaded", () => 
{
  const lastUserData = JSON.parse(localStorage.getItem("lastUserData"));
  const lastUsernames = JSON.parse(localStorage.getItem("lastUsernames")) || [];

  if (lastUserData) {
    document.getElementById("username").value = lastUserData.username;
    document.getElementById("results").innerHTML = lastUserData.resultsHTML;
  }

  setupAutocomplete(lastUsernames);
});

document.getElementById("getActivity").addEventListener("click", async () => 
{
  const username = document.getElementById("username").value.trim();
  const resultsDiv = document.getElementById("results");

  if (!username) 
  {
    resultsDiv.textContent = "Please enter a username.";
    return;
  }

  try 
  {
    resultsDiv.textContent = "Fetching activity...";
    const response = await fetch(`${CONFIG.BACKEND_URL}/get_user_activity?username=${username}`);
    const data = await response.json();

    if (data.error) 
    {
      resultsDiv.textContent = `Error: ${data.error}`;
    } 
    else 
    {
      const resultsHTML = 
      `
        <span><strong>Account Created:</strong> ${data.account_creation_date}</span><br/>
        <span><strong>Total Posts:</strong> ${data.total_posts}</span><br/>
        <span><strong>Total Comments:</strong> ${data.total_comments}</span><br/>
        <span><strong>Average Posts Per Day (since account creation):</strong> ${data.average_posts_per_day_account_age}</span><br/>
        <span><strong>Average Comments Per Day (since account creation):</strong> ${data.average_comments_per_day_account_age}</span><br/><br/>
        <span><strong>Account Active Between:</strong> ${data.first_activity_date} - ${data.last_activity_date}</span><br/>
        <span><strong>Average Posts Per Day (active period):</strong> ${data.average_posts_per_day_active_period}</span><br/>
        <span><strong>Average Posts Per Day (active period):</strong> ${data.average_comments_per_day_active_period}</span><br/><br/>
        <span><strong>Active Subreddits by Post (Top 15, Total ${data.unique_subreddit_posts}):</strong></span><br/>
        <ul>
          ${data.top_subreddits_by_posts.map(
            (comment) =>
              `<li>\tCount: ${comment.count} | Percentage: ${comment.percentage} | Subreddit: ${comment.subreddit}</li>`
          ).join("")}
        </ul>
        <span><strong>Active Subreddits by Comments (Top 15, Total ${data.unique_subreddit_comments}):</strong></span>
        <ul>
          ${data.top_subreddits_by_comments.map(
            (comment) =>
              `<li>\tCount: ${comment.count} | Percentage: ${comment.percentage} | Subreddit: ${comment.subreddit}</li>`
          ).join("")}
        </ul>
        <span><strong>Top 5 Most Upvoted Comments:</strong></span><br/>
        <ul>
          ${data.top_upvoted_comments
            .map(
              (comment) =>
                `<li>Score: ${comment.score} | Date: ${comment.date} | Subreddit: ${comment.subreddit}<br/>
                Content: ${comment.content}</li><br/>`
            )
            .join("")}
        </ul>
        <span><strong>Top 5 Most Downvoted Comments:</strong></span><br/>
        <ul>
          ${data.top_downvoted_comments
            .map(
              (comment) =>
                `<li>Score: ${comment.score} | Date: ${comment.date} | Subreddit: ${comment.subreddit}<br/>
                Content: ${comment.content}</li><br/>`
            )
            .join("")}
        </ul>
      `;

      resultsDiv.innerHTML = resultsHTML;
      saveToLocalStorage(username, resultsHTML);
    }
  } 
  catch (err) 
  {
    resultsDiv.textContent = `Error: ${err.message}`;
  }
});

function saveToLocalStorage(username, resultsHTML) 
{
  const lastUserData = { username, resultsHTML };
  localStorage.setItem("lastUserData", JSON.stringify(lastUserData));

  const lastUsernames = JSON.parse(localStorage.getItem("lastUsernames")) || [];
  if (!lastUsernames.includes(username)) 
  {
    lastUsernames.unshift(username);
    if (lastUsernames.length > 10) 
    {
      lastUsernames.pop();
    }
  }
  localStorage.setItem("lastUsernames", JSON.stringify(lastUsernames));
  setupAutocomplete(lastUsernames);
}

function setupAutocomplete(lastUsernames) 
{
  const inputField = document.getElementById("username");
  let autocompleteList = document.getElementById("autocompleteList");

  if (!autocompleteList) 
  {
    autocompleteList = document.createElement("ul");
    autocompleteList.id = "autocompleteList";
    autocompleteList.style.position = "absolute";
    autocompleteList.style.background = "#fff";
    autocompleteList.style.border = "1px solid #ccc";
    autocompleteList.style.width = `${inputField.offsetWidth}px`;
    autocompleteList.style.maxHeight = "150px";
    autocompleteList.style.overflowY = "auto";
    autocompleteList.style.zIndex = "1000";
    autocompleteList.style.listStyle = "none";
    autocompleteList.style.padding = "0";
    autocompleteList.style.margin = "0";
    autocompleteList.style.display = "none";
    document.body.appendChild(autocompleteList);
  }

  const rect = inputField.getBoundingClientRect();
  autocompleteList.style.top = `${rect.bottom + window.scrollY}px`;
  autocompleteList.style.left = `${rect.left + window.scrollX}px`;

  autocompleteList.innerHTML = lastUsernames
    .map(
      (username, index) =>
        `<li tabindex="0" data-index="${index}" style="padding: 5px; cursor: pointer;">${username}</li>`
    )
    .join("");

  let activeIndex = -1;
  inputField.addEventListener("focus", () => 
  {
    autocompleteList.style.display = lastUsernames.length ? "block" : "none";
    activeIndex = -1;
  });

  inputField.addEventListener("keydown", (e) => 
  {
    const items = Array.from(autocompleteList.children);

    if (e.key === "ArrowDown") 
    {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      items[activeIndex].focus();
    } 
    else if (e.key === "Enter" && activeIndex >= 0) 
    {
      e.preventDefault();
      inputField.value = items[activeIndex].textContent;
      autocompleteList.style.display = "none";
    }
    else if (e.key === "Enter") 
    {
      e.preventDefault();
      autocompleteList.style.display = "none";
    }  
  });

  autocompleteList.addEventListener("click", (e) => 
  {
    if (e.target.tagName === "LI") 
    {
      inputField.value = e.target.textContent;
      autocompleteList.style.display = "none";
    }
  });

  autocompleteList.addEventListener("keydown", (e) => 
  {
    const items = Array.from(autocompleteList.children);

    if (e.key === "Tab" || e.key === "ArrowDown") 
    {
      e.preventDefault(); 
      const focusedElement = document.activeElement;

      if (focusedElement.tagName === "LI") 
      {
        const currentIndex = items.indexOf(focusedElement);
        const nextIndex = (currentIndex + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        items[nextIndex].focus();
      } 
      else 
      {
        items[0].focus();
      }
    } 
    else if (e.key === "ArrowUp") 
    {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      items[activeIndex].focus();
    } 
    else if (e.key === "Enter") 
    {
      e.preventDefault();
      inputField.value = e.target.textContent;
      autocompleteList.style.display = "none";
    } 
    else if (e.key === "`") 
    {
      e.preventDefault();
      autocompleteList.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => 
  {
    if (!autocompleteList.contains(e.target) && e.target !== inputField) 
    {
      autocompleteList.style.display = "none";
    }
  });
}
