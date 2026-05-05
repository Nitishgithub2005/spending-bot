// Returns "YYYY-MM-DD" in IST
function getISTDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

// Current month boundaries as UTC Date objects
function getISTMonthRange(date = new Date()) {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const offset = 5.5 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(ist.getFullYear(), ist.getMonth(), 1) - offset);
  const end   = new Date(Date.UTC(ist.getFullYear(), ist.getMonth() + 1, 1) - offset);
  return { start, end };
}

// Last month boundaries as UTC Date objects
function getLastISTMonthRange(date = new Date()) {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const offset = 5.5 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(ist.getFullYear(), ist.getMonth() - 1, 1) - offset);
  const end   = new Date(Date.UTC(ist.getFullYear(), ist.getMonth(), 1) - offset);
  return { start, end };
}

// This week (Mon–Sun) boundaries as UTC Date objects
function getISTWeekRange(date = new Date()) {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);

  const monday = new Date(ist);
  monday.setDate(ist.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);

  const offset = 5.5 * 60 * 60 * 1000;
  return {
    start: new Date(monday.getTime() - offset),
    end:   new Date(sunday.getTime() - offset)
  };
}

module.exports = { getISTDateKey, getISTMonthRange, getISTWeekRange, getLastISTMonthRange };