# Rdr 
> A simple, streamlined application for keeping track of the books you have read and the books you want to read.

## Team

  - __Product Owner__: Ben Baum
  - __Scrum Master__: Michelle Thorsell 
  - __Development Team Members__: Jordan Murphy, Josh Reisenbach

## Table of Contents

1. [Usage](#Usage)
1. [Requirements](#requirements)
1. [Development](#development)
    1. [Installing Dependencies](#installing-dependencies)
    1. [Tasks](#tasks)
1. [Team](#team)
1. [Contributing](#contributing)

## Usage

> Fork and clone this repo. From the `mysql` command line: 
> 
```
mysql> create database booklist;
mysql> use booklist;
```

## Requirements

- Node >= 0.10.41 (tested only on 0.10.41, 0.12.7, and 5.5.0) 
- MySQL 5.5.x (higher versions known to be incompatible)
 - If you are running MySQL > 5.5.x, we recommend using `homebrew` to uninstall your current version and install the correct one. Run `brew uninstall mysql`, and then `brew install homebrew/versions/mysql55`. If the `mysql` command no longer works from the command line, you may have to reference your new version via `/usr/local/opt/mysql55/bin/mysql` (and you can create an alias for that path). 


## Development


### Installing Dependencies

From within the root directory:

```sh
sudo npm install -g bower
sudo npm install -g grunt-cli

npm install 
// runs bower install for you

grunt watch:dev 
// continuous compilation, concatenation, and minification of files

npm start 
// uses nodemon
```
The server runs on port 8080 by default.

In production: 

```
node server/server.js 
```

Booting up the server for the first time will create the db schema. 

### Amazon Web Services
[Create an AWS account](https://aws.amazon.com/). In the AWS console, click on your name on the top right of the screen and select **Security Credentials** from the dropdown. Select **Access Keys** and note your **Access Key ID** and **Secret Key**.

### Amazon Associates
Sign up for the [Amazon Associates Program](https://affiliate-program.amazon.com/). Note your Tracking ID.

### Auth0
Create an [Auth0](https://auth0.com/) account, and specify Amazon as an authentication method. Note your Client ID, Client Secret, and domain. 

Make sure your allowed callback URLs are set up appropriately (include at least http://localhost:8080/ and http://127.0.0.1:8080/).

**IMPORTANT:** Auth0 credentials must be specified as environment variables (described below), but also in `app.routes.js`, specifically in the `.config(['authProvider...` block.

### Environment Variables

**Development:**
Create a `.env` file in the root directory that you do not commit to version control. Example files can be found on [the node-env-file npm page](https://www.npmjs.com/package/node-env-file).

The variables you need to define are: 

- `DB_USER` (mysql username)
- `DB_PASSWORD` (`''` if none)
- `AWS_ACCESS_KEY_ID` (AWS access key)
- `AWS_SECRET_KEY` (AWS secret key)
- `AWS_ASSOCIATES_ID` (amazon associates tracking ID)
- `AUTH_ID` (auth0 client ID)
- `AUTH_SECRET` (auth0 secret)

**Production:**
Set these environment variables via your deployment solution (e.g. Heroku).

### Roadmap

View the project roadmap [here](https://github.com/hrr12T-Rex/greenfield/issues)


## Contributing

See [_CONTRIBUTING.md](https://github.com/hrr12T-Rex/greenfield/blob/master/_CONTRIBUTING.md) for contribution guidelines.
