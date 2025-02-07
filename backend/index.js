import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { LRUCache } from "lru-cache";
import cors from "cors";
import { RedditCreds, RedditComment, MostUsedWord, TopSubreddit, DataSummary, Result } from './RedditModels.js';

if (process.env.NODE_ENV !== "production") 
{
  dotenv.config();
}

const app = express();
app.use(cors());

const { 
  CLIENT_IDS, 
  CLIENT_SECRETS, 
  USER_AGENTS, 
  HOST, 
  PORT, 
  STOP_WORDS 
} = process.env;

const clientIds = CLIENT_IDS.split(",");
const clientSecrets = CLIENT_SECRETS.split(",");
const userAgents = USER_AGENTS.split(",");
if (clientIds.length !== clientSecrets.length || clientIds.length !== userAgents.length) 
{
  throw new Error("CLIENT_ID, CLIENT_SECRET, and USER_AGENT must have the same number of values.");
}

const CREDENTIALS = clientIds.map((id, index) => new RedditCreds(id, clientSecrets[index], userAgents[index]));
let credIndex = 0;
const getNextCreds = () => 
{
  const creds = CREDENTIALS[credIndex];
  credIndex = (credIndex + 1) % CREDENTIALS.length;
  return creds;
};

const cache = new LRUCache
({
  max: 200,
  maxSize: 20 * 1024 * 1024,
  sizeCalculation: (value, key) => JSON.stringify(value).length + key.length,
  ttl: 1000 * 60 * 30,
});

const fetchPaginatedData = async (url, token, userAgent) => 
{
  let after = null;
  const allData = [];

  while (true) 
  {
    const { data: response } = await axios.get(url, 
    {
      headers: 
      {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgent,
      },
      params: { limit: 100, after },
    });

    const newItems = response.data.children.map(({ data }) => data);
    allData.push(...newItems);
    after = response.data.after;
    if (!after) break;
  }
  return allData;
};

const fetchRedditUserData = async (username) => 
{
  try 
  {
    const cred = getNextCreds();
    const { data: tokenResponse } = await axios.post
    (
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        auth: { username: cred.ClientID, password: cred.ClientSecret },
        headers: { "User-Agent": cred.UserAgent },
      }
    );

    const token = tokenResponse.access_token;
    const [userResponse, submissions, comments] = await Promise.all
    ([
      axios.get(`https://oauth.reddit.com/user/${username}/about`, {
        headers: 
        {
          Authorization: `Bearer ${token}`,
          "User-Agent": cred.UserAgent,
        },
      }),
      fetchPaginatedData
      (
        `https://oauth.reddit.com/user/${username}/submitted`,
        token,
        cred.UserAgent
      ),
      fetchPaginatedData
      (
        `https://oauth.reddit.com/user/${username}/comments`,
        token,
        cred.UserAgent
      ),
    ]);
    return { userData: userResponse.data, submissions, comments };
  } 
  catch (error) 
  {
    throw new Error(error.response?.data?.message || "Failed to fetch user data");
  }
};

const formatDate = (timestamp) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(
    new Date(timestamp)
  );

const getTopWords = (texts, limit = 10) => 
{
  const stopWords = new Set(STOP_WORDS ? STOP_WORDS.split(",") : []);
  const wordCounts = {};
  const words = texts.join(" ").toLowerCase().match(/\b\w{3,}\b/g) || [];

  words.forEach((word) => 
  {
    if (!stopWords.has(word)) 
    {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });

  return Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([word, count]) => new MostUsedWord(word, count));
};

