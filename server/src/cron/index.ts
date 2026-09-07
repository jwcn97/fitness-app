import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { runMonthlyGroupSummary } from './monthlySummary';
import { runWeeklyReminder } from './weeklyReminder';

const TIMEZONE = 'Asia/Singapore';

export function registerCronJobs(bot: TelegramBot) {
  // 1st of every month at 00:00 — previous month's check-in leaderboard
  cron.schedule('0 0 1 * *', () => runMonthlyGroupSummary(bot), { timezone: TIMEZONE });

  // Every Wednesday at 00:00 — hype up the Thursday session
  cron.schedule('0 0 * * 3', () => runWeeklyReminder(bot), { timezone: TIMEZONE });
}
