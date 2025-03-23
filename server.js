// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 5000; // Or any other port you prefer

app.use(cors());
app.use(bodyParser.json());

// API endpoint to save the last selected phone
app.post('/api/lastSelectedPhone', (req, res) => {
    const { name } = req.body; // Get the phone name from the request body
    const data = { name };

    fs.writeFile('lastSelectedPhone.json', JSON.stringify(data, null, 2), (err) => {
        if (err) {
            return res.status(500).send('Error saving data');
        }
        res.status(200).send('Data saved successfully');
    });
});

// API endpoint to retrieve the last selected phone
app.get('/api/lastSelectedPhone', (req, res) => {
    fs.readFile('lastSelectedPhone.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading data');
        }
        res.json(JSON.parse(data));
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
