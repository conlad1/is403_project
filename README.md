# is403_project

# Roles:

## Backend
    Andrew
        log and goal routes

    Conrad
        Deployment + basic routes

## Routes
  ###  Landing page
        Routes
            get
            skip or welcome if session logged in

        Security

        Data
            static

  ###  Login Page
        get
        post

    security
        check if loggedin skip to user home page

    Data
        user table


  ###  New User page
        get
        post
    Security
        don't display if logged in
    Data
        insert into user table

   ### User Home Page
        get
    Security
        only grab and send data for logged in user
    Data
        users table
        productivity statistics

   ### Productivity Log Page
        get
        post
        patch
        delete
    Security
        only display data for logged in user

   ### Goals Input Page
        get - view exisiting goals
        post - add new goals
        patch - edit existing goals
        delete - delete bad or accident goals
        only grab and interact with specific user goals who is logged in

## Front End
    Ethan

## Database
    Ygor