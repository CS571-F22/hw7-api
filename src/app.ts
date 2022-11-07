
import express from 'express';
import * as fs from 'fs'
import { format } from 'path';
import { exit } from 'process';

import rateLimit from 'express-rate-limit';
import errorHandler from 'errorhandler';
import morgan from 'morgan';

import bodyParser from 'body-parser';

const app = express();
const port = 56937;

const COLE_LOCAL = false;
const FS_INCLUDES = COLE_LOCAL ? "C:/Users/ColeNelson/Desktop/cs571-git/homework/apis/hw7-api/includes" : "/secrets" // so secretive!

const NEWS_ARTICLES = JSON.parse(fs.readFileSync(`${FS_INCLUDES}/articles.json`).toString());

const MINI_NEWS_ARTICLES = NEWS_ARTICLES.map((art: any) => {
    return {
        id: art.id,
        title: art.title,
        img: art.img,
        tags: art.tags
    }
});

const ALL_TAGS = [...new Set(NEWS_ARTICLES.reduce((p: any, c: any) => p.concat(c.tags), []))]

const IMGS = NEWS_ARTICLES.map((art: any) => art.img.split("/").slice(-1)[0])

// https://stackoverflow.com/questions/14636536/how-to-check-if-a-variable-is-an-integer-in-javascript
function isInt(value: any) {
    return !isNaN(value) &&
        parseInt(Number(value) as any) == value &&
        !isNaN(parseInt(value, 10));
}

app.use(morgan(':date ":method :url" :status :res[content-length] - :response-time ms'));

morgan.token('date', function () {
    var p = new Date().toString().replace(/[A-Z]{3}\+/, '+').split(/ /);
    return (p[2] + '/' + p[1] + '/' + p[3] + ':' + p[4] + ' ' + p[5]);
});

process.on('uncaughtException', function (exception) {
    console.log(exception);
});

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
});

app.use(errorHandler());

// JSON Body Parser Configuration
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// // Request Throttler
app.set('trust proxy', 1);
const limiter = rateLimit({
    windowMs: 30 * 1000, // 1/2 minute
    max: 100 // limit each IP to 100 requests per windowMs (1/2 minute)
});
app.use(limiter);

// Allow CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,OPTIONS');
    next();
});

app.get('/api/news/tags', (req: any, res) => {
    res.status(200).send(ALL_TAGS);
});

app.get('/api/news/articles', (req: any, res) => {
    res.status(200).send(MINI_NEWS_ARTICLES);
});

app.get('/api/news/articles/:artNum', (req: any, res) => {
    const artNum = req.params.artNum;
    if(isInt(artNum) && artNum >= 0 && artNum < NEWS_ARTICLES.length) {
        res.status(200).send(NEWS_ARTICLES[parseInt(artNum)]);
    } else {
        res.status(400).send({
            msg: "Please specify a valid article number."
        })
    }
});

IMGS.forEach((img: any) => {
    app.get(`/api/news/images/${img}`, (req: any, res) => {
        res.set({
            "Cache-Control": "public, max-age=86400",
            "Expires": new Date(Date.now() + 86400000).toUTCString()
        }).status(200).sendFile(`${FS_INCLUDES}/${img}.jpg`);
    });
})

// Error Handling
app.use((err: any, req: any, res: any, next: any) => {
    console.error(err)
    let datetime: Date = new Date();
    let datetimeStr: string = `${datetime.toLocaleDateString()} ${datetime.toLocaleTimeString()}`;
    console.log(`${datetimeStr}: Encountered an error processing ${JSON.stringify(req.body)}`);
    res.status(500).send({
        "error-msg": "Oops! Something went wrong. Check to make sure that you are sending a valid request. Your recieved request is provided below. If it is empty, then it was most likely not provided or malformed. If you have verified that your request is valid, please contact the CS571 staff.",
        "error-req": JSON.stringify(req.body),
        "date-time": datetimeStr
    })
});

// Open Server for Business
app.listen(port, () => {
    console.log(`CS571 API :${port}`)
});
