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