const processUserData = (userData, submissions, comments) => 
{
  const accountCreationDate = new Date(userData.data.created_utc * 1000);
  const totalPosts = submissions.length;
  const totalComments = comments.length;

  const allTexts = [...submissions.map(({ title }) => title), ...comments.map(({ body }) => body)];
  const topWords = getTopWords(allTexts);

  const currentYear = new Date().getFullYear();
  const accountAgeDays = Math.ceil((Date.now() - accountCreationDate) / (1000 * 60 * 60 * 24));

  const yearlyData = {};
  const subredditPostCounts = {};
  const subredditCommentCounts = {};
  const uniqueSubredditsPosts = new Set();
  const uniqueSubredditsComments = new Set();

  const processActivity = (items, type) => 
  {
    items.forEach(({ created_utc, subreddit }) => 
    {
      const year = new Date(created_utc * 1000).getFullYear();
      if (!yearlyData[year]) 
      {
        yearlyData[year] = 
        {
          posts: 0,
          comments: 0,
          subredditPosts: {},
          subredditComments: {},
          uniqueSubredditsPosts: new Set(),
          uniqueSubredditsComments: new Set(),
        };
      }
      yearlyData[year][type]++;
      yearlyData[year][`subreddit${type.charAt(0).toUpperCase() + type.slice(1)}`][subreddit] =
        (yearlyData[year][`subreddit${type.charAt(0).toUpperCase() + type.slice(1)}`][subreddit] || 0) + 1;

      if (type === "posts") 
      {
        subredditPostCounts[subreddit] = (subredditPostCounts[subreddit] || 0) + 1;
        uniqueSubredditsPosts.add(subreddit);
        yearlyData[year].uniqueSubredditsPosts.add(subreddit);
      }
      else if (type === "comments") 
      {
        subredditCommentCounts[subreddit] = (subredditCommentCounts[subreddit] || 0) + 1;
        uniqueSubredditsComments.add(subreddit);
        yearlyData[year].uniqueSubredditsComments.add(subreddit);
      }
    });
  };
  processActivity(submissions, "posts");
  processActivity(comments, "comments");

  const sortedSubredditsByPosts = Object.entries(subredditPostCounts)
    .map(([subreddit, count]) => 
    {
      const subredditInstance = new TopSubreddit(subreddit, count);
      subredditInstance.calculatePercentage(totalPosts);
      return subredditInstance;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const sortedSubredditsByComments = Object.entries(subredditCommentCounts)
    .map(([subreddit, count]) => 
    {
      const subredditInstance = new TopSubreddit(subreddit, count);
      subredditInstance.calculatePercentage(totalComments);
      return subredditInstance;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const dataSummary = new DataSummary
  (
    formatDate(accountCreationDate),
    totalPosts,
    totalComments,
    (totalPosts / accountAgeDays).toFixed(4),
    (totalComments / accountAgeDays).toFixed(4),
    uniqueSubredditsPosts.size,
    uniqueSubredditsComments.size,
    sortedSubredditsByPosts,
    sortedSubredditsByComments
  );

  const yearlyStats = Object.keys(yearlyData).map((year) => 
  {
    const yearAgeDays =
      (year == currentYear ? Date.now() : new Date(year, 11, 31)) - new Date(year, 0, 1);
    const daysInYear = Math.ceil(yearAgeDays / (1000 * 60 * 60 * 24));

    const yearlyInstance = new DataSummary
    (
      year.toString(),
      yearlyData[year].posts,
      yearlyData[year].comments,
      (yearlyData[year].posts / daysInYear).toFixed(4),
      (yearlyData[year].comments / daysInYear).toFixed(4),
      yearlyData[year].uniqueSubredditsPosts.size,
      yearlyData[year].uniqueSubredditsComments.size,
      Object.entries(yearlyData[year].subredditPosts)
        .map(([subreddit, count]) => 
        {
          const subredditInstance = new TopSubreddit(subreddit, count);
          subredditInstance.calculatePercentage(yearlyData[year].posts);
          return subredditInstance;
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      Object.entries(yearlyData[year].subredditComments)
        .map(([subreddit, count]) => 
        {
          const subredditInstance = new TopSubreddit(subreddit, count);
          subredditInstance.calculatePercentage(yearlyData[year].comments);
          return subredditInstance;
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    );
    return yearlyInstance;
  });

  const result = new Result
  (
    dataSummary,
    yearlyStats,
    comments
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, created_utc, subreddit, body }) => new RedditComment(score, created_utc, subreddit, body)),
    comments
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(({ score, created_utc, subreddit, body }) => new RedditComment(score, created_utc, subreddit, body)),
    topWords
  );
  return result;
};

app.get("/get_user_activity", async (req, res) => 
{
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: "Username is required" });

  try 
  {
    if (cache.has(username)) return res.json(cache.get(username));

    const { userData, submissions, comments } = await fetchRedditUserData(username);
    const result = processUserData(userData, submissions, comments);

    cache.set(username, result);
    res.json(result);
  } 
  catch (error) 
  {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, HOST, () => console.log(`Server running at http://${HOST}:${PORT}`));
