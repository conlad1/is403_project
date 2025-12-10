const express = require('express');
const path = require('path');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// -------- Sample activity data for demo ----------
const activitiesSeed = [
  {
    date: '2025-12-09',
    activity: 'Deep work — client project',
    startTime: '09:00',
    endTime: '10:30',
    durationMinutes: 90,
    effectiveness: 9,
    distractions: 1
  },
  {
    date: '2025-12-09',
    activity: 'Email + admin',
    startTime: '10:45',
    endTime: '11:15',
    durationMinutes: 30,
    effectiveness: 6,
    distractions: 4
  },
  {
    date: '2025-12-09',
    activity: 'Study session',
    startTime: '14:00',
    endTime: '15:15',
    durationMinutes: 75,
    effectiveness: 8,
    distractions: 2
  },
  {
    date: '2025-12-08',
    activity: 'Morning planning',
    startTime: '08:30',
    endTime: '09:00',
    durationMinutes: 30,
    effectiveness: 7,
    distractions: 0
  },
  {
    date: '2025-12-08',
    activity: 'Scrolling on phone',
    startTime: '21:00',
    endTime: '21:45',
    durationMinutes: 45,
    effectiveness: 3,
    distractions: 7
  },
  {
    date: '2025-12-07',
    activity: 'Homework block',
    startTime: '19:00',
    endTime: '20:30',
    durationMinutes: 90,
    effectiveness: 8,
    distractions: 3
  },
  {
    date: '2025-12-07',
    activity: 'Gaming',
    startTime: '20:45',
    endTime: '22:00',
    durationMinutes: 75,
    effectiveness: 5,
    distractions: 5
  }
];

function buildAnalytics(activities) {
  const activitiesByDate = {};
  activities.forEach((a) => {
    if (!activitiesByDate[a.date]) {
      activitiesByDate[a.date] = [];
    }
    activitiesByDate[a.date].push(a);
  });

  function hourLabelFromTime(time) {
    const parts = time.split(':');
    const hour24 = parseInt(parts[0], 10);
    const suffix = hour24 >= 12 ? 'PM' : 'AM';
    const hour12Raw = hour24 % 12;
    const hour12 = hour12Raw === 0 ? 12 : hour12Raw;
    return `${hour12} ${suffix}`;
  }

  // ---- Hourly effectiveness buckets ----
  const hourBuckets = {};
  activities.forEach((a) => {
    const label = hourLabelFromTime(a.startTime);
    if (!hourBuckets[label]) {
      hourBuckets[label] = { totalEff: 0, count: 0 };
    }
    hourBuckets[label].totalEff += a.effectiveness;
    hourBuckets[label].count += 1;
  });

  const hourOrder = [
    '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
    '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
    '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
  ];

  const hourlyData = hourOrder
    .filter((label) => hourBuckets[label])
    .map((label) => ({
      hour: label,
      effectiveness: Math.round(
        hourBuckets[label].totalEff / hourBuckets[label].count
      )
    }));

  // ---- Weekly effectiveness buckets ----
  const dayBuckets = {};
  activities.forEach((a) => {
    const d = new Date(a.date);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue, ...
    if (!dayBuckets[dayName]) {
      dayBuckets[dayName] = { totalEff: 0, count: 0 };
    }
    dayBuckets[dayName].totalEff += a.effectiveness;
    dayBuckets[dayName].count += 1;
  });

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = dayOrder.map((day) => ({
    day,
    effectiveness: dayBuckets[day]
      ? Math.round(dayBuckets[day].totalEff / dayBuckets[day].count)
      : 0
  }));

  // ---- Summary stats ----
  let peakTimeLabel = null;
  let peakTimeEff = -Infinity;
  hourlyData.forEach((h) => {
    if (h.effectiveness > peakTimeEff) {
      peakTimeEff = h.effectiveness;
      peakTimeLabel = h.hour;
    }
  });

  let peakDayLabel = null;
  let peakDayEff = -Infinity;
  weeklyData.forEach((d) => {
    if (d.effectiveness > peakDayEff) {
      peakDayEff = d.effectiveness;
      peakDayLabel = d.day;
    }
  });

  let totalEff = 0;
  let totalDistractions = 0;
  let count = 0;
  activities.forEach((a) => {
    totalEff += a.effectiveness;
    totalDistractions += a.distractions;
    count += 1;
  });

  const summaryStats = {
    peakTimeLabel: peakTimeLabel || '—',
    peakDayLabel: peakDayLabel || '—',
    averageEffectiveness: count ? (totalEff / count).toFixed(1) : '0.0',
    averageDistractions: count ? (totalDistractions / count).toFixed(1) : '0.0'
  };

  return { activitiesByDate, hourlyData, weeklyData, summaryStats };
}

const analytics = buildAnalytics(activitiesSeed);

// -------- Routes --------

// ⬇️ Root goes to login now
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
  res.render('login', { pageTitle: 'Login' });
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    pageTitle: 'Dashboard',
    hourlyData: analytics.hourlyData,
    weeklyData: analytics.weeklyData,
    summaryStats: analytics.summaryStats
  });
});

app.get('/log-activity', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.render('log-activity', {
    pageTitle: 'Log Activity',
    today,
    activitiesByDate: analytics.activitiesByDate
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('FlowTrack prototype running on http://localhost:' + PORT);
});