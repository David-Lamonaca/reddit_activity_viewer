/* 
    ALL Reddit API concerns 
*/
import axios from "axios";
import dotenv from "dotenv";

import {
  formatDate,
  formatTimeSinceCreation,
  formatNumber
} from "./utilities.js";

/* ----------------------------------
   ENV SETUP
----------------------------------- */
if (process.env.NODE_ENV !== "production") 
{
  dotenv.config();
}

const {
  CLIENT_IDS,
  CLIENT_SECRETS,
  USER_AGENTS,
  STOP_WORDS
} = process.env;

if (!CLIENT_IDS || !CLIENT_SECRETS || !USER_AGENTS) 
{
  throw new Error("CLIENT_IDS, CLIENT_SECRETS, USER_AGENTS must be set");
}

const clientIds = CLIENT_IDS.split(",");
const clientSecrets = CLIENT_SECRETS.split(",");
const userAgents = USER_AGENTS.split(",");

if (clientIds.length !== clientSecrets.length ||clientIds.length !== userAgents.length) 
{
  throw new Error("CLIENT_IDS, CLIENT_SECRETS, USER_AGENTS must have equal length");
}

/* ----------------------------------
   CREDENTIAL ROTATION
----------------------------------- */
const CREDENTIALS = clientIds.map((id, idx) => 
({
  clientId: id,
  clientSecret: clientSecrets[idx],
  userAgent: userAgents[idx]
}));

let credIndex = 0;
const getNextCreds = () => 
{
  const creds = CREDENTIALS[credIndex];
  credIndex = (credIndex + 1) % CREDENTIALS.length;
  return creds;
};

/* ----------------------------------
   AUTH
----------------------------------- */
const getAccessToken = async (creds) => 
{
    const { data } = await axios.post("https://www.reddit.com/api/v1/access_token",
        new URLSearchParams({ grant_type: "client_credentials" }),
        {
            auth: 
            {
                username: creds.clientId,
                password: creds.clientSecret
            },
            headers: 
            {
                "User-Agent": creds.userAgent
            }
        }
    );

    if (!data?.access_token) 
    {
        console.log(`Failed to obtain Reddit access token.\nData:\n${data}`)
        throw new Error("Failed to obtain Reddit access token");
    }

    return data.access_token;
};

/* ----------------------------------
   PROFILE VISIBILITY CHECK
----------------------------------- */
const checkIfProfileHidden = async (username, token, userAgent) => 
{
    const [postsRes, commentsRes] = await Promise.all
    ([
        axios.get(`https://oauth.reddit.com/user/${username}/submitted`, 
        {
            headers: { Authorization: `Bearer ${token}`, "User-Agent": userAgent },
            params: { limit: 3 },
            validateStatus: s => s < 500
        }),
        axios.get(`https://oauth.reddit.com/user/${username}/comments`, 
        {
            headers: { Authorization: `Bearer ${token}`, "User-Agent": userAgent },
            params: { limit: 3 },
            validateStatus: s => s < 500
        })
    ]);

  const postsCount = postsRes?.data?.data?.children?.length || 0;
  const commentsCount = commentsRes?.data?.data?.children?.length || 0;

  // If both are zero while karma is non-zero, user is most likely hiding posts/comments.
  return postsCount === 0 && commentsCount === 0;
};

