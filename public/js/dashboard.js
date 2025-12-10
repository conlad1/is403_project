(function () {
  const data = window.DASHBOARD_DATA;
  if (!data) return;

  const hourlyCtx = document.getElementById('hourlyChart');
  const weeklyCtx = document.getElementById('weeklyChart');

  if (hourlyCtx && Array.isArray(data.hourlyData)) {
    const labels = data.hourlyData.map((d) => d.hour);
    const effectiveness = data.hourlyData.map((d) => d.effectiveness);

    new Chart(hourlyCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Average effectiveness',
            data: effectiveness,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: '#94a3b8',
              font: { size: 10 }
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            max: 10,
            ticks: {
              stepSize: 2,
              color: '#94a3b8',
              font: { size: 10 }
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.15)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  if (weeklyCtx && Array.isArray(data.weeklyData)) {
    const labels = data.weeklyData.map((d) => d.day);
    const effectiveness = data.weeklyData.map((d) => d.effectiveness);

    new Chart(weeklyCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Average effectiveness',
            data: effectiveness,
            tension: 0.35,
            fill: false,
            borderWidth: 2,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: '#94a3b8',
              font: { size: 10 }
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            max: 10,
            ticks: {
              stepSize: 2,
              color: '#94a3b8',
              font: { size: 10 }
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.15)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
})();