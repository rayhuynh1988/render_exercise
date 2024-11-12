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

const axios = require('axios');

// Cook Now route
app.post('/cook-now', async (req, res) => {
  try {
      // Step 1: Get all posts with the same createdAt date
      const today = new Date().toISOString().split('T')[0]; // Get current date (e.g. "2024-11-12")
      
      const postsToday = await prisma.post.findMany({
          where: {
              createdAt: {
                  gte: new Date(`${today}T00:00:00Z`), // Start of today
                  lt: new Date(`${today}T23:59:59Z`) // End of today
              }
          }
      });

      // If no posts exist for today, redirect to homepage
      if (postsToday.length === 0) {
          return res.redirect('/');
      }

      // Step 2: Aggregate dinner times (average)
      const dinnerTimes = postsToday.map(post => {
          const timeString = post.dinner_time.trim();
          const [time, modifier] = timeString.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          
          let totalMinutes = 0;

          // Convert to 24-hour format
          if (modifier === 'PM' && hours !== 12) {
              totalMinutes = (hours + 12) * 60 + minutes;
          } else if (modifier === 'AM' && hours === 12) {
              totalMinutes = minutes; // Midnight
          } else {
              totalMinutes = hours * 60 + minutes;
          }

          return totalMinutes;
      });

      const avgDinnerTime = Math.round(dinnerTimes.reduce((a, b) => a + b, 0) / dinnerTimes.length); // Average in minutes
      const avgDate = new Date(0);
      avgDate.setMinutes(avgDinnerTime);

      const avgHours24 = avgDate.getHours();
      const avgMinutes = avgDate.getMinutes();
      
      let avgHours = avgHours24;
      const modifier = avgHours >= 12 ? 'PM' : 'AM';
      if (avgHours > 12) {
          avgHours -= 12;
      } else if (avgHours === 0) {
          avgHours = 12;
      }

      // Step 3: Match cuisines or pick a random cuisine
      const cuisines = [...new Set(postsToday.map(post => post.cuisine))];
      const finalCuisine = cuisines.length === 1 ? cuisines[0] : cuisines[Math.floor(Math.random() * cuisines.length)];

      // Step 4: Call Google Custom Search API to get restaurant suggestions
      const apiKey = 'AIzaSyDe5lFxGaVA2a8fx7NAoaHRPq21FzXUSpA';  // Replace with your Google API Key
      const cx = '1667bf791ec734baf';  // Replace with your Custom Search Engine ID
      const searchQuery = `top restaurants for ${finalCuisine}`;
      const googleSearchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(searchQuery)}&key=${apiKey}&cx=${cx}`;
      
      const searchResults = await axios.get(googleSearchUrl);

      // Step 5: Extract relevant restaurant information from the search results
      const restaurants = searchResults.data.items.map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet
      }));

      // Step 6: Send the results to the view
      res.render('pages/cook-now', {
          avgDinnerTime: `${avgHours}:${avgMinutes < 10 ? '0' + avgMinutes : avgMinutes} ${modifier}`,
          cuisine: finalCuisine,
          restaurants: restaurants
      });
  } catch (error) {
      console.log(error);
      res.redirect('/');
  }
});
