export function formatRelativeChatTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now  = new Date();
  const diffMin = (now - date) / 60000;
  const diffHr  = diffMin / 60;

  if (diffMin < 1) return "Just now";
  if (diffHr < 1)  return `${Math.floor(diffMin)}m ago`;
  if (diffHr < 24) return `${Math.floor(diffHr)}h ago`;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000);

  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7)   return `${dayDiff} days ago`;
  if (dayDiff < 14)  return "Last week";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}