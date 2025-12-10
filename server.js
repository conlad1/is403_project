const express = require('express');
const path = require('path');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// ----- Mock data (from your React dashboard) -----
const hourlyData = [
  { hour: '6 AM', effectiveness: 45, tasks: 2 },
  { hour: '7 AM', effectiveness: 60, tasks: 3 },
  { hour: '8 AM', effectiveness: 75, tasks: 5 },
  { hour: '9 AM', effectiveness: 85, tasks: 7 },
  { hour: '10 AM', effectiveness: 92, tasks: 8 },
  { hour: '11 AM', effectiveness: 88, tasks: 7 },
  { hour: '12 PM', effectiveness: 70, tasks: 4 },
  { hour: '1 PM', effectiveness: 55, tasks: 3 },
  { hour: '2 PM', effectiveness: 65, tasks: 5 },
  { hour: '3 PM', effectiveness: 78, tasks: 6 },
  { hour: '4 PM', effectiveness: 82, tasks: 7 },
  { hour: '5 PM', effectiveness: 68, tasks: 4 },
  { hour: '6 PM', effectiveness: 50, tasks: 2 }
];

const weeklyData = [
  { day: 'Mon', effectiveness: 82 },
  { day: 'Tue', effectiveness: 88 },
  { day: 'Wed', effectiveness: 85 },
  { day: 'Thu', effectiveness: 90 },
  { day: 'Fri', effectiveness: 75 },
  { day: 'Sat', effectiveness: 60 },
  { day: 'Sun', effectiveness: 55 }
];

const stats = [
  { label: 'Peak Time', value: '10 AM' },
  { label: 'Avg Effectiveness', value: '78%' },
  { label: 'Goals Completed', value: '12/15' },
  { label: 'Productivity Score', value: '92' }
];

// Simple mock goals
const initialGoals = [
  {
    id: '1',
    title: 'Deep work block',
    description: '2 hours of distraction-free work each morning',
    targetDate: '2025-12-31',
    completed: false,
    progress: 40
  },
  {
    id: '2',
    title: 'Limit social media',
    description: 'Keep social apps under 30 minutes per day',
    targetDate: '2025-12-31',
    completed: true,
    progress: 100
  }
];

// ----- Routes -----

// Redirect root to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login', { pageTitle: 'Login' });
});

// Fake login – always success, just redirect
app.post('/login', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    pageTitle: 'Dashboard',
    stats,
    hourlyData,
    weeklyData
  });
});

app.get('/goals', (req, res) => {
  res.render('goals', {
    pageTitle: 'Goals',
    goals: initialGoals
  });
});

app.get('/log-activity', (req, res) => {
  res.render('log-activity', {
    pageTitle: 'Log Activity'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Productivity dashboard running on http://localhost:${PORT}`);
});