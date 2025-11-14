require("dotenv").config();

let express = require('express');
let session = require('express-session');
let path = require('path');

const port = process.env.PORT || 3000;

let app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true}));


app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
}));

// connect to the database using env variables.
let knex = require('knex')({
    client: "pg",
    connection:  {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5434,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "admin",
        database: process.env.DB_NAME || "foodisus",
    }
});

// this tells express how to read form data send in the body of a request
app.use(express.urlencoded({ extended: true }));

//use authentication middleware - runs on every request
app.use((req, res, next) => {
    //skip authentication for login routes
    if (req.path === '/' || req.path === '/login' || req.path === '/logout') {
        return next();
    }

    //check if user is authenticated for all other routes
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.render('login', { error_message: 'Please log in ot access this page'});
    }
});



// main route - check if logged in
app.get('/', (req, res) => {
        res.render('index');
});

// create session object attributes upon login
app.post('/login', (req, res) => {
    let { username, password } = req.body;

    // compare the login post data to the users in the database
    knex.select("username", "password")
    .from("users")
    .where({ username: username, password: password })
    .then((users) => {
        if(users.length > 0) {
            req.session.isLoggedIn = true;
            req.session.username = username;
            req.redirect('/userhome', { username: username});
        } else {
            // this means no matching user was found
            res.render('login', { error_message: 'Invalid login' });
        }
    })
    .catch(err => {
        // this means there was a databse or server error
        console.error("Login error: ", err);
        res.render('login', { error_message: 'Invalid Login' });
    });
});

// logout route to destory the session object
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    })
});

//new user route
app.get("/newuser", (req, res) => {
    if (req.session.isLoggedIn) {
        res.redirect('/logout');
    } else {
        res.render('newuser');
    }  
});

// create a new user
app.post('/newuser', (req, res) => {
    knex.select("username")
        .from("users")
        .where("username", req.body.username)
        .then(username => {
            if (username) {
                res.render('newuser', { error_message: 'Username unavailable: use something else'});
            } else {
                knex('users').insert(req.body)
                .then(users => {
                    res.redirect('/login', {newUserMessage: 'Please log in with newly created account'});
                }).catch(err => {
                    // this means there was a databse or server error
                    console.error("Login error: ", err);
                    res.render('login', { error_message: 'Invalid Login' });
                })
            }
        }).catch(err => {
            // this means there was a databse or server error
            console.error("Login error: ", err);
            res.render('login', { error_message: 'Invalid Login' });
        });
    
});

app.get('/userhome', (req, res) => {
    if (req.session.isLoggedIn) {
        knex.select()
            .from("daily_metric_summary")
            .where("username", req.session.username)
        .then( metrics => {

        
        res.render('userhome', {username: req.session.username,
                                metrics: metrics,
                                });
        }).catch(err => {
            // this means there was a databse or server error
            console.error("Login error: ", err);
            res.render('login', { error_message: 'Invalid Login' });
        });
    } else {
        res.redirect('/login', { error_message: "Please log in"});
    }
});

// app is listening on the specified port
app.listen(port, () => {
    console.log("The server is listening");
});