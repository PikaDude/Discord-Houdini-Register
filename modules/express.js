var index = require('../index.js');
var mysql = require('./mysql.js');

var express = require('express');
var logger = require('morgan');
var compression = require('compression');
var helmet = require('helmet');
var whiskers = require('whiskers');
var bodyParser = require('body-parser');
var request = require('requestretry');

var app = express();
app.engine('.html', whiskers.__express);
app.set('views', './public/views');
app.use('/assets', express.static('public/assets'));
app.use(logger(':remote-addr - :req[X-Forwarded-For] [:date[clf]] ":method :url HTTP/:http-version" :status ":referrer" ":user-agent"'));
app.use(compression());
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(index.config.port);

app.get('/', async function (req, res) {
    res.redirect(302, `https://discordapp.com/api/oauth2/authorize?client_id=${encodeURIComponent(index.config.discordClient.id)}&redirect_uri=${encodeURIComponent(index.config.discordClient.redirectURI)}&response_type=code&scope=${(index.config.discordJoin.enabled) ? 'identify%20guilds.join' : 'identify'}`);
});

app.get('/create', async function (req, res) {
    res.render('create.html', {
        REGEX: index.config.account.allowedCharsRegex
    });
});

app.get('/complete', async function (req, res) {
    res.render('complete.html', {
        PLAY_HOST: index.config.playHost
    });
})

app.post('/api/create', async function (req, res) {
    if (req.body.token && req.body.name && req.body.password && req.body.color) {
        if (!new RegExp(index.config.account.allowedCharsRegex).test(req.body.name) || req.body.name.length < 4 || req.body.name.length > 12) {
            res.redirect(302, index.config.host + '/create?error=Invalid username.');
            return;
        }
        if (req.body.password.length < 4 || req.body.password.length > 30) {
            res.redirect(302, index.config.host + '/create?error=Invalid password.');
            return;
        }
        if (req.body.color < 1 || req.body.color > 15 || req.body.color == 14) {
            res.redirect(302, index.config.host + '/create?error=Invalid color.');
            return;
        }

        var usernameChecks = await mysql.checkUsername(req.body.name);
        if (usernameChecks.error) {
            res.redirect(302, index.config.host + '/create?error=Error communicating with database. Please try again later.');
            return;
        } else if (usernameChecks.length > 0) {
            res.redirect(302, index.config.host + '/create?error=Username is already taken.');
            return;
        }

        request({
            url: 'https://discordapp.com/api/users/@me',
            headers: {
                'Authorization': 'Bearer ' + req.body.token
            },
            retryStrategy: myRetryStrategy,
            delayStrategy: myDelayStrategy
        }, async function (err, response, body) {
            if (err) {
                res.redirect(302, index.config.host + '/create?error=Error communicating with Discord. Please try again later.');
                console.error(err);
            } else if (response.statusCode != 200) {
                res.redirect(302, index.config.host + '/create?error=Error communicating with Discord. Please try again later.');
                console.error(body);
            } else {
                try {
                    var discordData = JSON.parse(body);

                    if (index.config.discordJoin.enabled)
                        request({
                            url: `https://discordapp.com/api/v6/guilds/${index.config.discordJoin.serverID}/members/${discordData.id}`,
                            method: 'PUT',
                            json: {
                                access_token: req.body.token
                            },
                            headers: {
                                Authorization: 'Bot ' + index.config.discordJoin.botToken
                            },
                            retryStrategy: myRetryStrategy,
                            delayStrategy: myDelayStrategy
                        }, async function (err, response, body) {
                            if (err) {
                                console.error(err);
                            } else if (response.statusCode != 204) {
                                console.error(body);
                            }

                            var accountExists = await mysql.checkIfAccountUsed(discordData.id);
                            if (accountExists.error) {
                                res.redirect(302, index.config.host + '/create?error=Error communicating with database. Please try again later.');
                                return;
                            } else if (accountExists.length > 0) {
                                res.redirect(302, index.config.host + '/create?error=A penguin is already associated with this Discord account.');
                                return;
                            }

                            var insertedUser = await mysql.insertUser(req.body.name, req.body.password, req.body.color, discordData.id);
                            if (insertedUser.error) {
                                res.redirect(302, index.config.host + '/create?error=Error communicating with database. Please try again later.');
                                return;
                            } else {
                                res.redirect(302, index.config.host + '/complete');
                            }
                        });
                } catch (Exception) {
                    res.redirect(302, index.config.host + '/create?error=Error communicating with database. Please try again later.');
                    console.error(Exception);
                }
            }
        });
    } else res.status(400).send("Invalid body.");
});

app.get('/api/login', async function (req, res) {
    if (req.query.code) {
        request.post({
            uri: 'https://discordapp.com/api/oauth2/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: {
                grant_type: 'authorization_code',
                code: req.query.code,
                client_id: index.config.discordClient.id,
                client_secret: index.config.discordClient.secret,
                redirect_uri: index.config.discordClient.redirectURI,
                scope: (index.config.discordJoin.enabled) ? 'identify guilds.join' : 'identify'
            },
            retryStrategy: myRetryStrategy,
            delayStrategy: myDelayStrategy
        }, function (err, response, body) {
            if (err) {
                res.status(500).send("Error communicating with Discord. Please try again later.");
                console.error(err);
            } else if (response.statusCode != 200) {
                res.status(500).send("Error communicating with Discord. Please try again later.");
                console.error(body);
            } else {
                try {
                    var access_token = JSON.parse(body).access_token;
                    res.render('saveToken.html', {
                        TOKEN: access_token
                    });
                } catch (Exception) {
                    res.status(500).send("An unknown error occurred. Please try again later.");
                    console.error(Exception);
                }
            }
        })
    } else if (req.query.error) res.status(400).send(decodeURIComponent(req.query.error) + ": " + decodeURIComponent(req.query.error_description));
    else res.status(400).send("Must provide code. Did you deny the authorization?");
});

function myRetryStrategy(err, response) {
    if (response.statusCode == 429 || response.statusCode == 502 || response.statusCode == 500) {
        return true;
    } else if (err != null) {
        return true;
    } else return false;
}

function myDelayStrategy(err, response, body) {
    try {
        var jason = JSON.parse(body);
        if (jason.retry_after) {
            return jason.retry_after + 100
        } else {
            return 5000;
        }
    } catch (Exception) {
        return 5000;
    }
}