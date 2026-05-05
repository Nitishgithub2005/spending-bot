const QuickChart = require('quickchart-js');
async function generateBarChart(labels, data, title) {
  const chart = new QuickChart();
  chart.setConfig({
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '₹ Spent',
        data,
        backgroundColor: [
          '#4e79a7', '#f28e2b', '#e15759',
          '#76b7b2', '#59a14f', '#edc948'
        ]
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: title }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
  chart.setWidth(600).setHeight(400);
  return chart.toBinary(); // returns a buffer, same as before
}

async function generatePieChart(labels, data, title) {
  const chart = new QuickChart();
  chart.setConfig({
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#4e79a7', '#f28e2b', '#e15759',
          '#76b7b2', '#59a14f', '#edc948'
        ]
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: title },
        legend: { position: 'bottom' }
      }
    }
  });
  chart.setWidth(600).setHeight(400);
  return chart.toBinary();
}

module.exports = { generateBarChart, generatePieChart };