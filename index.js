const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

app.use(cors())
app.use(express.static('public'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const uri = process.env.MONGO_DB;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log('Connected to MongoDB')
})

// User schema
const userSchema = new mongoose.Schema({ 
  username: String,
  exercises: [{ 
    description: String,
    duration: Number,
    date: Date
  }]
});
const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// User endpoint post username
app.post('/api/users', cors(), async (req, res) => {
  try {
    const { username } = req.body;
    const user = new User({ username });
    const savedUser = await user.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User endpoint get all users
app.get('/api/users', cors(), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Exercise endpoint post an exercise
app.post('/api/users/:_id/exercises', cors(), async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    if (!description || !duration) {
      return res.status(400).json({ error: 'Description and duration are required' })
    }

    const exercise = {
      description: description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    };

    const user = await User.findByIdAndUpdate(
      _id,
      { $push: { exercises: exercise } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Exercise log endpoint get user log
app.get('/api/users/:_id/logs', cors(), async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await User.findById({ _id });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { from, to, limit } = req.query;

    // Define options for querying exercises
    const options = {};
    if (from) options.$gte = new Date(from);
    if (to) options.$lte = new Date(to);
    const query = { ...options };

    // Limit the number of logs if limit is provided
    let logs = user.exercises.filter(exercise => {
      if (options.$gte && exercise.date < options.$gte) return false;
      if (options.$lte && exercise.date > options.$lte) return false;
      return true;
    });
    if (limit) logs = logs.slice(0, parseInt(limit));

    // Prepare response object
    const response = {
      _id: user._id,
      username: user.username,
      count: logs.length,
      log: logs.map(({ description, duration, date }) => ({
        description,
        duration,
        date: date.toDateString()
      }))
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('App is listening on port ' + listener.address().port);
});
