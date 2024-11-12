// Load environment variables from .env file
require("dotenv").config();

// Import required modules
const express = require('express');
const app = express();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const puppeteer = require('puppeteer');  // Import puppeteer for web scraping

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

// Cook Now route
app.post('/cook-now', async (req, res) => {
  try {
      const today = new Date().toISOString().split('T')[0]; // Get current date
      const postsToday = await prisma.post.findMany({
          where: {
              createdAt: {
                  gte: new Date(`${today}T00:00:00Z`),
                  lt: new Date(`${today}T23:59:59Z`)
              }
          }
      });

      if (postsToday.length === 0) {
          return res.redirect('/');
      }

      const dinnerTimes = postsToday.map(post => {
          const timeString = post.dinner_time.trim();
          const [time, modifier] = timeString.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          
          let totalMinutes = 0;
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

      const cuisines = [...new Set(postsToday.map(post => post.cuisine))];
      const finalCuisine = cuisines.length === 1 ? cuisines[0] : cuisines[Math.floor(Math.random() * cuisines.length)];

      const apiKey = 'AIzaSyDe5lFxGaVA2a8fx7NAoaHRPq21FzXUSpA';  // Ensure the API key is loaded correctly
      const cx = '1667bf791ec734baf';          // Ensure the CSE ID is loaded correctly
      const searchQuery = `Suggested restaurants for ${finalCuisine}`;
      const googleSearchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(searchQuery)}&key=${apiKey}&cx=${cx}`;
      
      // Step 1: Perform the Google search
      const searchResults = await axios.get(googleSearchUrl);
      const firstResultLink = searchResults.data.items[0]?.link;

      if (!firstResultLink) {
          return res.status(500).send('No restaurant found in the search results.');
      }

      // Step 2: Use puppeteer to scrape the first restaurant's webpage
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(firstResultLink, { waitUntil: 'load', timeout: 0 });

      // Extract the restaurant name and images from the page
      const restaurantData = await page.evaluate(() => {
          const name = document.querySelector('h1') ? document.querySelector('h1').innerText : null;
          const images = Array.from(document.querySelectorAll('img')).map(img => img.src);
          return { name, images };
      });

      await browser.close();

      if (!restaurantData.name) {
          return res.status(500).send('Could not extract restaurant name.');
      }

      // Step 3: Render the page with the scraped data
      res.render('pages/cook-now', {
          avgDinnerTime: `${avgHours}:${avgMinutes < 10 ? '0' + avgMinutes : avgMinutes} ${modifier}`,
          cuisine: finalCuisine,
          restaurantName: restaurantData.name,
          restaurantImages: restaurantData.images
      });
  } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error.");
  }
});
