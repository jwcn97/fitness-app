import TelegramBot from 'node-telegram-bot-api';
import { getGroupChats } from './groups';

const REMINDER_MESSAGE = 'SEE YALL TMR';

let inFlight = false;

export async function runWeeklyReminder(bot: TelegramBot) {
  if (inFlight) {
    return;
  }

  inFlight = true;
  try {
    const groupChats = await getGroupChats();

    for (const { chatId } of groupChats) {
      try {
        await bot.sendMessage(chatId, REMINDER_MESSAGE);
      } catch (err) {
        console.error(`Failed to send weekly reminder to chat ${chatId}`, err);
      }
    }
  } catch (err) {
    console.error('Failed to run weekly reminder job', err);
  } finally {
    inFlight = false;
  }
}
