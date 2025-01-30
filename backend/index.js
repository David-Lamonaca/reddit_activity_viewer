import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { LRUCache } from "lru-cache";
import cors from "cors";

if (process.env.NODE_ENV !== "production") 
{
  dotenv.config();
}

const app = express();
app.use(cors());
const {
  CLIENT_ID: clientId,
  CLIENT_SECRET: clientSecret,
  USER_AGENT: userAgent,
  HOST: host,
  PORT: port,
} = process.env;

const cache = new LRUCache({
  max: 100,
  maxSize: 20 * 1024 * 1024, 
  sizeCalculation: (value, key) => JSON.stringify(value).length + key.length,
  ttl: 1000 * 60 * 20, 
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fetchPaginatedData = async (url, token, userAgent) => 
{
  const fetchPage = async (after) => 
  {
    console.log(`Fetching page with after: ${after}`);
    const { data: responseData } = await axios.get(url, 
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgent,
      },
      params: {
        limit: 100,
        after,
      },
    });
    return responseData;
  };

  let after = null;
  const allData = [];

  while (true) 
  {
    const response = await fetchPage(after);

    const newItems = response.data.children.map(({ data }) => data);
    console.log(`Fetched ${newItems.length} items.`);
    allData.push(...newItems);

    after = response.data.after;
    if (!after) 
    {
      console.log("No more pages to fetch.");
      break;
    }

    await delay(500);
  }

  console.log(`Total fetched items: ${allData.length}`);
  return allData;
};

const fetchRedditUserData = async (username) => 
{
  try 
  {
    console.log("Requesting Reddit API token...");
    const { data: tokenResponse } = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        auth: { username: clientId, password: clientSecret },
        headers: { "User-Agent": userAgent },
      }
    );

    const token = tokenResponse.access_token;
    console.log("Token received.");

    const [userResponse, submissions, comments] = await Promise.all([
      axios.get(`https://oauth.reddit.com/user/${username}/about`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": userAgent,
        },
      }),
      fetchPaginatedData(
        `https://oauth.reddit.com/user/${username}/submitted`,
        token,
        userAgent
      ),
      fetchPaginatedData(
        `https://oauth.reddit.com/user/${username}/comments`,
        token,
        userAgent
      ),
    ]);

    return { userData: userResponse.data, submissions, comments };
  } 
  catch (error) 
  {
    console.error("Error fetching Reddit user data:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to fetch user data");
  }
};

const calculatePercentage = (part, total) =>
  total === 0 ? "0.00%" : `${((part / total) * 100).toFixed(2)}%`;

const formatDate = (timestamp) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp));

app.get("/get_user_activity", async (req, res) => 
{
  const { username } = req.query;
  if (!username) 
  {
    return res.status(400).json({ error: "Username is required" });
  }

  try 
  {
    if (cache.has(username)) 
    {
      console.log(`Cache hit for username: ${username}`);
      return res.json(cache.get(username));
    }

    console.log(`Cache miss for username: ${username}. Fetching data...`);
    const { userData, submissions, comments } = await fetchRedditUserData(username);

    const accountCreationDate = new Date(userData.data.created_utc * 1000);
    const totalPosts = submissions.length;
    const totalComments = comments.length;

    const currentDate = new Date();
    const accountAgeDays = Math.ceil(
      (currentDate - accountCreationDate) / (1000 * 60 * 60 * 24)
    );

    const allActivity = [...submissions, ...comments];
    const firstActivityDate = allActivity.length
      ? new Date(Math.min(...allActivity.map(({ created_utc }) => created_utc * 1000)))
      : null;

    const lastActivityDate = allActivity.length
      ? new Date(Math.max(...allActivity.map(({ created_utc }) => created_utc * 1000)))
      : null;

    const activePeriodDays =
      firstActivityDate && lastActivityDate
        ? Math.ceil((lastActivityDate - firstActivityDate) / (1000 * 60 * 60 * 24)) + 1
        : 0;

    const subredditPostCounts = submissions.reduce((acc, { subreddit }) => {
      acc[subreddit] = (acc[subreddit] || 0) + 1;
      return acc;
    }, {});

    const subredditCommentCounts = comments.reduce((acc, { subreddit }) => {
      acc[subreddit] = (acc[subreddit] || 0) + 1;
      return acc;
    }, {});

    const sortedSubredditsByPosts = Object.entries(subredditPostCounts)
      .map(([subreddit, count]) => ({
        subreddit,
        count,
        percentage: calculatePercentage(count, totalPosts),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const sortedSubredditsByComments = Object.entries(subredditCommentCounts)
      .map(([subreddit, count]) => ({
        subreddit,
        count,
        percentage: calculatePercentage(count, totalComments),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const topUpvotedComments = comments
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, created_utc, subreddit, body }) => ({
        score,
        date: formatDate(created_utc * 1000),
        subreddit,
        content: body,
      }));

    const topDownvotedComments = comments
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(({ score, created_utc, subreddit, body }) => ({
        score,
        date: formatDate(created_utc * 1000),
        subreddit,
        content: body,
      }));

    const result = 
    {
      account_creation_date: formatDate(accountCreationDate),
      total_posts: totalPosts,
      total_comments: totalComments,
      unique_subreddit_posts: Object.entries(subredditPostCounts).length,
      unique_subreddit_comments: Object.entries(subredditCommentCounts).length,
      average_posts_per_day_account_age: (totalPosts / accountAgeDays).toFixed(4),
      average_comments_per_day_account_age: (totalComments / accountAgeDays).toFixed(4),
      first_activity_date: firstActivityDate ? formatDate(firstActivityDate) : "N/A",
      last_activity_date: lastActivityDate ? formatDate(lastActivityDate) : "N/A",
      average_posts_per_day_active_period: (totalPosts / activePeriodDays || 0).toFixed(4),
      average_comments_per_day_active_period: (totalComments / activePeriodDays || 0).toFixed(4),
      top_subreddits_by_posts: sortedSubredditsByPosts,
      top_subreddits_by_comments: sortedSubredditsByComments,
      top_upvoted_comments: topUpvotedComments,
      top_downvoted_comments: topDownvotedComments,
    };

    console.log("Caching result...");
    cache.set(username, result);
    res.json(result);
  } 
  catch (error) 
  {
    console.error("Error processing request:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, host, () =>
  console.log(`Server running at http://${host}:${port}`)
);
