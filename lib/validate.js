function validateExpenses(parsed) {
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(e =>
    e &&
    typeof e.item === 'string' && e.item.trim() !== '' &&
    typeof e.amount === 'number' && !isNaN(e.amount) && e.amount > 0
  );
}

module.exports = { validateExpenses };