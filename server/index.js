const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');
const needle = require('needle');
const { connect } = require('http2');
const config = require('dotenv').config();
const TOKEN = process.env.TWITTER_BEARER_TOKEN;
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const jsonParser = bodyParser.json()

const headers = { Authorization: `Bearer ${TOKEN}` };
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id';
let rules = [{ value: 'weather' }];

// load index
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'));
});

// load supporting style sheet
app.get('/style.css', function(req, res) {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'style.css'));
});

app.post('/rule', jsonParser, (req, res) => {
    updateRules(req.body.searchTerm);
    res.status(200).send(req.body.searchTerm);
});

async function updateRules(value) {
    rules = [{ value }];
    let currentRules;
    try {
        // get current rules
        currentRules = await getRules();
        // delete current rules
        await deleteRules(currentRules);
        // set new rules
        await setRules();
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

async function getRules() {
    const response = await needle('get', rulesURL, {
        headers : headers
    });
    return response.body;
}

async function setRules() {
    const data = {
        add: rules
    }
    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    });

    return response.body;
}

async function deleteRules(rules) {
    if(!Array.isArray(rules.data)) {
        return null;
    }
    let ids = rules.data.map(rule => rule.id);
    const data = {
        delete: {
            ids
        }
    }
    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    });

    return response.body;
}

function streamTweets(socket) {
    const stream = needle.get(streamURL, {
        headers : headers
    });

    stream.on('data', data => {
        try {
            const json = JSON.parse(data);
            socket.emit('tweet', json);
        } catch(err) {}
    })
}

io.on('connection', async () => {
    streamTweets(io);
});

server.listen(PORT, () => console.log(`listening on ${PORT}`) )
