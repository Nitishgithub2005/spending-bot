function formatExpenseList(expenses, header = 'Added:') {
  const lines = expenses.map(e => `• ${e.item} — ₹${e.amount} (${e.category})`);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return `${header}\n${lines.join('\n')}\n\nTotal: ₹${total}`;
}

function formatCategoryBreakdown(groups) {
  // groups: [{ _id: 'food', total: 200, count: 3 }, ...]
  const lines = groups.map(g =>
    `• ${g._id}: ₹${g.total} (${g.count} item${g.count > 1 ? 's' : ''})`
  );
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  return lines.join('\n') + `\n\nTotal: ₹${grandTotal}`;
}

module.exports = { formatExpenseList, formatCategoryBreakdown };