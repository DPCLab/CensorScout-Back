const fs = require('fs');
const Datastore = require('@google-cloud/datastore');
const uuidv1 = require('uuid/v1');
var bodyParser = require('body-parser');
var express = require('express'),
    app = express(),
    port = parseInt(process.env.PORT, 10) || 3000;

const projectId = process.env.GOOGLE_PROJECT_ID;

const datastore = new Datastore({
    projectId: projectId,
});

function serveInfoPage(req, res) {
    var stream = fs.createReadStream("src/static/info.html");
    stream.pipe(res);
};

function writeCensoredPost(req, res) {
    let status = "UNKNOWN";

    try {
        const key = datastore.key(['BrowserExtensionPost', uuidv1()]);
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const text = req.body.text;
        const time = new Date();
        const data = {
            key: key,
            data: {
                text: text,
                ip: ip,
                time: time,
                source: "censorscout"
            }
        }
        if (text.length < 4096) {
            datastore.save(data).then(() => {
                    console.log(`Saved censored post from ${data.data.ip}: ${data.data.text}`);
                })
                .catch(err => {
                    console.error('ERROR: ', err);
                });;
            status = "OK";
            console.log(`+ "${text}" from ${ip}`);
        } else {
            throw new Error("Text too long");
        }
    } catch (error) {
        status = "ERR";
        console.error(error);
    }

    const jsonResponse = {
        "status": status
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(jsonResponse));
}

function correspondUserVersion(req, res) {
    const LATEST_VERSION = 1;
    const LATEST_VERSION_URL = "https://github.com/dpccdn";

    try {
        const key = datastore.key(['BrowserExtensionPing', uuidv1()]);
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const version = req.body.version;
        const time = new Date();
        if(version == undefined || parseInt(version) == NaN){
            throw new Error("Invalid version");
        }
        const data = {
            key: key,
            data: {
                version: version,
                ip: ip,
                time: time
            }
        }
        datastore.save(data).then(() => {})
            .catch(err => {
                console.error('ERROR: ', err);
            });;
        status = "OK";
        console.log(`Ping using v"${version}" from ${ip}`);
    } catch (error) {
        status = "ERR";
        console.error(error);
    }

    const jsonResponse = {
        "status": status,
        "latestVersion": LATEST_VERSION,
        "url": LATEST_VERSION_URL
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(jsonResponse));
}

app.use(bodyParser.json());

app.get('/', (req, res) => serveInfoPage(req, res));
app.post('/v1/post', (req, res) => writeCensoredPost(req, res));
app.post('/v1/version', (req, res) => correspondUserVersion(req, res));

app.listen(port, () => console.log(`Running on port ${port}...`));