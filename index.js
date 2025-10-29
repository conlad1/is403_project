require("dotenv").config();

let express = require('express');
let session = require('express-session');
let path = require('path');

const port = process.env.PORT || 3000;

let app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true}));