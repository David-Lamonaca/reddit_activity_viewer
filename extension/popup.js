import CONFIG from "./config.js";

document.addEventListener("DOMContentLoaded", () => 
{
  const params = new URLSearchParams(window.location.search);
  const username = params.get("username");
  const usernameInput = document.getElementById("username");
  const getActivityButton = document.getElementById("getActivity");

  const lastUserData = JSON.parse(localStorage.getItem("lastUserData"));
  const lastUsernames = JSON.parse(localStorage.getItem("lastUsernames")) || [];

  if (username) 
  {
    usernameInput.value = username;
    getActivityButton.click();
  }
  else if (lastUserData) 
  {
    document.getElementById("username").value = lastUserData.username;
    document.getElementById("results").innerHTML = lastUserData.resultsHTML;
    addAccordionEventListeners();
  }

  setupAutocomplete(lastUsernames);
});

document.getElementById("getActivity").addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const resultsDiv = document.getElementById("results");
  const loadingSpinner = document.getElementById("loadingSpinner");

  if (!username) {
      resultsDiv.textContent = "Please enter a username.";
      return;
  }

  try {
      resultsDiv.textContent = ""; // Clear results
      loadingSpinner.style.display = "block"; // Show loading spinner
      resultsDiv.style.display = "none";

      const response = await fetch(`${CONFIG.BACKEND_URL}/get_user_activity?username=${username}`);
      const data = await response.json();

      loadingSpinner.style.display = "none"; // Hide spinner
      resultsDiv.style.display = "block";

      if (data.error) {
          resultsDiv.textContent = `Error: ${data.error}`;
      } else {
          const resultsHTML = createAccordion(data);
          resultsDiv.innerHTML = resultsHTML;
          saveToLocalStorage(username, resultsHTML);
          addAccordionEventListeners();
      }
  } catch (err) {
      loadingSpinner.style.display = "none"; // Hide spinner
      resultsDiv.textContent = `Error: ${err.message}`;
  }
});

function createAccordion(data) 
{
    let accordionHTML = '';

    // Overall Data Section
    accordionHTML += createAccordionItem('Overall Data', 
      `
        <br/><span>Account Created: ${data.overall_data.date}</span><br/>
        <span>Total Posts: ${data.overall_data.total_posts}</span><br/>
        <span>Total Comments: ${data.overall_data.total_comments}</span><br/>
        <span>Avg Posts Per Day: ${data.overall_data.avg_posts_per_day}</span><br/>
        <span>Avg Comments Per Day: ${data.overall_data.avg_comments_per_day}</span>
        ${createSubredditList(`Subreddits by Posts (Top 10, Total ${data.overall_data.unique_subreddits_posts})`, data.overall_data.top_subreddits_by_posts)}
        ${createSubredditList(`Subreddits by Comments (Top 10, Total ${data.overall_data.unique_subreddits_comments})`, data.overall_data.top_subreddits_by_comments)}
    `);

    // Yearly Stats Section
    data.yearly_stats.forEach(yearData => 
    {
      accordionHTML += createAccordionItem(`Year: ${yearData.date}`, 
      `
        <br/><span>Total Posts: ${yearData.total_posts}</span><br/>
        <span>Total Comments: ${yearData.total_comments}</span><br/>
        <span>Avg Posts Per Day: ${yearData.avg_posts_per_day}</span><br/>
        <span>Avg Comments Per Day: ${yearData.avg_comments_per_day}</span>
        ${createSubredditList(`Subreddits by Posts (Top 10, Total ${yearData.unique_subreddits_posts})`, yearData.top_subreddits_by_posts)}
        ${createSubredditList(`Subreddits by Comments (Top 10, Total ${yearData.unique_subreddits_comments})`, yearData.top_subreddits_by_comments)}
      `);
    });

    // Top Upvoted Comments
    accordionHTML += createAccordionItem('Top Upvoted Comments', data.top_upvoted_comments.map(comment => 
      `
        <p><strong>${comment.subreddit} : ${comment.score} Upvotes</strong></p>
        <p>${comment.content}</p>
    `).join(''));

    // Top Downvoted Comments
    accordionHTML += createAccordionItem('Top Downvoted Comments', data.top_downvoted_comments.map(comment => 
      `
        <p><strong>${comment.subreddit} : ${comment.score} Downvotes</strong></p>
        <p>${comment.content}</p>
    `).join(''));

    // Most Used Words
    accordionHTML += createAccordionItem('Most Used Words', data.most_used_words.map(word => 
      `
        <p>${word.word} : ${word.count} occurrences</p>
    `).join(''));

    return accordionHTML;
}

function createAccordionItem(title, content) {
    return `
        <div class="accordion-item">
            <button class="accordion-button" tabindex="0">${title}</button>
            <div class="accordion-content">${content}</div>
        </div>
    `;
}

function createSubredditList(title, subreddits) {
    return `
        <h4>${title}</h4>
        <ul>
            ${subreddits.map(subreddit => `
                <li>${subreddit.subreddit} (${subreddit.count} posts, ${subreddit.percentage}% of total)</li>
            `).join('')}
        </ul>
    `;
}

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

      const firstAccordionButton = document.querySelector('.accordion-button');
      const usernameInput = document.getElementById("username");
      if (firstAccordionButton) 
      {
        firstAccordionButton.focus();
      } 
      else if (usernameInput) 
      {
        usernameInput.focus();
      }
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

function addAccordionEventListeners() {
  // Find all the accordion buttons
  const accordionButtons = document.querySelectorAll('.accordion-button');

  // Add a click event to each button
  accordionButtons.forEach(button => {
      button.addEventListener('click', function () {
          const accordionItem = this.closest('.accordion-item');
          const content = accordionItem.querySelector('.accordion-content');

          // Toggle the active class and visibility
          accordionItem.classList.toggle('active');
      });
  });
}