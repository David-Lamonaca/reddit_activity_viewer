import CONFIG from "./config.js";

document.addEventListener("DOMContentLoaded", () => 
{
  const params = new URLSearchParams(window.location.search);
  const usernameParam = params.get("username");

  const lastUserData = JSON.parse(localStorage.getItem("lastUserData"));
  const lastUsernames = JSON.parse(localStorage.getItem("lastUsernames")) || [];

  if (usernameParam) 
  {
    usernameInput.value = usernameParam;
    getActivityButton.click();
  }
  else if (lastUserData) 
  {
    document.getElementById("username").value = lastUserData.username;
    document.getElementById("accSummary").innerHTML = lastUserData.data.summaryHTML;
    document.getElementById("accSummary").style.display = "block";
    document.getElementById("results").innerHTML = lastUserData.data.resultsHTML;
    addAccordionEventListeners();
  }

  setupAutocomplete(lastUsernames);
});

const usernameInput = document.getElementById("username");
const getActivityButton = document.getElementById("getActivity");
const resultsDiv = document.getElementById("results");
const accSummary = document.getElementById("accSummary");
const loadingSpinner = document.getElementById("loadingSpinner");

const errorBanner = document.getElementById("errorBanner");
const errorBannerText = document.getElementById("errorBannerText");
const errorBannerClose = document.getElementById("errorBannerClose");

function showErrorBanner(message, autoHide = false) 
{
  errorBannerText.textContent = message;
  errorBanner.classList.remove("hidden");

  if (autoHide) 
  {
    clearTimeout(showErrorBanner._timer);
    showErrorBanner._timer = setTimeout(hideErrorBanner, 6000);
  }
}

function hideErrorBanner() 
{
  errorBanner.classList.add("hidden");
}

errorBannerClose.addEventListener("click", hideErrorBanner);

const fields = {
  created: document.getElementById("accCreated"),
  totalPosts: document.getElementById("accTotalPosts"),
  totalComments: document.getElementById("accTotalComments"),
  avgPosts: document.getElementById("accAvgPostsDay"),
  avgComments: document.getElementById("accAvgCommentsDay"),
  postKarma: document.getElementById("accPostKarma"),
  commentKarma: document.getElementById("accCommentKarma"),
  status: document.getElementById("accStatus"),
  tooltip: document.getElementById("accStatusTooltip"),
};

document.getElementById("getActivity").addEventListener("click", async () => 
{
  const username = document.getElementById("username").value.trim();
  if (!username) 
  {
      resultsDiv.textContent = "Please enter a username.";
      return;
  }

  resetSummaryUI();
  hideErrorBanner();

  try 
  {
      /* ---------- SUMMARY ---------- */
      const summaryRes = await fetch(`${CONFIG.BACKEND_URL}/get_user_summary?username=${username}`);
      if (summaryRes.status === 404) 
      {
        setDeletedUserState();
        return; 
      }

      if (summaryRes.ok === false) 
      {
        showErrorBanner(`Failed to fetch user summary ${summaryRes}. Please try again.`);
        loadingSpinner.style.display = "none";
        resultsDiv.style.display = "block";
        setEmptyActivityData();
        return;
      }

      const summaryData = await summaryRes.json();
      populateSummary(summaryData);
     
      /* ---------- ACTIVITY ---------- */
      const activityRes = await fetch(`${CONFIG.BACKEND_URL}/get_user_activity?username=${username}`);
      if (activityRes.status === 404) 
      {
        setDeletedUserState();
        return; 
      }

      if (activityRes.ok == false) 
      {
        showErrorBanner(`Failed to fetch user activity (${activityRes.status}). Please try again.`);
        loadingSpinner.style.display = "none";
        resultsDiv.style.display = "block";
        setEmptyActivityData();
        return;
      }
      
      const activityData = await activityRes.json();
      loadingSpinner.style.display = "none";
      resultsDiv.style.display = "block";

      const resultsHTML = createAccordion(activityData);
      resultsDiv.innerHTML = resultsHTML;

      fields.totalPosts.textContent = activityData.overall_data.total_posts ?? "—";
      fields.totalComments.textContent = activityData.overall_data.total_comments ?? "—";
      fields.avgPosts.textContent = activityData.overall_data.avg_posts_per_day ?? "—";
      fields.avgComments.textContent = activityData.overall_data.avg_comments_per_day ?? "—";

      let summaryHTML = accSummary.innerHTML;

      saveToLocalStorage(username, {summaryHTML, resultsHTML});
      addAccordionEventListeners();
      
    } 
    catch (err) 
    {
        loadingSpinner.style.display = "none";
        resultsDiv.style.display = "block";
        showErrorBanner(`Error: ${err.message}`);
        setEmptyActivityData();
    }
});

