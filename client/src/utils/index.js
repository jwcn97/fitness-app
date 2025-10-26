export function getQuarterDateRange(quarterString) {
  const [q, yearStr] = quarterString.split("-");
  const year = parseInt(yearStr, 10);
  const quarter = q.toUpperCase();

  // Determine start month (0-indexed)
  let startMonth;
  switch (quarter) {
    case "Q1": startMonth = 0; break;   // Jan
    case "Q2": startMonth = 3; break;   // Apr
    case "Q3": startMonth = 6; break;   // Jul
    case "Q4": startMonth = 9; break;   // Oct
    default: throw new Error(`Invalid quarter string: ${quarterString}`);
  }

  // Start = first day of quarter (local)
  const minDate = new Date(year, startMonth, 1);
  // End = last day of quarter (local)
  const maxDate = new Date(year, startMonth + 3, 0);

  // Check if current quarter
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const selectedQuarter = parseInt(quarter[1], 10);

  let finalMaxDate = maxDate;
  let activeDate = maxDate;

  if (year === currentYear && selectedQuarter === currentQuarter) {
    // Current quarter → cap at today
    finalMaxDate = new Date();
    activeDate = new Date(); // start at today
  }

  return { minDate, maxDate: finalMaxDate, activeDate };
}

export const getCurrentQuarter = () => {
  const now = new Date();
  const currYear = now.getFullYear();
  const currQuarter = Math.floor(now.getMonth() / 3) + 1;

  const startQuarter = 3;
  const startYear = 2025;

  const quarters = [];
  let year = currYear;
  let quarter = currQuarter;
  while (year > startYear || (year === startYear && quarter >= startQuarter)) {
    quarters.push(`Q${quarter}-${year}`);
    quarter--;
    if (quarter < 1) {
      quarter = 4;
      year--;
    }
  }

  return {
    quarterLabel: `Q${currQuarter}-${currYear}`,
    quarters,
  };
}

export const getRandomColor = () => {
  const colors = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
    "#FF9F40", "#C9CBCF", "#00C49F", "#FF6666", "#B39DDB"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export const authenticateWithTelegram = async (initData) => {
  try {
    const res = await fetch("/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });
    if (!res.ok) {
      console.error("Auth response not ok", res.status);
      return null;
    }
    const data = await res.json();
    return data.token;
  } catch (err) {
    console.error("Auth failed:", err);
    return null;
  }
};
