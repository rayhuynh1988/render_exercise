const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure correct path for views
app.use(express.static('public')); // Serve static files like CSS, JS, images

// Route to render the preferences form
app.get('/new', (req, res) => {
    res.render('new');
});

// Route to handle recommendations
app.post('/recommendations', (req, res) => {
    const { cuisine, price, location } = req.body;

    try {
        // Load hardcoded restaurant data from a JSON file
        const filePath = path.join(__dirname, 'restaurants.json');
        const restaurants = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Filter recommendations based on user preferences
        const recommendations = restaurants.filter(restaurant => {
            return (
                restaurant["Cuisine Type"] === cuisine &&
                restaurant["Price Range (SGD)"] === price &&
                restaurant["Location (Area)"].toLowerCase().includes(location.toLowerCase())
            );
        }).slice(0, 3); // Limit to top 3 recommendations

        // Render the recommendations page
        res.render('recommendation', { recommendations });
    } catch (error) {
        console.error('Error processing recommendations:', error);
        res.status(500).send('Server error. Please try again later.');
    }
});

// Route for home page (optional, depending on your setup)
app.get('/', (req, res) => {
    res.redirect('/new'); // Redirect to preferences form by default
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
