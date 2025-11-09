import * as dotenv from 'dotenv';
dotenv.config();

import TelegramBot from 'node-telegram-bot-api';
import { Message } from 'node-telegram-bot-api';
import Checkin from "./models/checkIn";
import mongoose from 'mongoose';
import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import path from 'path';
import { getQuarterRange } from './utils';

const app = express();
const port = process.env.PORT || 3000;
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.getMe().then((me) => {
  const linkRegex = new RegExp(`^\\/link@${me.username}$`, 'i');
  const appName = 'tracker'; // TODO: make app name dynamic

  bot.onText(linkRegex, (msg: Message) => {
    if (msg.chat.type == 'private') {
      return;
    }

    bot.sendMessage(msg.chat.id, 'Open Web App', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Open',
              url: `https://t.me/${me.username}/${appName}?startapp=${msg.chat.id}`,
            },
          ]
        ]
      }
    });
  });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "../../client/build")));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Helper function to verify Telegram init data
function verifyTelegramInitData(initData) {
  const parsed = Object.fromEntries(new URLSearchParams(initData));
  const hash = parsed.hash;
  delete parsed.hash;

  const dataCheckString = Object.keys(parsed)
    .sort()
    .map(key => `${key}=${parsed[key]}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return computedHash === hash ? parsed : null;
}

// Route to handle Telegram init data
app.post('/auth/telegram', (req, res) => {
  const { initData } = req.body;
  const verified = verifyTelegramInitData(initData);

  if (!verified) {
    return res.status(403).json({ error: 'Invalid Telegram init data' });
  }

  const user = JSON.parse(verified.user);
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      chatInstance: verified.chat_instance
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

app.post('/checkin', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const username = req.body?.username ?? decoded.username;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    if (
      req.body.lastCheckIn &&
      new Date(req.body.lastCheckIn) >= startOfDay &&
      new Date(req.body.lastCheckIn) <= endOfDay
    ) {
      return res.status(400).json({ error: "⚠️ Already checked in today!" });
    }

    try {
      const newCheckin = new Checkin({ username, chat_instance: decoded.chatInstance });
      await newCheckin.save();

      const chatId = req.body?.chatId ?? '';
      if (chatId) {
        bot.sendMessage(chatId, `🏋️ @${username} checked in!`);
      }

      res.status(200).json({});
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'Could not record your check-in. Please try again later.' });
    }
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
})

app.get('/display', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { start, end } = getQuarterRange(req.query.quarter);
    const results = await Checkin.aggregate([
      {
        $match: {
          chat_instance: decoded.chatInstance,
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 },
          timestamp: { $push: "$timestamp" }, // 👈 collect all session timestamps
        },
      },
      {
        $sort: { _id: 1 }, // optional: sort by username
      },
    ]);

    res.status(200).json({
      data: {
        list: (results ?? []).map(r => ({
          username: r._id,
          count: r.count,
          timestamp: r.timestamp,
        })),
      }
    });
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
