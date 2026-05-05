const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const renderer = new ChartJSNodeCanvas({ width: 600, height: 400, backgroundColour: 'white' });

async function generateBarChart(labels, data, title) {
  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '₹ Spent',
        data,
        backgroundColor: [
          '#4e79a7', '#f28e2b', '#e15759',
          '#76b7b2', '#59a14f', '#edc948'
        ],
        borderRadius: 6
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: title, font: { size: 16 } },
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `₹${v}` } }
      }
    }
  };
  return renderer.renderToBuffer(config);
}

async function generatePieChart(labels, data, title) {
  const config = {
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
        title: { display: true, text: title, font: { size: 16 } },
        legend: { position: 'bottom' }
      }
    }
  };
  return renderer.renderToBuffer(config);
}

module.exports = { generateBarChart, generatePieChart };