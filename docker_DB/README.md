# FOLLOW THE STEPS BELOW TO BUILD AND RUN 
# LOCAL DEV DATABASE 

this database will have a test user and 
data in all the tables that can be used in developement. 

simply run the following in your terminal

## BUILD AND RUN DB ON LOCALHOST
cd docker_DB
docker compose up -d


# To stop the DB
docker compose down
docker volume rm is403projectadhd_pgdata

# To run again...see first step

# IMPORTANT

It should be part of main in the git repo,
but make sure the new .env DB connection variables looks like this:

DB_HOST=localhost
DB_PORT=5435
DB_USER=postgres
DB_PASSWORD=admin
DB_NAME=adhd