var index = require('../index.js');
var mysql = require('./mysql.js');

var express = require('express');
var logger = require('morgan');
var compression = require('compression');
var helmet = require('helmet');
var whiskers = require('whiskers');
var request = require('requestretry');

var app = express();
app.engine('.html', whiskers.__express);
app.set('views', './public');
app.use(logger(':remote-addr - :req[X-Forwarded-For] [:date[clf]] ":method :url HTTP/:http-version" :status ":referrer" ":user-agent"'));
app.use(compression());
app.use(helmet());
app.listen(index.config.port);

app.get('/', async function (req, res) {
    if (req.query.token) {
        res.render('create.html', {
            TOKEN: req.query.token,
            ERROR: req.query.error || ""
        });
    } else res.redirect(302, `https://discordapp.com/api/oauth2/authorize?client_id=${encodeURIComponent(index.config.discordClient.id)}&redirect_uri=${encodeURIComponent(index.config.discordClient.redirectURI)}&response_type=code&scope=identify%20guilds.join`);
});

app.get('/api/create', async function (req, res) {
    request({
        url: 'https://discordapp.com/api/users/@me',
        headers: {
            'Authorization': 'Bearer ' + access_token
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
                var userData = JSON.parse(body);

                
            } catch (Exception) {
                res.status(500).send("An unknown error occurred. Please try again later.");
                console.error(Exception);
            }
        }
    });
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
                scope: 'identify guilds.join'
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
                    res.redirect(302, index.config.host + '/?token=' + encodeURIComponent(access_token));
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