export function getQuarterRange(quarter?: string) {
  let year, qNum;

  if (quarter) {
    // Parse something like "Q3-2025"
    const match = quarter.match(/Q(\d)-(\d{4})/);
    if (match) {
      qNum = parseInt(match[1], 10);
      year = parseInt(match[2], 10);
    } else {
      throw new Error(`Invalid quarter format: ${quarter}`);
    }
  } else {
    // Default to current quarter
    const now = new Date();
    year = now.getFullYear();
    qNum = Math.floor(now.getMonth() / 3) + 1;
  }

  const startMonth = (qNum - 1) * 3;
  const start = new Date(year, startMonth, 1, 0, 0, 0);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);

  return { start, end };
}