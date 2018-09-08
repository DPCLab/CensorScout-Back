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
        const key = datastore.key(['post', uuidv1()]);
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const text = req.body.text;
        const data = {
            key: key,
            data: {
                text: text,
                ip: ip
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
            throw new Error("text too long");
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

app.use(bodyParser.json());

app.get('/', (req, res) => serveInfoPage(req, res));
app.post('/v1', (req, res) => writeCensoredPost(req, res));

app.listen(port, () => console.log(`Running on port ${port}...`));