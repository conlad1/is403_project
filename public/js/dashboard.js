(function () {
  const data = window.DASHBOARD_DATA;
  if (!data) return;

  const hourlyCtx = document.getElementById('hourlyChart');
  const weeklyCtx = document.getElementById('weeklyChart');

  if (hourlyCtx) {
    const labels = data.hourlyData.map(d => d.hour);
    const effectiveness = data.hourlyData.map(d => d.effectiveness);

    new Chart(hourlyCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Effectiveness',
            data: effectiveness
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  if (weeklyCtx) {
    const labels = data.weeklyData.map(d => d.day);
    const effectiveness = data.weeklyData.map(d => d.effectiveness);

    new Chart(weeklyCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Effectiveness',
            data: effectiveness,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }
})();