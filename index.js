require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { connectDB } = require('./db');
const { handleMessage } = require('./handlers/message');
// update the import line at the top
const { handleToday, handleMonth, handleSummary, handleHelp } = require('./handlers/commands');


const {
  handleWeek,
  handleTrends,
  handleAvgSpend,
  handleSetBudget,
  handleCheckBudgets,
  handleChartCategory,
  handleChartWeek
} = require('./handlers/analytics');

async function main() {
  await connectDB();

  const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

  // Commands
  bot.onText(/\/today/,         (msg) => handleToday(bot, msg));
  bot.onText(/\/month/,         (msg) => handleMonth(bot, msg));
  bot.onText(/\/summary/,       (msg) => handleSummary(bot, msg));
  bot.onText(/\/week/,          (msg) => handleWeek(bot, msg));
  bot.onText(/\/trends/,        (msg) => handleTrends(bot, msg));
  bot.onText(/\/avgspend/,      (msg) => handleAvgSpend(bot, msg));
  bot.onText(/\/setbudget/,     (msg) => handleSetBudget(bot, msg));
  bot.onText(/\/budgets/,       (msg) => handleCheckBudgets(bot, msg));
  bot.onText(/\/chartcategory/, (msg) => handleChartCategory(bot, msg));
  bot.onText(/\/chartweek/,     (msg) => handleChartWeek(bot, msg));
  // inside main(), add:
bot.onText(/\/help/, (msg) => handleHelp(bot, msg));

  // Natural language messages
  bot.on('message', (msg) => handleMessage(bot, msg));

  console.log('Bot running..');
}

main().catch(console.error); 