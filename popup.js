import CONFIG from "./config.js"; // Import the config file

document.getElementById("getActivity").addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const resultsDiv = document.getElementById("results");

  if (!username) {
    resultsDiv.textContent = "Please enter a username.";
    return;
  }

  resultsDiv.textContent = "Fetching activity...";

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/get_user_activity?username=${username}`);
    const data = await response.json();

    if (data.error) {
      resultsDiv.textContent = `Error: ${data.error}`;
    } else {
      resultsDiv.innerHTML = `
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
    }
  } catch (err) {
    resultsDiv.textContent = `Error: ${err.message}`;
  }
});
