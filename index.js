const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ msg: 'Hijri API running' });
});

app.get('/timings', (req, res) => {
  const timings = { Fajr: '04:30', Dhuhr: '12:15', Asr: '15:45', Maghrib: '18:20', Isha: '19:45' };
  res.json(timings);
});

module.exports = app;
