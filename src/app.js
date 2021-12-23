const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model');
const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

// routes
const contracts = require('./routes/contracts');
const jobs = require('./routes/jobs');
const balances = require('./routes/balances');
const admin = require('./routes/admin');

// use routes
app.use('/contracts', contracts);
app.use('/jobs', jobs);
app.use('/balances', balances);
app.use('/admin', admin);

module.exports = app;
