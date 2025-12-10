require('dotenv').config({ path: '.env.local' });
const express = require('express');
const path = require('path');
const session = require('express-session');
const knex = require('knex');

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// DATABASE CONNECTION (Knex)
// =======================
const db = knex({
  client: process.env.DB_CLIENT || 'pg',
  connection: {
    host: process.env.RDS_HOSTNAME || process.env.RDS_HOST || process.env.DB_HOST || 'localhost',
    port: process.env.RDS_PORT || process.env.DB_PORT || 5432,
    user: process.env.RDS_USERNAME || process.env.RDS_USER || process.env.DB_USER || 'is403',
    password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD || 'is403admin',
    database: process.env.RDS_DB_NAME || process.env.RDS_DATABASE || process.env.DB_DATABASE || 'ebdb',
    ssl: {
        rejectUnauthorized: false,   // ✅ use SSL, don't validate cert
      },
  },
});

// Test database connection on startup
db.raw('SELECT 1')
  .then(() => {
    console.log('Database connection established successfully');
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'is403-user-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Helper function to build analytics from activity sessions
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
    if (a.startTime) {
      const label = hourLabelFromTime(a.startTime);
      if (!hourBuckets[label]) {
        hourBuckets[label] = { totalEff: 0, count: 0 };
      }
      hourBuckets[label].totalEff += a.effectiveness;
      hourBuckets[label].count += 1;
    }
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

// -------- Routes --------

// ⬇️ Root goes to login now
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
  if (req.session.isLoggedIn) {
    res.redirect('/dashboard');
  } else {
    res.render('login', { pageTitle: 'Login', error_message: null });
  }
});

// Login POST - authenticate user
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.render('login', { 
      pageTitle: 'Login', 
      error_message: 'Please enter both email and password' 
    });
  }

  // Query User table to get user by email and compare password
  db.select('userid', 'email', 'passwordhash', 'displayname')
    .from('user')
    .where('email', email)
    .then((users) => {
      if (users.length > 0) {
        const user = users[0];
        // Compare password with passwordhash (stored as plain text for now)
        if (user.passwordhash === password) {
          req.session.isLoggedIn = true;
          req.session.userid = user.userid;
          req.session.email = user.email;
          req.session.displayname = user.displayname;
          res.redirect('/dashboard');
        } else {
          res.render('login', { 
            pageTitle: 'Login', 
            error_message: 'Invalid email or password' 
          });
        }
      } else {
        res.render('login', { 
          pageTitle: 'Login', 
          error_message: 'Invalid email or password' 
        });
      }
    })
    .catch(err => {
      console.error('Login error: ', err);
      res.render('login', { 
        pageTitle: 'Login', 
        error_message: 'Error logging in. Please try again.' 
      });
    });
});

// New user page
app.get('/newuser', (req, res) => {
  if (req.session.isLoggedIn) {
    res.redirect('/dashboard');
  } else {
    res.render('newuser', { pageTitle: 'Create Account', error_message: null });
  }
});

// Create new user POST
app.post('/newuser', (req, res) => {
  const { email, password, displayname } = req.body;

  // Check if email already exists
  db.select('email')
    .from('user')
    .where('email', email)
    .then(existingUsers => {
      if (existingUsers.length > 0) {
        res.render('newuser', { pageTitle: 'Create Account', error_message: 'Email already registered. Please use a different email.' });
      } else {
        // Insert into User table
        db('user').insert({
          email: email,
          passwordhash: password, // Plain text for now
          displayname: displayname || null,
          isdemouser: false
        })
        .returning('userid')
        .then(userIds => {
          req.session.isLoggedIn = true;
          req.session.userid = userIds[0];
          req.session.email = email;
          req.session.displayname = displayname;
          res.redirect('/dashboard');
        })
        .catch(err => {
          console.error('New user error: ', err);
          res.render('newuser', { pageTitle: 'Create Account', error_message: 'Error creating account. Please try again.' });
        });
      }
    })
    .catch(err => {
      console.error('New user error: ', err);
      res.render('newuser', { pageTitle: 'Create Account', error_message: 'Error creating account. Please try again.' });
    });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect('/login');
  });
});

