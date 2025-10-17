export function getQuarterRange(input?: string) {
    let year: number;
    let qNum: number;
  
    if (!input) {
      // 🕐 No input given — use current date
      const now = new Date();
      year = now.getUTCFullYear();
      qNum = Math.floor(now.getUTCMonth() / 3) + 1; // 0–2 = Q1, 3–5 = Q2, etc.
    } else {
      // 📦 Input provided, e.g. "Q2-2025"
      const [q, yearStr] = input.split("-");
      year = parseInt(yearStr?.length === 2 ? `20${yearStr}` : yearStr);
      qNum = parseInt(q.toUpperCase().replace("Q", ""));
    }
  
    const startMonth = (qNum - 1) * 3;
    const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));
  
    return { start, end, quarterLabel: `Q${qNum}-${year}` };
}