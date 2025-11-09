import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Calendar.css";
import { useEffect, useState } from "react";
import { getQuarterDateRange, distinctColors } from "../utils";

function CalendarComponent({ selectedQuarter, displayData, onClose }) {
  const [userColors, setUserColors] = useState({});
  const [dateSessions, setDateSessions] = useState({});

  const { minDate, maxDate } = getQuarterDateRange(selectedQuarter);
  const [activeDate, setActiveDate] = useState(maxDate);

  useEffect(() => {
    const colorMap = {};
    const dateMap = {};

    displayData.forEach((user, index) => {
      colorMap[user.username] = distinctColors[index % distinctColors.length];

      // assign sessions
      user.timestamp.forEach((ts) => {
        const dateStr = new Date(ts).toLocaleDateString();
        if (!dateMap[dateStr]) dateMap[dateStr] = [];
        if (!dateMap[dateStr].includes(user.username)) {
          dateMap[dateStr].push(user.username);
        }
      });
    });

    setUserColors(colorMap);
    setDateSessions(dateMap);
  }, [displayData]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // prevent close when clicking inside
      >
        <Calendar
          minDate={minDate}
          maxDate={maxDate}
          activeStartDate={activeDate}
          onActiveStartDateChange={({ activeStartDate }) => setActiveDate(activeStartDate)}
          tileContent={({ date }) => {
            const users = dateSessions[date.toLocaleDateString()];
            if (!users) return null;

            return (
              <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
                {users.map((u) => (
                  <span
                    key={u}
                    style={{
                      backgroundColor: userColors[u],
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      margin: "0 1px",
                    }}
                    title={u}
                  />
                ))}
              </div>
            );
          }}
        />

        <div className="legend">
          {Object.entries(userColors).map(([username, color]) => (
            <div key={username} className="legend-item">
              <span
                className="legend-dot"
                style={{ backgroundColor: color }}
              ></span>
              <span>{username}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CalendarComponent;
