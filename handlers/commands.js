const Expense = require('../models/Expense');
const { formatExpenseList, formatCategoryBreakdown } = require('../lib/format');
const { getISTDateKey, getISTMonthRange } = require('../lib/dateUtils');

async function handleToday(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const dateKey = getISTDateKey();

  const expenses = await Expense.find({ userId, dateKey }).sort({ createdAt: 1 });

  if (!expenses.length) {
    return bot.sendMessage(chatId, "No expenses today yet. Start adding some!");
  }

  bot.sendMessage(chatId, formatExpenseList(expenses, `📅 Today (${dateKey}):`));
}

async function handleMonth(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const { start, end } = getISTMonthRange();

  const expenses = await Expense.find({
    userId,
    date: { $gte: start, $lt: end }
  }).sort({ date: 1 });

  if (!expenses.length) {
    return bot.sendMessage(chatId, 'No expenses this month.');
  }

  // Group by dateKey for display
  const byDay = {};
  for (const e of expenses) {
    if (!byDay[e.dateKey]) byDay[e.dateKey] = [];
    byDay[e.dateKey].push(e);
  }

  let reply = '📆 This Month:\n\n';
  for (const [day, items] of Object.entries(byDay).sort()) {
    const dayTotal = items.reduce((s, e) => s + e.amount, 0);
    reply += `${day} — ₹${dayTotal}\n`;
    reply += items.map(e => `  • ${e.item} ₹${e.amount}`).join('\n') + '\n\n';
  }

  const monthTotal = expenses.reduce((s, e) => s + e.amount, 0);
  reply += `Grand Total: ₹${monthTotal}`;

  bot.sendMessage(chatId, reply);
}

async function handleSummary(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const { start, end } = getISTMonthRange();

  const groups = await Expense.aggregate([
    { $match: { userId, date: { $gte: start, $lt: end } } },
    { $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
    }},
    { $sort: { total: -1 } }
  ]);

  if (!groups.length) {
    return bot.sendMessage(chatId, 'No expenses this month for summary.');
  }

  bot.sendMessage(chatId, '📊 Monthly Summary by Category:\n\n' + formatCategoryBreakdown(groups));
}
async function handleHelp(bot, msg) {
  const chatId = msg.chat.id;

  const reply = `
🤖 *Expense Bot Commands*

*📥 Adding Expenses*
Just type naturally\\!
_Example: "chai 10 auto 50 lunch 120"_

*📊 Viewing Expenses*
/today \\- Today's expenses
/week \\- This week day\\-by\\-day
/month \\- Full month breakdown
/summary \\- Category totals this month

*📈 Analytics*
/trends \\- This month vs last month
/avgspend \\- Daily average \\& top spending day

*💰 Budget Management*
/setbudget \\<category\\> \\<amount\\>
_Example: /setbudget food 3000_
/budgets \\- Check all budgets with progress bars

*📉 Charts*
/chartcategory \\- Pie chart by category
/chartweek \\- Bar chart for this week

*Categories:* food, transport, shopping, bills, others
`.trim();

  bot.sendMessage(chatId, reply, { parse_mode: 'MarkdownV2' });
}

module.exports = { handleToday, handleMonth, handleSummary, handleHelp };

