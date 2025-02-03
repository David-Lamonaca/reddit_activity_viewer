export class RedditComment 
{
    constructor(score, created_utc, subreddit, content) 
    {
      this.score = score;
      this.date = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(
        new Date(created_utc * 1000)
      );
      this.subreddit = subreddit;
      this.content = content;
    }
}

export class MostUsedWord 
{
    constructor(word, count) 
    {
      this.word = word;  
      this.count = count;  
    }
}

export class TopSubreddit 
{
    constructor(subreddit, count, percentage) 
    {
      this.subreddit = subreddit;
      this.count = count;
      this.percentage = percentage;
    }

    calculatePercentage(total) 
    {
        this.percentage = total === 0 
            ? 0.00 
            : ((this.count / total) * 100).toFixed(2);
    }
}

export class DataSummary
{
    constructor(date, totalPosts, totalComments, 
        avgPostsPerDay, avgCommentsPerDay, uniqueSubredditsPosts, 
        uniqueSubredditsComments, topSubredditsByPosts, topSubredditsByComments)
    {
        this.date = date;
        this.total_posts = totalPosts;
        this.total_comments = totalComments;
        this.avg_posts_per_day = avgPostsPerDay;
        this.avg_comments_per_day = avgCommentsPerDay;
        this.unique_subreddits_posts = uniqueSubredditsPosts;
        this.unique_subreddits_comments = uniqueSubredditsComments;
        this.top_subreddits_by_posts = topSubredditsByPosts;
        this.top_subreddits_by_comments = topSubredditsByComments; 
    }

    calculateAverages(totalDays) 
    {
        this.avg_posts_per_day = (this.total_posts / totalDays).toFixed(4);
        this.avg_comments_per_day = (this.total_comments / totalDays).toFixed(4);
    }
}

export class Result
{
    constructor(overallData, yearlyStats, topUpvotedComments,
        topDownvotedComments, mostUsedWords)
    {
        this.overall_data = overallData;
        this.yearly_stats = yearlyStats; 
        this.top_upvoted_comments = topUpvotedComments; 
        this.top_downvoted_comments = topDownvotedComments; 
        this.most_used_words = mostUsedWords; 
    }
}
