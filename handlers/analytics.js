const Expense = require('../models/Expense');
const Budget  = require('../models/Budget');
const { generateBarChart, generatePieChart } = require('../lib/charts');
const { formatCategoryBreakdown } = require('../lib/format');
const {
  getISTDateKey,
  getISTMonthRange,
  getISTWeekRange,
  getLastISTMonthRange
} = require('../lib/dateUtils');

// ─── /week ────────────────────────────────────────────────────────────────────
async function handleWeek(bot, msg) {
  const { chat: { id: chatId }, from: { id: userId } } = msg;
  const { start, end } = getISTWeekRange();

  const expenses = await Expense.find({ userId, date: { $gte: start, $lt: end } })
                                .sort({ date: 1 });

  if (!expenses.length) return bot.sendMessage(chatId, 'No expenses this week yet.');

  // Group by dateKey
  const byDay = {};
  for (const e of expenses) {
    if (!byDay[e.dateKey]) byDay[e.dateKey] = [];
    byDay[e.dateKey].push(e);
  }

  let reply = '📅 This Week:\n\n';
  for (const [day, items] of Object.entries(byDay).sort()) {
    const dayTotal = items.reduce((s, e) => s + e.amount, 0);
    reply += `${day} — ₹${dayTotal}\n`;
    reply += items.map(e => `  • ${e.item} ₹${e.amount} (${e.category})`).join('\n') + '\n\n';
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  reply += `Week Total: ₹${total}`;

  bot.sendMessage(chatId, reply);
}

// ─── /trends ──────────────────────────────────────────────────────────────────
async function handleTrends(bot, msg) {
  const { chat: { id: chatId }, from: { id: userId } } = msg;

  const [thisMonth, lastMonth] = await Promise.all([
    Expense.aggregate([
      { $match: { userId, date: { $gte: getISTMonthRange().start, $lt: getISTMonthRange().end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]),
    Expense.aggregate([
      { $match: { userId, date: { $gte: getLastISTMonthRange().start, $lt: getLastISTMonthRange().end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ])
  ]);

  if (!thisMonth.length && !lastMonth.length) {
    return bot.sendMessage(chatId, 'Not enough data for trends yet.');
  }

  // Build comparison map
  const lastMap = Object.fromEntries(lastMonth.map(g => [g._id, g.total]));
  const thisMap = Object.fromEntries(thisMonth.map(g => [g._id, g.total]));
  const allCategories = [...new Set([...Object.keys(lastMap), ...Object.keys(thisMap)])];

  const thisTotal = thisMonth.reduce((s, g) => s + g.total, 0);
  const lastTotal = lastMonth.reduce((s, g) => s + g.total, 0);
  const overallDiff = thisTotal - lastTotal;
  const overallPct  = lastTotal ? ((overallDiff / lastTotal) * 100).toFixed(1) : 'N/A';
  const overallEmoji = overallDiff > 0 ? '📈' : '📉';

  let reply = `${overallEmoji} Spending Trends\n\n`;
  reply += `This month: ₹${thisTotal}\n`;
  reply += `Last month: ₹${lastTotal}\n`;
  reply += `Overall: ${overallDiff >= 0 ? '+' : ''}₹${overallDiff} (${overallPct}%)\n\n`;
  reply += `By Category:\n`;

  for (const cat of allCategories) {
    const curr = thisMap[cat] || 0;
    const prev = lastMap[cat] || 0;
    const diff = curr - prev;
    const pct  = prev ? ((diff / prev) * 100).toFixed(1) : 'new';
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    reply += `• ${cat}: ₹${curr} ${arrow} ${diff >= 0 ? '+' : ''}₹${diff} (${pct}%)\n`;
  }

  bot.sendMessage(chatId, reply);
}

// ─── /avgspend ────────────────────────────────────────────────────────────────
async function handleAvgSpend(bot, msg) {
  const { chat: { id: chatId }, from: { id: userId } } = msg;
  const { start, end } = getISTMonthRange();

  const result = await Expense.aggregate([
    { $match: { userId, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$dateKey', dayTotal: { $sum: '$amount' } } },
    { $group: {
        _id: null,
        avgDaily: { $avg: '$dayTotal' },
        maxDay:   { $max: '$dayTotal' },
        minDay:   { $min: '$dayTotal' },
        totalDays: { $sum: 1 },
        grandTotal: { $sum: '$dayTotal' }
    }}
  ]);

  if (!result.length) return bot.sendMessage(chatId, 'No data this month yet.');

  const { avgDaily, maxDay, minDay, totalDays, grandTotal } = result[0];

  // Find which day had max spend
  const topDayResult = await Expense.aggregate([
    { $match: { userId, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$dateKey', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: 1 }
  ]);

  const topDay = topDayResult[0];

  const reply =
    `📊 Spending Stats (This Month)\n\n` +
    `Total: ₹${grandTotal}\n` +
    `Days tracked: ${totalDays}\n` +
    `Avg daily spend: ₹${avgDaily.toFixed(0)}\n` +
    `Highest day: ₹${maxDay} (${topDay?._id || 'N/A'})\n` +
    `Lowest day: ₹${minDay}`;

  bot.sendMessage(chatId, reply);
}

// ─── /setbudget food 3000 ─────────────────────────────────────────────────────
async function handleSetBudget(bot, msg, match) {
  const { chat: { id: chatId }, from: { id: userId } } = msg;
  const parts = msg.text.trim().split(/\s+/);
  // /setbudget <category> <amount>
  const category = parts[1]?.toLowerCase();
  const limit    = parseFloat(parts[2]);

  const validCats = ['food', 'transport', 'shopping', 'bills', 'others'];

  if (!validCats.includes(category) || isNaN(limit) || limit <= 0) {
    return bot.sendMessage(chatId,
      'Usage: /setbudget <category> <amount>\nCategories: food, transport, shopping, bills, others\nExample: /setbudget food 3000'
    );
  }

  await Budget.findOneAndUpdate(
    { userId, category },
    { limit },
    { upsert: true, new: true }
  );

  bot.sendMessage(chatId, `✅ Budget set: ${category} → ₹${limit}/month`);
}

// ─── /budgets ─────────────────────────────────────────────────────────────────
async function handleCheckBudgets(bot, msg) {
  const { chat: { id: chatId }, from: { id: userId } } = msg;
  const { start, end } = getISTMonthRange();

  const [budgets, spending] = await Promise.all([
    Budget.find({ userId }),
    Expense.aggregate([
      { $match: { userId, date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ])
  ]);

  if (!budgets.length) {
    return bot.sendMessage(chatId, 'No budgets set. Use /setbudget food 3000 to set one.');
  }

  const spendMap = Object.fromEntries(spending.map(s => [s._id, s.total]));

  let reply = '💰 Budget Status (This Month):\n\n';
  for (const b of budgets) {
    const spent = spendMap[b.category] || 0;
    const pct   = ((spent / b.limit) * 100).toFixed(0);
    const bar   = buildProgressBar(spent, b.limit);
    const emoji = pct >= 100 ? '🔴' : pct >= 80 ? '🟡' : '🟢';
    reply += `${emoji} ${b.category}\n`;
    reply += `   ${bar} ${pct}%\n`;
    reply += `   ₹${spent} / ₹${b.limit}\n\n`;
  }

  bot.sendMessage(chatId, reply);
}

function buildProgressBar(spent, limit, length = 10) {
  const filled = Math.min(Math.round((spent / limit) * length), length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

// ─── /chartcategory ───────────────────────────────────────────────────────────
async function handleChartCategory(bot, msg) {
  const { chat: { id: chatId }, from: { id: userId } } = msg;
  const { start, end } = getISTMonthRange();

  const groups = await Expense.aggregate([
    { $match: { userId, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } }
  ]);

  if (!groups.length) return bot.sendMessage(chatId, 'No data this month.');

  const labels = groups.map(g => g._id);
  const data   = groups.map(g => g.total);

  const image = await generatePieChart(labels, data, 'Monthly Spend by Category');
  bot.sendPhoto(chatId, image, { caption: '📊 Category breakdown this month' });
}

// ─── /chartweek ───────────────────────────────────────────────────────────────
async function handleChartWeek(bot, msg) {
  const { chat: { id: chatId }, from: { id: userId } } = msg;
  const { start, end } = getISTWeekRange();

  const groups = await Expense.aggregate([
    { $match: { userId, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$dateKey', total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]);

  if (!groups.length) return bot.sendMessage(chatId, 'No data this week.');

  const labels = groups.map(g => g._id.slice(5)); // "05-03" instead of "2025-05-03"
  const data   = groups.map(g => g.total);

  const image = await generateBarChart(labels, data, 'Daily Spend This Week');
  bot.sendPhoto(chatId, image, { caption: '📈 Daily spending this week' });
}

module.exports = {
  handleWeek,
  handleTrends,
  handleAvgSpend,
  handleSetBudget,
  handleCheckBudgets,
  handleChartCategory,
  handleChartWeek
};