import TelegramBot from 'node-telegram-bot-api';
import Checkin from '../models/checkIn';
import { getPreviousMonthRange } from '../utils';
import { getGroupChats } from './groups';

let inFlight = false;

function formatMonthlySummaryMessage(monthDate: Date, counts: { username: string; count: number }[]) {
  const monthLabel = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  if (!counts.length) {
    return `📊 Monthly check-in summary (${monthLabel})\n\nNo check-ins were recorded this month.`;
  }

  const lines = counts.map(({ username, count }, i) => `${i + 1}. @${username} — ${count}`);
  return `📊 Monthly check-in summary (${monthLabel})\n\n${lines.join('\n')}`;
}

export async function runMonthlyGroupSummary(bot: TelegramBot) {
  if (inFlight) {
    return;
  }

  inFlight = true;
  try {
    const now = new Date();
    const { start, end } = getPreviousMonthRange(now);

    const [groupChats, groupedCounts] = await Promise.all([
      getGroupChats(),
      Checkin.aggregate([
        {
          $match: {
            timestamp: { $gte: start, $lt: end },
            chat_instance: { $ne: null },
          },
        },
        {
          $group: {
            _id: { chat_instance: '$chat_instance', username: '$username' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.username': 1 } },
      ]),
    ]);

    const countsByChatInstance = new Map<string, { username: string; count: number }[]>();
    for (const item of groupedCounts) {
      const chatInstance = item?._id?.chat_instance;
      const username = item?._id?.username;
      if (!chatInstance || !username) continue;

      const existing = countsByChatInstance.get(chatInstance) ?? [];
      existing.push({ username, count: item.count });
      countsByChatInstance.set(chatInstance, existing);
    }

    for (const { chatInstance, chatId } of groupChats) {
      const monthlyCounts = countsByChatInstance.get(chatInstance) ?? [];
      const message = formatMonthlySummaryMessage(start, monthlyCounts);

      try {
        await bot.sendMessage(chatId, message);
      } catch (err) {
        console.error(`Failed to send monthly summary to chat ${chatId}`, err);
      }
    }
  } catch (err) {
    console.error('Failed to run monthly summary job', err);
  } finally {
    inFlight = false;
  }
}
