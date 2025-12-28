/* 
    formatting + small helpers  
*/

/**
 * Create or return cached entry for a given username
 */
export const getOrCreateCacheEntry = (cache, username) => 
{
    if (!cache.has(username)) 
    {
        cache.set(username, {
            summary: {},
            activity: null,
            lastUpdated: Date.now()
        });
    }
    return cache.get(username);
};

/**
 * Format a Date object IE: "Jun 28, 2023"
 */
export const formatDate = (timestamp) => 
{
    if (!timestamp) return "Unknown";

    try 
    {
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        }).format(new Date(timestamp));
    } 
    catch (err) 
    {
        return "Invalid Date";
    }
};

/**
 * Returns human-readable time since creation
 * IE: "(3Y, 2M ago)"
 */
export const formatTimeSinceCreation = (startDate, endDate = new Date()) => 
{
    if (!startDate) 
    {
        return "(0D) ago";
    }

    startDate = new Date(startDate);
    endDate = new Date(endDate);

    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();

    // Fix negative days by borrowing from previous month
    if (days < 0) 
    {
        months -= 1;
        const prevMonthDays = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            0
        ).getDate();
        days += prevMonthDays;
    }

    // Fix negative months by borrowing a year
    if (months < 0) 
    {
        years -= 1;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years}Y`);
    if (months > 0) parts.push(`${months}M`);

    // Only show days if the account is < 1 month old
    if (years === 0 && months === 0)
    {
        parts.push(`${days}D`);
    }

    return `(${parts.join(",")}) ago`;
};


/**
 * Formats large numbers with commas
 */
export const formatNumber = (num) => 
{
    if (num === null || num === undefined || isNaN(num))
    {
        return "0";
    } 
    return Number(num).toLocaleString("en-US");
};

/**
 * Safe average formatter (4 decimal places)
 */
export function formatAverage(value) 
{
    if (!value || isNaN(value))
    {
        return "0.0000";
    } 
    return Number(value).toFixed(4);
}

/**
 * Safely truncate long strings
 */
export function truncate(text, maxLength = 250) {
  if (!text || typeof text !== "string") return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

/**
 * Escapes HTML special characters
 * (for safety if rendering user content)
 */
export function escapeHtml(text) {
  if (typeof text !== "string") return "";

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ----------------------------------
   DATE RANGE HELPERS
----------------------------------- */

/**
 * Returns YYYY-MM-DD string from unix timestamp (seconds)
 */
export function unixToDateString(unixSeconds) {
  if (!unixSeconds) return "—";
  return formatDate(new Date(unixSeconds * 1000));
}

/**
 * Returns number of days between two dates
 */
export function daysBetween(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) return 0;
  const diff = Math.abs(end - start);
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
