import { useEffect, useState, useRef, useCallback } from "react";
import { useTelegram } from './useTelegram';
import { getCurrentQuarter, authenticateWithTelegram } from '../utils';

function useActions() {
  const tg = useTelegram();
  const { quarterLabel, quarters } = getCurrentQuarter();
  const [selectedQuarter, setSelectedQuarter] = useState(quarterLabel);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("Loading display...");
  const [authToken, setAuthToken] = useState(() => "");
  const authenticatingRef = useRef(false);

  const doInit = useCallback(async () => {
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

    if (!tg.initDataUnsafe.start_param) {
      setMessage("Please open from bot /link command in a group")
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
  }, [tg]);

  const updateDisplay = useCallback(async () => {
    if (!authToken) {
      setMessage("Not authenticated.");
      setDisplayData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetch(`/display?quarter=${selectedQuarter}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      setMessage("No data available.");
      setDisplayData([]);
      return;
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
      list.splice(indexToInsert, 0, { username, count: 0, timestamp: [] });
    }

    setDisplayData(list);
    setMessage("");
    setLoading(false);
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

    const res = await fetch("/checkin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        username,
        chatId: tg?.initDataUnsafe.start_param,
      }),
    });
    const { error } = await res.json();
    if (error) {
      alert(error);
    } else {
      await updateDisplay();
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
    doInit();
  }, [doInit, tg]);

  return {
    loading,
    isRefreshing,
    displayData,
    message,
    authToken,
    quarters,
    selectedQuarter,
    handleCheckIn,
    setSelectedQuarter,
    handleRefresh,
  }
}

export default useActions;
