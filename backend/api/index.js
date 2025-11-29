const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.all('*', (req, res) => {
  if (req.url === '/' || req.url === '/timings') {
    const timings = { Fajr: '04:30', Dhuhr: '12:15', Asr: '15:45', Maghrib: '18:20', Isha: '19:45' };
    return res.json(req.url === '/' ? { msg: 'Hijri API running' } : timings);
  }
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
