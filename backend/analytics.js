/* 
    processUserData + stats logic
*/
import { formatDate } from "./utilities.js";

/**
 * Scans for the most used words.
 * Filtering out common words (how, why, if)
 */
export function getTopWords(texts = [], stopWords = [], limit = 10) 
{
    const stopSet = new Set(stopWords.map(w => w.toLowerCase()));
    const wordCount = {};

    const words = texts
    .join(" ")
    .toLowerCase()
    .match(/\b(?:[a-zA-Z]+(?:'[a-zA-Z]+)?|[a-zA-Z]+(?:-[a-zA-Z]+)+)\b/g) || [];

    for (const word of words) 
    {
        if (!stopSet.has(word)) 
        {
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
    }

    return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word, count]) => ({ word, count }));
}

/**
 * Permalink builder for comments.
 * prefer c.permalink when available; fallback to link_id + id.
 */
const buildCommentPermalink = (c) => 
{
  if (c.permalink) 
  {
    // permalink typically begins with '/r/...'
    return c.permalink.startsWith("http")
      ? c.permalink
      : `https://reddit.com${c.permalink}`;
  }

  const postId = (c.link_id || "").replace(/^t3_/, "");
  const commentId = c.id || "";

  if (postId && commentId) 
  {
    return `https://reddit.com/r/${c.subreddit}/comments/${postId}/_/${commentId}`;
  }

  // last-resort: link to user profile (Kinda useless, but it is what it is)
  return `https://reddit.com/user/${c.author || ""}`;
};

/**
 * CORE ANALYTICS
 * p
 */
export function processUserData(userData, submissions = [], comments = [], stopWords = []) 
{
    const currentYear = today.getFullYear();
    const accountCreationDate = new Date(userData.data.created_utc * 1000);

    const totalPosts = submissions.length;
    const totalComments = comments.length;

    const today = new Date();
    const accountAgeDays = Math.max(
        1,
        Math.ceil((today - accountCreationDate) / (1000 * 60 * 60 * 24))
    );

    /* ---------- TEXT SCANNING ---------- */
    const allTexts = 
    [
        ...submissions.map(p => p.title || ""),
        ...comments.map(c => c.body || "")
    ];
    const mostUsedWords = getTopWords(allTexts, stopWords);

    /* ---------- BUCKETS ---------- */
    const yearlyData = {};
    const last7DaysData = {};
    const subredditTotals = {};

    /* ---------- ACTIVITY PROCESSOR ---------- */
    function process(items, type) 
    {
        for (const item of items) 
        {
            const created = new Date(item.created_utc * 1000);
            const subreddit = item.subreddit || "unknown";
            const year = created.getFullYear();

            let dateLabel = created.toDateString();
            const daysAgo = Math.floor((today - created) / (1000 * 60 * 60 * 24));

            if (daysAgo === 0)
            {
                dateLabel = "Today";
            } 
            else if (daysAgo === 1) 
            {
                dateLabel = "Yesterday";
            } 

            /* --- Last 7 Days --- */
            if (daysAgo < 7) 
            {
                last7DaysData[dateLabel] ||= 
                {
                    date: dateLabel,
                    posts: 0,
                    comments: 0,
                    subredditTotals: {}
                };

                last7DaysData[dateLabel][type]++;
                last7DaysData[dateLabel].subredditTotals[subreddit] = (last7DaysData[dateLabel].subredditTotals[subreddit] || 0) + 1;
            }

            /* --- Yearly --- */
            yearlyData[year] ||= 
            {
                posts: 0,
                comments: 0,
                subredditTotals: {}
            };

            yearlyData[year][type]++;
            yearlyData[year].subredditTotals[subreddit] = (yearlyData[year].subredditTotals[subreddit] || 0) + 1;

            /* --- Overall --- */
            subredditTotals[subreddit] = (subredditTotals[subreddit] || 0) + 1;
        }
    }

    process(submissions, "posts");
    process(comments, "comments");

    /* ---------- TOP SUBREDDITS (OVERALL) ---------- */
    const topSubredditLimit = 5;
    const topSubredditsOverall = Object.entries(subredditTotals)
        .map(([subreddit, count]) => 
        ({
            subreddit,
            count,
            percentage:
            totalPosts + (totalComments === 0)
                ? "0.00"
                : ((count / (totalPosts + totalComments)) * 100).toFixed(2)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topSubredditLimit);

    /* ---------- YEARLY STATS ---------- */
    const yearlyStats = Object.entries(yearlyData).map(([year, data]) => 
    {
        const yearNum = Number(year);

        const yearStart = (yearNum === accountCreationDate.getFullYear())
            ? accountCreationDate
            : new Date(Date.UTC(yearNum, 0, 1));

        const yearEnd = (yearNum === currentYear)
            ? today
            : new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59));

        const daysInYear = Math.max(1,
            Math.ceil((yearEnd - yearStart) / (1000 * 60 * 60 * 24))
        );

        const total = data.posts + data.comments;

        const topActive = Object.entries(data.subredditTotals)
            .map(([subreddit, count]) => 
            ({
                subreddit,
                count,
                percentage: total === 0 ? "0.00" : ((count / total) * 100).toFixed(2)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, topSubredditLimit);

        return {
            date: year,
            total_posts: data.posts,
            total_comments: data.comments,
            avg_posts_per_day: (data.posts / daysInYear).toFixed(4),
            avg_comments_per_day: (data.comments / daysInYear).toFixed(4),
            top_subreddits_active_in: topActive
        };
    });

    /* ---------- LAST 7 DAYS ---------- */
    const lastSevenDays = Object.values(last7DaysData)
    .map(d => 
    {
        const total = d.posts + d.comments;
        const topActive = Object.entries(d.subredditTotals)
            .map(([subreddit, count]) => 
            ({
                subreddit,
                count,
                percentage: total === 0 ? "0.00" : ((count / total) * 100).toFixed(2)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, topSubredditLimit);

        return {
            date: d.date,
            total_posts: d.posts,
            total_comments: d.comments,
            top_subreddits_active_in: topActive
        };
    })
    .sort((a, b) => 
    {
        const p = l => (l === "Today" ? 2 : l === "Yesterday" ? 1 : 0);
        return p(b.date) - p(a.date);
    });

    /* ---------- TOP COMMENTS ---------- */
    const commentLimit = 10;
    const topUpvotedComments = comments
        .slice()
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, commentLimit)
        .map(c => 
        ({
            score: c.score,
            date: formatDate(new Date(c.created_utc * 1000)),
            subreddit: c.subreddit,
            content: c.body,
            link: buildCommentPermalink(c)
        }));

    const topDownvotedComments = comments
        .slice()
        .sort((a, b) => (a.score || 0) - (b.score || 0))
        .slice(0, commentLimit)
        .map(c => 
        ({
            score: c.score,
            date: formatDate(new Date(c.created_utc * 1000)),
            subreddit: c.subreddit,
            content: c.body,
            link: buildCommentPermalink(c)
        }));

    return {
        overall_data: 
        {
            total_posts: totalPosts,
            total_comments: totalComments,
            avg_posts_per_day: (totalPosts / accountAgeDays).toFixed(4),
            avg_comments_per_day: (totalComments / accountAgeDays).toFixed(4)
        },
        lastSevenDays,
        most_used_words: mostUsedWords,
        top_upvoted_comments: topUpvotedComments,
        top_downvoted_comments: topDownvotedComments,
        yearly_stats: yearlyStats,
        top_subreddits_active_in: topSubredditsOverall
    };
}
