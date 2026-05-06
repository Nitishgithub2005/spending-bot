const User    = require('../models/User');
const Expense = require('../models/Expense');

const ADMIN_ID = parseInt(process.env.ADMIN_USER_ID);

function isAdmin(msg) {
  return msg.from.id === ADMIN_ID;
}

// /broadcast <message>
async function handleBroadcast(bot, msg) {
  const chatId = msg.chat.id;

  if (!isAdmin(msg)) {
    return bot.sendMessage(chatId, '⛔ Not authorized.');
  }

  const text = msg.text.replace('/broadcast', '').trim();
  if (!text) {
    return bot.sendMessage(chatId, 'Usage: /broadcast Your message here');
  }

  const users = await User.find({});
  let sent = 0, failed = 0;

  for (const user of users) {
    try {
      await bot.sendMessage(user.chatId, `📢 *Message from bot owner:*\n\n${text}`, { parse_mode: 'Markdown' });
      sent++;
    } catch (err) {
      failed++; // user blocked bot
    }
  }

  bot.sendMessage(chatId, `✅ Broadcast done!\nSent: ${sent}\nFailed: ${failed}`);
}

// /stats — see how many users, total expenses logged
async function handleStats(bot, msg) {
  const chatId = msg.chat.id;

  if (!isAdmin(msg)) {
    return bot.sendMessage(chatId, '⛔ Not authorized.');
  }

  const [userCount, expenseCount, topUsers] = await Promise.all([
    User.countDocuments(),
    Expense.countDocuments(),
    Expense.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 }, username: { $first: '$username' } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])
  ]);

  let reply = `📊 *Bot Stats*\n\n`;
  reply += `👥 Total users: ${userCount}\n`;
  reply += `💸 Total expenses logged: ${expenseCount}\n\n`;
  reply += `*Top 5 active users:*\n`;
  for (const u of topUsers) {
    reply += `• ${u.username || u._id}: ${u.count} expenses\n`;
  }

  bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
}

// /announce — send a reminder blast to all users who haven't logged today
async function handleAnnounce(bot, msg) {
  const chatId = msg.chat.id;

  if (!isAdmin(msg)) {
    return bot.sendMessage(chatId, '⛔ Not authorized.');
  }

  const today = new Date().toISOString().split('T')[0];
  const activeToday = await Expense.distinct('userId', { dateKey: today });
  const allUsers    = await User.find({ userId: { $nin: activeToday } });

  let sent = 0, failed = 0;

  for (const user of allUsers) {
    try {
      await bot.sendMessage(user.chatId,
        `👋 Hey! You haven't logged any expenses today.\n\nJust send something like:\n_"chai 10 auto 50"_`
        , { parse_mode: 'Markdown' }
      );
      sent++;
    } catch {
      failed++;
    }
  }

  bot.sendMessage(chatId, `📢 Nudge sent!\nReached: ${sent} users\nFailed: ${failed}`);
}

module.exports = { handleBroadcast, handleStats, handleAnnounce };