/* ----------------------------------
   FETCH INITIAL SUMMARY
----------------------------------- */
export const fetchUserInitialSummary = async (username) => 
{
    const creds = getNextCreds();
    const token = await getAccessToken(creds);

    const res = await axios.get(`https://oauth.reddit.com/user/${username}/about`,
    {
        headers: 
        {
            Authorization: `Bearer ${token}`,
            "User-Agent": creds.userAgent
        },
        validateStatus: s => s < 500
    });

    const data = res?.data?.data;
    if (!data) 
    {
        console.log(`User: ${username} not found`);
        return null;
    }

    const createdDate = new Date(data.created_utc * 1000);
    const formattedCreationDate = formatDate(accountCreationDate);
    const timeSinceCreation = formatTimeSinceCreation(accountCreationDate);

    const linkKarma = Number(data.link_karma || 0);
    const commentKarma = Number(data.comment_karma || 0);
    const hasKarma = linkKarma !== 0 || commentKarma !== 0;

    let isPrivate = false;
    if (hasKarma) 
    {
        isPrivate = await checkIfProfileHidden(username,token,creds.userAgent);
    }

    const summary = 
    {
        accountCreationDate:`${formattedCreationDate} ${timeSinceCreation}`,
        ttlPosts: "Processing...",
        ttlComments: "Processing...",
        avgPosts: "Processing...",
        avgComments: "Processing...",
        linkKarma: formatNumber(linkKarma),
        commentKarma: formatNumber(commentKarma),
        status: isPrivate ? "Private" : "Public",
        toolTip: isPrivate
            ? "This account exists, but no public posts or comments are visible.\nThis may occur if the user enabled profile privacy, was suspended,\nshadowbanned, or restricted by Reddit."
            : "This account’s posts or comments are publicly visible on Reddit.",
        isPrivate
    };

    return { userSummary: summary };
};

/* ----------------------------------
   PAGINATED FETCH
----------------------------------- */
const fetchPaginatedData = async (url, token, userAgent, sort) => 
{
    let after = null;
    let count = null;
    const results = [];

    while (true) 
    {
        const { data } = await axios.get(url, 
        {
            headers: 
            {
                Authorization: `Bearer ${token}`,
                "User-Agent": userAgent
            },
            params: 
            {
                limit: 100,
                after,
                count,
                sort
            },
            validateStatus: s => s < 500
        });

        const children = data?.data?.children || [];
        results.push(...children.map(c => c.data));

        count = results.length;
        after = data?.data?.after;
        if (!after)
        {
            break;
        } 
    }

    return results;
};

/* ----------------------------------
   FETCH FULL USER DATA
----------------------------------- */
export const fetchRedditUserData = async (username) => 
{
    const creds = getNextCreds();
    const token = await getAccessToken(creds);

    const [
        userResponse,
        topSubmissions,
        topComments,
        contSubmissions,
        contComments,
        newSubmissions,
        newComments
    ] = await Promise.all
    ([
        axios.get(`https://oauth.reddit.com/user/${username}/about`,
        {
            headers: 
            {
                Authorization: `Bearer ${token}`,
                "User-Agent": creds.userAgent
            },
            validateStatus: s => s < 500
        }
        ),
        fetchPaginatedData(`https://oauth.reddit.com/user/${username}/submitted`, token, creds.userAgent, "top"),
        fetchPaginatedData(`https://oauth.reddit.com/user/${username}/comments`, token, creds.userAgent, "top"),
        fetchPaginatedData(`https://oauth.reddit.com/user/${username}/submitted`,token, creds.userAgent, "controversial"),
        fetchPaginatedData(`https://oauth.reddit.com/user/${username}/comments`, token, creds.userAgent, "controversial"),
        fetchPaginatedData(`https://oauth.reddit.com/user/${username}/submitted`, token, creds.userAgent, "new"),
        fetchPaginatedData(`https://oauth.reddit.com/user/${username}/comments`, token, creds.userAgent, "new")
    ]);

    if (!userResponse?.data?.data) 
    {
        return null;
    }

    // Deduplicate posts/comments (author_fullname + name)
    const uniquePosts = new Map();
    [...newSubmissions, ...topSubmissions, ...contSubmissions].forEach(post => 
    {
        const key = (post.author_fullname || "") + (post.name || "");
        uniquePosts.set(key, post);
    });

    const uniqueComments = new Map();
    [...newComments, ...topComments, ...contComments].forEach(comment => 
    {
        const key = (comment.author_fullname || "") + (comment.name || "");
        uniqueComments.set(key, comment);
    });

    return {
        userData: userResponse.data,
        submissions: Array.from(uniquePosts.values()),
        comments: Array.from(uniqueComments.values())
    };
};
