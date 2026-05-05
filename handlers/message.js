const Expense = require('../models/Expense');
const { extractExpenses } = require('../lib/llm');
const { validateExpenses } = require('../lib/validate');
const { formatExpenseList } = require('../lib/format');
const { getISTDateKey } = require('../lib/dateUtils');
const Budget = require('../models/Budget');
const { getISTMonthRange } = require('../lib/dateUtils');
async function handleMessage(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  const text = msg.text;

  // Skip commands
  if (text.startsWith('/')) return;

  let parsed;
  try {
    parsed = await extractExpenses(text);
  } catch (err) {
    console.error('LLM error:', err);
    return bot.sendMessage(chatId, '⚠️ LLM unavailable. Try again shortly.');
  }

  if (parsed === null) {
    return bot.sendMessage(chatId, "Couldn't parse that. Try: 'chai 10 auto 50'");
  }

  const valid = validateExpenses(parsed);
  const skipped = parsed.length - valid.length;

  if (valid.length === 0) {
    return bot.sendMessage(chatId, "No valid expenses found. Include amounts (e.g., 'chai 10')");
  }

  const dateKey = getISTDateKey();

  // Bulk insert — simple, no duplicate prevention beyond same-message
  const docs = valid.map(e => ({
    userId,
    username,
    item: e.item.trim().toLowerCase(),
    amount: e.amount,
    category: e.category || 'others',
    dateKey
  }));

  await Expense.insertMany(docs);
  // Check budget alerts after saving
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

  let reply = formatExpenseList(valid);
  if (skipped > 0) {
    reply += `\n\n⚠️ ${skipped} item(s) skipped (missing/invalid amount).`;
  }

  bot.sendMessage(chatId, reply);
}

module.exports = { handleMessage };