// src/App.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import "./App.css";
import { useTelegram } from "./useTelegram";
import { getCurrentQuarter, authenticateWithTelegram } from './utils';

function App() {
  const tg = useTelegram();
  const { quarterLabel, quarters } = getCurrentQuarter();
  const [selectedQuarter, setSelectedQuarter] = useState(quarterLabel);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("Loading display...");
  const [authToken, setAuthToken] = useState(() => "");
  const authenticatingRef = useRef(false);

  const updateDisplay = useCallback(async () => {
    if (!authToken) {
      setMessage("Not authenticated.");
      setDisplayData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/display?quarter=${encodeURIComponent(selectedQuarter)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        throw new Error("display fetch failed: " + res.status);
      }
      const { data } = await res.json();
      if (!data) {
        setMessage("No data available.");
        setDisplayData([]);
        return;
      }

      // ensure current user appears in the list (mock with 0 count if absent)
      const list = Array.isArray(data.list) ? [...data.list] : [];
      const username = tg?.initDataUnsafe?.user?.username;
      if (username && !list.find((i) => i.username === username)) {
        let indexToInsert = list.findIndex((i) => i.username.localeCompare(username) > 0);
        if (indexToInsert === -1) indexToInsert = list.length;
        list.splice(indexToInsert, 0, { username, count: 0 });
      }

      setDisplayData(list);
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage("Failed to load display.");
      setDisplayData([]);
    } finally {
      setLoading(false);
    }
  }, [authToken, selectedQuarter, tg?.initDataUnsafe?.user?.username]);

  // Handle check-in POST /checkin
  const handleCheckIn = async (username, btnEl) => {
    if (!authToken) {
      alert("Not authenticated.");
      return;
    }

    setLoading(true);

    const btn = btnEl || document.querySelector(`[data-id='${username}'] button`);
    if (btn) {
      btn.disabled = true;
    }

    try {
      const res = await fetch("/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ username }),
      });
      const { error } = await res.json();
      if (error) {
        alert(error);
      } else {
        await updateDisplay();
      }
    } catch (err) {
      console.error("Check-in error", err);
      alert("Check-in error. Please try again.");
    }

    if (btn) {
      btn.disabled = false;
    }

    setLoading(false);
  };

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await updateDisplay();
    setIsRefreshing(false);
  };

  const handleChangeQuarter = async () => {
    setIsRefreshing(true);
    await updateDisplay();
    setIsRefreshing(false);
  };

  useEffect(() => {
    updateDisplay();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    handleChangeQuarter();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuarter]);

  useEffect(() => {
    const doInit = async () => {
      if (!tg) {
        setMessage("Please open from a Telegram group chat.");
        setLoading(false);
        return;
      }

      // Telegram present
      try {
        tg.ready?.();
        tg.expand?.();
      } catch (e) {
        console.warn("tg.ready/expand may not be available yet", e);
      }

      // Prevent concurrent authentication calls
      if (authenticatingRef.current) return;
      authenticatingRef.current = true;

      const chatType = tg.initDataUnsafe.chat_type;
      if (
        !chatType ||
        chatType === 'private' ||
        chatType === 'sender'
      ) {
        setMessage("Please open from a Telegram group chat.");
        setLoading(false);
        authenticatingRef.current = false;
        return;
      }

      // Authenticate using Telegram initData (server will validate signature)
      const token = await authenticateWithTelegram(tg.initData);
      if (!token) {
        setMessage("Please open from a Telegram group chat.");
        setLoading(false);
        authenticatingRef.current = false;
        return;
      }

      setAuthToken(token);
      authenticatingRef.current = false;
    };

    doInit();
  }, [tg]);

  const currentQuarterString = `Q${Math.floor(new Date().getMonth() / 3) + 1}-${new Date().getFullYear()}`;
  const canCheckInForCurrentQuarter = (selectedQuarter === currentQuarterString);

  return (
    <div className="container">
      <h2>Fitness Tracker</h2>

      <a
        href="https://activesg.gov.sg/passes/activities/8JfPH6hlXBvlYJAqVzmPg"
        target="_blank"
        rel="noreferrer"
        className="active-sg-btn"
      >
        Get ActiveSG Gym Pass
      </a>

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
            🔄 Refresh
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
    </div>
  );
}

export default App;
