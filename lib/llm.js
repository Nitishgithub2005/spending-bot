const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function cleanJSON(text) {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

async function extractExpenses(text) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Extract expenses from text.
Return ONLY a JSON array. Empty array [] if nothing found.
Each item must have:
- item (string)
- amount (number only, no currency symbols)
- category (food, transport, shopping, bills, others)`
      },
      { role: 'user', content: text }
    ],
    temperature: 0
  });

  const raw = response.choices[0].message.content;
  const cleaned = cleanJSON(raw);

  try {
    return JSON.parse(cleaned);
  } catch {
    return null; // caller handles this
  }
}

module.exports = { extractExpenses };