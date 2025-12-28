/* 
    Express app, routes, cache creation
*/
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { LRUCache } from "lru-cache";

import {
  getOrCreateCacheEntry
} from "./utilities.js";

import {
  fetchUserInitialSummary,
  fetchRedditUserData
} from "./reddit.js";

import {
  processUserData
} from "./analytics.js";

/* ----------------------------------
   ENV SETUP
----------------------------------- */
if (process.env.NODE_ENV !== "production") 
{
  dotenv.config();
}

const { HOST, PORT, STOP_WORDS } = process.env;

if (!HOST || !PORT) {
  throw new Error("HOST and PORT must be set");
}

/* ----------------------------------
   APP SETUP
----------------------------------- */
const app = express();
app.use(cors());

/* ----------------------------------
   CACHE (kept local — not over-abstracted)
----------------------------------- */
const cache = new LRUCache
({
  max: 300,
  maxSize: 20 * 1024 * 1024, // 20MB
  sizeCalculation: (value, key) =>
    JSON.stringify(value).length + key.length,
  ttl: 1000 * 60 * 30, // 30 minutes
}); 

/* ----------------------------------
   SUMMARY ENDPOINT (FAST)
----------------------------------- */
app.get("/get_user_summary", async (req, res) => 
{
  const { username } = req.query;

  if (!username) 
  {
    return res.status(400).json({ error: "Username is required" });
  }

  try 
  {
    const entry = cache.get(username);
    if (entry?.summary) 
    {
      console.log("Returning cached SUMMARY for:", username);
      return res.json(entry.summary);
    }

    const result = await fetchUserInitialSummary(username);
    if (!result || !result.userSummary) 
    {
      return res
        .status(404)
        .json({ error: `User: ${username} was not found.` });
    }

    const { userSummary } = result;

    const newEntry = getOrCreateCacheEntry(cache, username);
    newEntry.summary = userSummary;
    newEntry.activity ??= null;
    newEntry.lastUpdated = Date.now();

    return res.json(userSummary);
  } 
  catch (err) 
  {
    console.error("get_user_summary error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal error" });
  }
});

  /* ----------------------------------
    ACTIVITY ENDPOINT (HEAVY)
  ----------------------------------- */
app.get("/get_user_activity", async (req, res) => 
{
  const { username } = req.query;

  if (!username) 
  {
    return res.status(400).json({ error: "Username is required" });
  }

  try 
  {
    const entry = getOrCreateCacheEntry(cache, username);
    if (entry.activity) 
    {
      console.log("Returning cached ACTIVITY for:", username);
      return res.json(entry.activity);
    }

    const result = await fetchRedditUserData(username);
    if (!result || !result.userData) 
    {
      return res
        .status(404)
        .json({ error: `User: ${username} was not found.` });
    }

    const {
      userData,
      submissions = [],
      comments = []
    } = result;

    const activityResult = processUserData(
      userData,
      submissions,
      comments,
      STOP_WORDS
    );

    // hydrate summary cache
    entry.summary ??= {};
    entry.summary.ttlPosts = activityResult.overall_data.total_posts;
    entry.summary.ttlComments = activityResult.overall_data.total_comments;
    entry.summary.avgPosts = activityResult.overall_data.avg_posts_per_day;
    entry.summary.avgComments =
      activityResult.overall_data.avg_comments_per_day;

    entry.activity = activityResult;
    entry.lastUpdated = Date.now();

    return res.json(activityResult);
  } 
  catch (err) 
  {
    console.error("get_user_activity error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal error" });
  }
});

app.listen(PORT, HOST, () => 
{
  console.log(`Server running at http://${HOST}:${PORT}`);
});
