import * as dotenv from 'dotenv';
dotenv.config();

import Checkin from "./models/checkIn";
import mongoose from 'mongoose';
import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import path from 'path';
import { getQuarterRange } from './utils';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// Tell Express to serve all static files (CSS, JS, images)
// from the 'public' directory.
app.use(express.static(path.join(__dirname, 'public')));

// Set up a route handler for the root URL ('/').
// When a GET request is made to the root, respond by sending the
// 'index.html' file from the 'public' directory.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const BOT_TOKEN = process.env.BOT_TOKEN;

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
    .update(BOT_TOKEN)
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
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
    res.json({ token });
});

app.post('/checkin', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Missing token' });
  
    const token = auth.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Processing for user:', decoded.username);

      try {
        const newCheckin = new Checkin({ username: decoded.username });
        await newCheckin.save();
        res.status(200).json({ success: true, data: decoded.username });
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
      console.log('Display for user:', decoded.username);

      const { start, end, quarterLabel } = getQuarterRange();
      const results = await Checkin.aggregate([
        {
            $match: {
                timestamp: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
            _id: "$username",
            count: { $sum: 1 },
            },
        },
        {
            $sort: { count: -1 }, // optional: sort by count descending
        },
      ]);

      res.status(200).json({
        success: true,
        data: quarterLabel + '<br><br>' + results
            .map((r) => `${r._id}: 🏋️ x${r.count}`)
            .join("<br>") || 'no record yet'
      });
    } catch (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
    }
})

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