function createAccordion(data) 
{
    let accordionHTML = '';

    // Last 7 Days
    accordionHTML += createAccordionItem('Last 7 Days', 
      data.lastSevenDays.map(day => 
    `
      <span><strong>${day.date} — ${day.total_posts} Posts — ${day.total_comments} Comments</strong></span>
       ${createSubredditList("Most Active In", day.top_subreddits_active_in)}
    `)
    .join(''));

    // Most Used Words
    accordionHTML += createAccordionItem('Most Used Words', 
      data.most_used_words.map(word => 
    `
      <p>${word.word} : ${word.count} occurrences</p>
    `)
    .join(''));

    // Top Upvoted Comments
    accordionHTML += createAccordionItem(
    "Top Upvoted Comments",
    data.top_upvoted_comments.map(c => `
      <div class="comment-header">
        <strong>${c.subreddit} (${c.score})</strong>
        <a class="comment-link" href="${c.link}" target="_blank">View Comment</a>
      </div>
      <p class="comment-body">${c.content}</p>
    `).join("")
  );

    // Top Downvoted Comments
    accordionHTML += createAccordionItem(
    "Top Downvoted Comments",
    data.top_downvoted_comments.map(c => `
      <div class="comment-header">
        <strong>${c.subreddit} (${c.score})</strong>
        <a class="comment-link" href="${c.link}" target="_blank">View Comment</a>
      </div>
      <p class="comment-body">${c.content}</p>
    `).join("")
    );

    // Yearly Stats Section
    data.yearly_stats.forEach(yearData => 
    {
      accordionHTML += createAccordionItem(
        `Year: ${yearData.date}`,
        `
          <div class="year-summary-grid">
            <div class="year-summary-item">
              <div class="year-summary-label">Total Posts</div>
              <div class="year-summary-value">${yearData.total_posts}</div>
            </div>

            <div class="year-summary-item">
              <div class="year-summary-label">Total Comments</div>
              <div class="year-summary-value">${yearData.total_comments}</div>
            </div>

            <div class="year-summary-item">
              <div class="year-summary-label">Avg Posts / Day</div>
              <div class="year-summary-value">${yearData.avg_posts_per_day}</div>
            </div>

            <div class="year-summary-item">
              <div class="year-summary-label">Avg Comments / Day</div>
              <div class="year-summary-value">${yearData.avg_comments_per_day}</div>
            </div>
          </div>

          ${createSubredditList("Most Active In", yearData.top_subreddits_active_in)}
        `
      );
    });

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

function saveToLocalStorage(username, data) 
{
  const lastUserData = { username, data };
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

function resetSummaryUI() 
{
  accSummary.style.display = "block";
  loadingSpinner.style.display = "block";
  resultsDiv.style.display = "none";
  resultsDiv.textContent = "";

  Object.values(fields).forEach(el => (el.textContent = "—"));
  fields.tooltip.textContent = "More info on account visibility.";
}

function setDeletedUserState() 
{
  loadingSpinner.style.display = "none";
  resultsDiv.style.display = "block";

  fields.status.textContent = "Deleted / Not Found";
  fields.tooltip.textContent =
    "Reddit does not return data for this account.\n" +
    "This usually means the account was deleted or never existed.";

  setEmptyActivityData();
}


function populateSummary(data) 
{
  fields.created.textContent = data.accountCreationDate || "—";
  fields.totalPosts.textContent = data.ttlPosts ?? "—";
  fields.totalComments.textContent = data.ttlComments ?? "—";
  fields.avgPosts.textContent = data.avgPosts ?? "—";
  fields.avgComments.textContent = data.avgComments ?? "—";
  fields.postKarma.textContent = data.linkKarma ?? "—";
  fields.commentKarma.textContent = data.commentKarma ?? "—";
  fields.status.textContent = data.status ?? "—";
  fields.tooltip.textContent = data.toolTip ?? "—";
}

function setEmptyActivityData() {
  const emptyData = {
    overall_data: {
      total_posts: 0,
      total_comments: 0,
      avg_posts_per_day: "0.0000",
      avg_comments_per_day: "0.0000"
    },
    lastSevenDays: [],
    most_used_words: [],
    top_upvoted_comments: [],
    top_downvoted_comments: [],
    yearly_stats: [],
    top_subreddits_active_in: []
  };

  resultsDiv.innerHTML = createAccordion(emptyData);
  addAccordionEventListeners();
}

