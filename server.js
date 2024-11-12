// Load environment variables from .env file
require("dotenv").config();

// Import required modules
const express = require('express');
const app = express();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Set up the public directory for static files
app.use(express.static(__dirname + '/public'));

// Middleware to parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main landing page displaying all posts
app.get('/', async (req, res) => {
    try {
        // Retrieve all blog posts from the database, ordered by descending ID
        const blogs = await prisma.post.findMany({
            orderBy: [{ id: 'desc' }]
        });

        // Render the homepage with all blog posts
        res.render('pages/home', { blogs });
    } catch (error) {
        console.log(error);
        res.render('pages/home', { blogs: [] }); // Render empty list if there's an error
    }
});

// About page
app.get('/about', (req, res) => {
    res.render('pages/about');
});

// Form page for creating a new post
app.get('/new', (req, res) => {
    res.render('pages/new');
});

// Handle form submission to create a new post
app.post('/new', async (req, res) => {
    try {
        // Extract data from the form submission
        const { name, cuisine, dinner_time, dinner_mood } = req.body;

        // If any required fields are missing, re-render the form page
        if (!name || !cuisine || !dinner_time || !dinner_mood) {
            console.log("Required fields missing in form submission.");
            return res.render('pages/new');
        }

        // Create a new post in the database with the form data
        await prisma.post.create({
            data: { name, cuisine, dinner_time, dinner_mood },
        });

        // Redirect to the homepage after successful creation
        res.redirect('/');
    } catch (error) {
        console.log(error);
        res.render('pages/new');
    }
});

// Delete a post by ID
app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
        await prisma.post.delete({
            where: { id: parseInt(id) },
        });
      
        // Redirect back to the homepage
        res.redirect('/');
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

// Start the server on port 8080
app.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});
