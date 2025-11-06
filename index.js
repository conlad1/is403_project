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
    clinet: "pg",
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
    if (req.session.isLoggedIn) {
        res.render('index');
    } else {
        res.render('login', { error_message: ''});
    }
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
            req.redirect('/userhome');
        } else {
            // this means no matching user was found
            res.render('login', { error_message: 'Invalid login' });
        }
    })
    .catch(err => {
        // this means there was a databse or server error
        console.error("Login errorL: ", err);
        res.render('login', { error_message: 'Invalid Login' });
    });
});

// logout route to destory the session object
app.get('/logout', (res, rew) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    })
});

// app is listening on the specified port
app.listen(port, () => {
    console.log("The server is listening");
})