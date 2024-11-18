// Load environment variables from .env file
require("dotenv").config();

// Import required modules
const express = require('express');
const app = express();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Set up the public directory for static files
app.use(express.static(__dirname + '/public'));

// Middleware to parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Abstracted keys for configuration and API
const API_KEY = process.env.GOOGLE_API_KEY;
const CX = process.env.GOOGLE_CSE_ID;

// Main landing page displaying all posts
app.get('/', async (req, res) => {
    try {
        const blogs = await prisma.post.findMany({
            orderBy: [{ id: 'desc' }]
        });
        res.render('pages/home', { blogs });
    } catch (error) {
        console.log(error);
        res.render('pages/home', { blogs: [] });
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
        const { name, cuisine, dinner_time, dinner_mood } = req.body;

        if (!name || !cuisine || !dinner_time || !dinner_mood) {
            console.log("Required fields missing in form submission.");
            return res.render('pages/new');
        }

        await prisma.post.create({
            data: { name, cuisine, dinner_time, dinner_mood },
        });

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
app.get('/recommendations', (req, res) => {
  const { cuisine, dinnerTime, price, composition } = req.query;

// Mock function to get recommendations based on user preferences
  const recommendations = getRecommendations(cuisine, price, composition); 

  res.render('recommendations', { 
      cuisine, 
      dinnerTime, 
      price, 
      composition, 
      recommendations 
  });
});

// Mock function: Generate recommendations
function getRecommendations(cuisine, price, composition) {
  const topRestaurants = [
      // Example data for 200 restaurants
      { 
          title: "Restaurant A", 
          link: "#", 
          snippet: "Famous for its authentic Italian dishes.", 
          cuisine: "italian", 
          price: "$$$", 
          composition: "healthy", 
          location: "Orchard Road" 
      },
      { 
          title: "Restaurant B", 
          link: "#", 
          snippet: "Delicious and healthy Chinese food.", 
          cuisine: "chinese", 
          price: "$$", 
          composition: "healthy-tasty", 
          location: "Marina Bay Sands" 
      },
      // More restaurants here...
  ];

  // Filter top restaurants based on user preferences
  return topRestaurants.filter(
      r => r.cuisine === cuisine && r.price === price && r.composition.includes(composition)
  );
}


// Cook Now route
app.post('/cook-now', async (req, res) => {
  try {
      const today = new Date().toISOString().split('T')[0];
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
              totalMinutes = minutes;
          } else {
              totalMinutes = hours * 60 + minutes;
          }

          return totalMinutes;
      });

      const avgDinnerTime = Math.round(dinnerTimes.reduce((a, b) => a + b, 0) / dinnerTimes.length);
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

      // Use abstracted variables for API key and CSE ID
      const searchQuery = `Suggested restaurants for ${finalCuisine}`;
      const googleSearchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(searchQuery)}&key=${API_KEY}&cx=${CX}&num=5`;
      
      // Perform the Google search
      const searchResults = await axios.get(googleSearchUrl);
      const topResults = searchResults.data.items.slice(0, 5);

      if (topResults.length === 0) {
          return res.status(500).send('No restaurant found in the search results.');
      }

      // Render the page with the top 5 results
      res.render('pages/cook-now', {
          avgDinnerTime: `${avgHours}:${avgMinutes < 10 ? '0' + avgMinutes : avgMinutes} ${modifier}`,
          cuisine: finalCuisine,
          restaurants: topResults
      });
  } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error.");
  }
});
