const path = require('path');
const fs = require('fs')
const express = require('express');
const OS = require('os');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const app = express();
const cors = require('cors')
const serverless = require('serverless-http')
require('dotenv').config();


app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));
app.use(cors())

mongoose.connect(process.env.MONGO_HOST, {
  user: process.env.MONGO_USERNAME,
  pass: process.env.MONGO_PASSWORD,
  authSource: "admin",          // <-- add this
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("MongoDB Connection Successful");
})
.catch(err => {
  console.log("error!! " + err);
});


const Schema = mongoose.Schema;

const dataSchema = new Schema({
    name: String,
    id: Number,
    description: String,
    image: String,
    velocity: String,
    distance: String
});
const planetModel = mongoose.model('planets', dataSchema);
// POST route to fetch planet by ID
app.post('/planet', async (req, res) => {
  try {
    const planet = await planetModel.findOne({ id: req.body.id });
    if (!planet) {
      return res.status(404).send({ error: 'Planet not found' });
    }
    res.status(200).send(planet);
  } catch (err) {
    console.error('Error fetching planet:', err);
    res.status(500).send({ error: 'Server error' });
  }
});

app.get('/',   async (req, res) => {
    res.sendFile(path.join(__dirname, '/', 'index.html'));
});

app.get('/api-docs', (req, res) => {
    fs.readFile('oas.json', 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading file:', err);
        res.status(500).send('Error reading file');
      } else {
        res.json(JSON.parse(data));
      }
    });
  });
  
app.get('/os',   function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "os": OS.hostname(),
        "env": process.env.NODE_ENV
    });
})

app.get('/live',   function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "status": "live"
    });
})

app.get('/ready',   function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "status": "ready"
    });
})

app.listen(3001, () => { console.log("Server successfully running on port - " +3001); })
module.exports = app;

//module.exports.handler = serverless(app)
