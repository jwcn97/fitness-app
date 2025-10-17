export function getQuarterRange() {  
    const now = new Date();
    const year = now.getUTCFullYear();
    const qNum = Math.floor(now.getUTCMonth() / 3) + 1;
  
    const startMonth = (qNum - 1) * 3;
    const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));
  
    return { start, end, quarterLabel: `Q${qNum}-${year}` };
}