// Dashboard - show user's activity sessions
app.get('/dashboard', (req, res) => {
  if (!req.session.isLoggedIn) {
    res.redirect('/login');
    return;
  }

  const userid = req.session.userid;

  // Query activitysession table for this user (excluding deleted records)
  db.select(
    'activitysessionid',
    'startdatetime',
    'enddatetime',
    'durationminutes',
    'activitytitle',
    'effectivenessscore',
    'distractioncount',
    'notes'
  )
    .from('activitysession')
    .where('userid', userid)
    .where('isdeleted', false)
    .orderBy('startdatetime', 'desc')
    .then(sessions => {
      // Build analytics from database sessions
      const activities = sessions
        .filter(session => session.startdatetime) // Only process sessions with required fields
        .map(session => {
          const startDateTime = session.startdatetime instanceof Date 
            ? session.startdatetime 
            : new Date(session.startdatetime);
          const endDateTime = session.enddatetime 
            ? (session.enddatetime instanceof Date 
                ? session.enddatetime 
                : new Date(session.enddatetime))
            : null;
          
          return {
            date: startDateTime.toISOString().slice(0, 10),
            activity: session.activitytitle,
            startTime: startDateTime.toTimeString().slice(0, 5),
            endTime: endDateTime ? endDateTime.toTimeString().slice(0, 5) : null,
            durationMinutes: session.durationminutes || 0,
            effectiveness: session.effectivenessscore || 0,
            distractions: session.distractioncount || 0
          };
        });

      const analytics = buildAnalytics(activities);

      res.render('dashboard', {
        pageTitle: 'Dashboard',
        displayname: req.session.displayname,
        hourlyData: analytics.hourlyData,
        weeklyData: analytics.weeklyData,
        summaryStats: analytics.summaryStats,
        sessions: sessions
      });
    })
    .catch(err => {
      console.error('Dashboard error: ', err);
      res.render('dashboard', {
        pageTitle: 'Dashboard',
        displayname: req.session.displayname,
        hourlyData: [],
        weeklyData: [],
        summaryStats: {
          peakTimeLabel: '—',
          peakDayLabel: '—',
          averageEffectiveness: '0.0',
          averageDistractions: '0.0'
        },
        sessions: []
      });
    });
});

