import React, { useState } from "react";
import "./App.css";
import Calendar from "./Calendar/Calendar";
import useActions from "./hooks/useActions";

function App() {
  const {
    loading,
    isRefreshing,
    displayData,
    message,
    authToken,
    selectedQuarter,
    quarters,
    setSelectedQuarter,
    handleCheckIn,
    handleRefresh,
  } = useActions();

  const [showCalendar, setShowCalendar] = useState(false);

  const currentQuarterString = `Q${Math.floor(new Date().getMonth() / 3) + 1}-${new Date().getFullYear()}`;
  const canCheckInForCurrentQuarter = (selectedQuarter === currentQuarterString);

  return (
    <div className="container">
      <h2>Fitness Tracker</h2>

      <button
        className="active-sg-btn"
        onClick={() => {
          window.Telegram?.WebApp?.openLink(
            "https://activesg.gov.sg/passes/activities/8JfPH6hlXBvlYJAqVzmPg"
          );
        }}
      >
        Get ActiveSG Gym Pass
      </button>

      {authToken ? (
        <div className="controls">
          <select
            className="selector"
            value={selectedQuarter}
            onChange={async (e) => {
              setSelectedQuarter(e.target.value);
            }}
            disabled={loading}
          >
            {quarters.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>

          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={loading || !canCheckInForCurrentQuarter}
          >
            ↻
          </button>
        </div>
      ) : null}

      <div id="display">
        {displayData.length === 0 ? (
          <p>{message || "No entries."}</p>
        ) : (
          displayData.map((item) => (
            <div className="row" key={item.username} data-id={item.username}>
              <span>
                {item.username}: 🏋️ x{item.count}
              </span>
              <button
                className="checkin-btn"
                onClick={(e) => handleCheckIn(item.username, e.currentTarget)}
                disabled={isRefreshing || !canCheckInForCurrentQuarter}
              >
                Check In
              </button>
            </div>
          ))
        )}
      </div>

      {authToken && displayData.length ? (
        <button
          className="view-calendar-btn"
          onClick={() => setShowCalendar(true)}
          disabled={loading}
        >
          📅 View Sessions
        </button>
      ) : null}

      {authToken && showCalendar ? (
        <Calendar
          selectedQuarter={selectedQuarter}
          displayData={displayData}
          onClose={() => setShowCalendar(false)}
        />
      ) : null}
    </div>
  );
}

export default App;
