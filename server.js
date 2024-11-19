// Needed for dotenv
require("dotenv").config();

// Needed for Express
const express = require('express');
const app = express();

// Needed for EJS
app.set('view engine', 'ejs');

// Needed for public directory
app.use(express.static(__dirname + '/public'));

// Needed for parsing form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Needed for Prisma to connect to database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Main landing page
app.get('/', async (req, res) => {
    try {
        // Get all restaurants ordered by rating
        const restaurants = await prisma.restaurant.findMany({
            orderBy: [
                {
                    rating: 'desc', // Adjust as needed (e.g., 'id' or other fields)
                },
            ],
        });

        // Render the homepage with all the restaurant data
        res.render('pages/home', { blogs: restaurants });
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        res.render('pages/home', { blogs: [] }); // Render with empty data if error occurs
    }
});

// About page
app.get('/about', (req, res) => {
    res.render('pages/about');
});

// New restaurant page
app.get('/new', (req, res) => {
    res.render('pages/new');
});

// Create a new restaurant
app.post('/new', async (req, res) => {
    try {
        // Get fields from the submitted form
        const { name, cuisine, price, location, rating, diet } = req.body;

        // Check for missing fields
        if (!name || !cuisine || !price || !location || !rating || !diet) {
            console.log('Missing fields, unable to create new restaurant entry.');
            return res.render('pages/new', { error: 'All fields are required!' });
        }

        // Create a new restaurant entry in the database
        await prisma.restaurant.create({
            data: { name, cuisine, price, location, rating: parseFloat(rating), diet },
        });

        // Redirect back to the homepage
        res.redirect('/');
    } catch (error) {
        console.error('Error creating restaurant:', error);
        res.render('pages/new', { error: 'Error creating the restaurant entry!' });
    }
});

// Serve the Add Restaurant page
app.get('/add-restaurant', (req, res) => {
    res.render('pages/add-restaurant');
});

// Handle Add Restaurant Form Submission
app.post('/add-restaurant', async (req, res) => {
    const { name, cuisine, price, location, rating, diet } = req.body;

    try {
        await prisma.restaurant.create({
            data: {
                name,
                cuisine,
                price,
                location,
                rating: parseFloat(rating), // Ensure rating is stored as a number
                diet,
            },
        });

        res.redirect('/'); // Redirect back to the homepage
    } catch (error) {
        console.error('Error adding restaurant:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Delete a restaurant by id
app.post('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Parse ID and delete the entry
        await prisma.restaurant.delete({
            where: { id: parseInt(id) },
        });

        // Redirect back to the homepage
        res.redirect('/');
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        res.redirect('/');
    }
});

// Handle undefined routes (404)
app.use((req, res) => {
    res.status(404).render('pages/404');
});

// Tells the app which port to run on
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
