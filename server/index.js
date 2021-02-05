const http = require('http');
const path = require('path');
const express = require('express');
const socketIo = require('socket.io');
const needle = require('needle');
const { connect } = require('http2');
const config = require('dotenv').config();
const TOKEN = process.env.TWITTER_BEARER_TOKEN;
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const headers = { Authorization: `Bearer ${TOKEN}` };
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id';
const rules = [{ value: 'giveaway', value: 'xbox' }];

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'));
});

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

function streamTweets() {
    const stream = needle.get(streamURL, {
        headers : headers
    });

    stream.on('data', data => {
        try {
            const json = JSON.parse(data);
            console.log(json);
        } catch(err) {}
    })
}

io.on('connection', () => {
    console.log('client connected');
})

server.listen(PORT, () => console.log(`listening on ${PORT}`) )


// execute
// (async () => {
//     let currentRules;
//     try {
//         // get current rules
//         currentRules = await getRules();
//         // delete current rules
//         await deleteRules(currentRules);
//         // set new rules
//         await setRules();
//         await streamTweets();
//     } catch(err) {
//         console.error(err);
//         process.exit(1);
//     }
// })()