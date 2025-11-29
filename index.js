const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.get('/', (req, res) => res.json({ msg: 'Hijri API running' }));

// Fetch prayer times by city
app.get('/timings', async (req, res) => {
  const city = req.query.city || 'Karachi';
  const country = req.query.country || 'Pakistan';
  const method = req.query.method || '1';

  try {
    const response = await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=${method}`);
    res.json(response.data.data.timings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prayer times' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
