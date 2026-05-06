const Expense = require('../models/Expense');
const { extractExpenses } = require('../lib/llm');
const { validateExpenses } = require('../lib/validate');
const { formatExpenseList } = require('../lib/format');
const { getISTDateKey, getISTMonthRange } = require('../lib/dateUtils');
const Budget = require('../models/Budget');
const User = require('../models/User');

function parseDatePrefix(text) {
  const yesterday = /^yesterday[:\-\s]+/i;
  const fullDate  = /^(\d{4}-\d{2}-\d{2})[:\-\s]+/;
  const shortDate = /^(\d{2}\/\d{2})[:\-\s]+/;

  if (yesterday.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return {
      dateKey: getISTDateKey(d),
      cleanText: text.replace(yesterday, '').trim()
    };
  }

  if (fullDate.test(text)) {
    const match = text.match(fullDate);
    return {
      dateKey: match[1],
      cleanText: text.replace(fullDate, '').trim()
    };
  }

  if (shortDate.test(text)) {
    const match = text.match(shortDate);
    const [dd, mm] = match[1].split('/');
    const year = new Date().getFullYear();
    return {
      dateKey: `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`,
      cleanText: text.replace(shortDate, '').trim()
    };
  }

  return {
    dateKey: getISTDateKey(),
    cleanText: text
  };
}

async function handleMessage(bot, msg) {
  const chatId   = msg.chat.id;
  const userId   = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  const text     = msg.text;

  // Skip commands — register happens in index.js via bot.on('message') which fires for all
  if (text.startsWith('/')) return;

  // Register user silently (upsert — safe to call every time)
  await User.findOneAndUpdate(
    { userId },
    { chatId, username, firstName: msg.from.first_name },
    { upsert: true }
  ).catch(err => console.error('User upsert error:', err));

  // Parse date prefix FIRST before passing to LLM
  const { dateKey, cleanText } = parseDatePrefix(text);

  let parsed;
  try {
    parsed = await extractExpenses(cleanText);
  } catch (err) {
    console.error('LLM error:', err);
    return bot.sendMessage(chatId, '⚠️ LLM unavailable. Try again shortly.');
  }

  if (parsed === null) {
    return bot.sendMessage(chatId, "Couldn't parse that. Try: 'chai 10 auto 50'");
  }

  const valid   = validateExpenses(parsed);
  const skipped = parsed.length - valid.length;

  if (valid.length === 0) {
    return bot.sendMessage(chatId, "No valid expenses found. Include amounts (e.g., 'chai 10')");
  }

  const docs = valid.map(e => ({
    userId,
    username,
    item: e.item.trim().toLowerCase(),
    amount: e.amount,
    category: e.category || 'others',
    dateKey
  }));

  await Expense.insertMany(docs);

  // Budget alerts
  const { start, end } = getISTMonthRange();
  const budgets = await Budget.find({ userId });

  if (budgets.length) {
    const spending = await Expense.aggregate([
      { $match: { userId, date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);
    const spendMap = Object.fromEntries(spending.map(s => [s._id, s.total]));

    const alerts = [];
    for (const b of budgets) {
      const spent = spendMap[b.category] || 0;
      const pct   = (spent / b.limit) * 100;
      if (pct >= 100) alerts.push(`🔴 ${b.category} budget EXCEEDED! ₹${spent}/₹${b.limit}`);
      else if (pct >= 80) alerts.push(`🟡 ${b.category} at ${pct.toFixed(0)}% of budget (₹${spent}/₹${b.limit})`);
    }

    if (alerts.length) {
      bot.sendMessage(chatId, '⚠️ Budget Alert:\n' + alerts.join('\n'));
    }
  }

  let reply = formatExpenseList(valid, `Added for ${dateKey}:`);
  if (skipped > 0) {
    reply += `\n\n⚠️ ${skipped} item(s) skipped (missing/invalid amount).`;
  }

  bot.sendMessage(chatId, reply);
}

module.exports = { handleMessage };