// Log activity page
app.get('/log-activity', (req, res) => {
  if (!req.session.isLoggedIn) {
    res.redirect('/login');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  
  // Get user's recent activity sessions for display
  db.select(
    'activitysessionid',
    'startdatetime',
    'enddatetime',
    'durationminutes',
    'activitytitle',
    'effectivenessscore',
    'distractioncount',
    'notes'
  )
    .from('activitysession')
    .where('userid', req.session.userid)
    .where('isdeleted', false)
    .orderBy('startdatetime', 'desc')
    .limit(50)
    .then(sessions => {
      // Format sessions to match what logActivity.js expects
      const activitiesByDate = {};
      sessions.forEach(session => {
        if (!session.startdatetime) return;
        
        const startDateTime = session.startdatetime instanceof Date
          ? session.startdatetime
          : new Date(session.startdatetime);
        const date = startDateTime.toISOString().slice(0, 10);
        
        if (!activitiesByDate[date]) {
          activitiesByDate[date] = [];
        }
        
        // Format times as HH:MM strings
        const startTime = startDateTime.toTimeString().slice(0, 5);
        const endTime = session.enddatetime 
          ? (session.enddatetime instanceof Date
              ? session.enddatetime
              : new Date(session.enddatetime)).toTimeString().slice(0, 5)
          : '';
        
        activitiesByDate[date].push({
          activitysessionid: session.activitysessionid,
          activity: session.activitytitle,
          date: date,
          startTime: startTime,
          endTime: endTime,
          durationMinutes: session.durationminutes || 0,
          effectiveness: session.effectivenessscore || 0,
          distractions: session.distractioncount || 0,
          notes: session.notes || ''
        });
      });

      res.render('log-activity', {
        pageTitle: 'Log Activity',
        today,
        activitiesByDate: activitiesByDate
      });
    })
    .catch(err => {
      console.error('Log activity error: ', err);
      res.render('log-activity', {
        pageTitle: 'Log Activity',
        today,
        activitiesByDate: {}
      });
    });
});

// Log activity POST - create new activity session
app.post('/log-activity', (req, res) => {
  if (!req.session.isLoggedIn) {
    res.redirect('/login');
    return;
  }

  // Handle both FormData and JSON
  const activitydate = req.body.activitydate || req.body.activityDate;
  const starttime = req.body.starttime || req.body.startTime;
  const endtime = req.body.endtime || req.body.endTime;
  const durationminutes = req.body.durationminutes || req.body.durationMinutes;
  const activitytitle = req.body.activitytitle || req.body.activityName || req.body.activity;
  const effectivenessscore = req.body.effectivenessscore || req.body.effectiveness;
  const distractioncount = req.body.distractioncount || req.body.distractions;
  const notes = req.body.notes || '';
  const activitysessionid = req.body.activitysessionid;

  // Validate required fields
  if (!activitytitle || !activitydate || !starttime || !endtime) {
    console.error('Missing required fields:', { activitytitle, activitydate, starttime, endtime });
    return res.redirect('/log-activity');
  }

  const userid = req.session.userid;

  // Combine date and time into datetime
  // Ensure time is in HH:MM format (add :00 if only HH is provided)
  const formattedStartTime = starttime.includes(':') ? starttime : `${starttime}:00`;
  const formattedEndTime = endtime.includes(':') ? endtime : `${endtime}:00`;
  
  const startdatetime = new Date(`${activitydate}T${formattedStartTime}`);
  const enddatetime = new Date(`${activitydate}T${formattedEndTime}`);
  
  // Validate datetime objects
  if (isNaN(startdatetime.getTime()) || isNaN(enddatetime.getTime())) {
    console.error('Invalid datetime:', { activitydate, starttime, endtime });
    return res.redirect('/log-activity');
  }

  // If activitysessionid is provided, update existing record
  if (activitysessionid) {
    // Verify the session belongs to the user
    db('activitysession')
      .where('activitysessionid', activitysessionid)
      .where('userid', userid)
      .where('isdeleted', false)
      .update({
        startdatetime: startdatetime,
        enddatetime: enddatetime,
        durationminutes: durationminutes ? parseInt(durationminutes) : null,
        activitytitle: activitytitle,
        effectivenessscore: effectivenessscore ? parseInt(effectivenessscore) : null,
        distractioncount: distractioncount ? parseInt(distractioncount) : null,
        notes: notes || null,
        updatedat: new Date()
      })
      .then(updated => {
        if (updated > 0) {
          res.redirect('/dashboard');
        } else {
          res.redirect('/log-activity');
        }
      })
      .catch(err => {
        console.error('Update activity error: ', err);
        res.redirect('/log-activity');
      });
  } else {
    // Insert new record into activitysession table
    db('activitysession').insert({
      userid: userid,
      startdatetime: startdatetime,
      enddatetime: enddatetime,
      durationminutes: durationminutes ? parseInt(durationminutes) : null,
      activitytitle: activitytitle,
      effectivenessscore: effectivenessscore ? parseInt(effectivenessscore) : null,
      distractioncount: distractioncount ? parseInt(distractioncount) : null,
      notes: notes || null,
      isdeleted: false
    })
      .then(() => {
        res.redirect('/dashboard');
      })
      .catch(err => {
        console.error('Log activity POST error: ', err);
        res.redirect('/log-activity');
      });
  }
});

// Delete activity session
app.delete('/log-activity/:id', (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const activitysessionid = parseInt(req.params.id);
  const userid = req.session.userid;

  // Soft delete - set isdeleted to true
  db('activitysession')
    .where('activitysessionid', activitysessionid)
    .where('userid', userid)
    .where('isdeleted', false)
    .update({
      isdeleted: true,
      updatedat: new Date()
    })
    .then(updated => {
      if (updated > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Activity not found' });
      }
    })
    .catch(err => {
      console.error('Delete activity error: ', err);
      res.status(500).json({ error: 'Error deleting activity' });
    });
});

// Get activity session for editing
app.get('/log-activity/:id', (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const activitysessionid = parseInt(req.params.id);
  const userid = req.session.userid;

  db.select(
    'activitysessionid',
    'startdatetime',
    'enddatetime',
    'durationminutes',
    'activitytitle',
    'effectivenessscore',
    'distractioncount',
    'notes'
  )
    .from('activitysession')
    .where('activitysessionid', activitysessionid)
    .where('userid', userid)
    .where('isdeleted', false)
    .first()
    .then(session => {
      if (session && session.startdatetime) {
        // Format for client
        const startDateTime = session.startdatetime instanceof Date
          ? session.startdatetime
          : new Date(session.startdatetime);
        const startTime = startDateTime.toTimeString().slice(0, 5);
        const endTime = session.enddatetime 
          ? (session.enddatetime instanceof Date
              ? session.enddatetime
              : new Date(session.enddatetime)).toTimeString().slice(0, 5)
          : '';
        const date = startDateTime.toISOString().slice(0, 10);

        res.json({
          activitysessionid: session.activitysessionid,
          activity: session.activitytitle,
          date: date,
          startTime: startTime,
          endTime: endTime,
          durationMinutes: session.durationminutes || 0,
          effectiveness: session.effectivenessscore || 0,
          distractions: session.distractioncount || 0,
          notes: session.notes || ''
        });
      } else {
        res.status(404).json({ error: 'Activity not found' });
      }
    })
    .catch(err => {
      console.error('Get activity error: ', err);
      res.status(500).json({ error: 'Error fetching activity' });
    });
});

app.listen(PORT, () => {
  console.log('FlowTrack prototype running on http://localhost:' + PORT);
});