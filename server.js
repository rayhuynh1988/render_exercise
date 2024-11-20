// Needed for dotenv
require("dotenv").config();

// Needed for Express
const express = require("express");
const app = express();

// Needed for EJS
app.set("view engine", "ejs");

// Needed for public directory
app.use(express.static(__dirname + "/public"));

// Needed for parsing form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Needed for Prisma to connect to database
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Utility function to deduplicate restaurants
function deduplicateRestaurants(restaurants) {
    const uniqueRestaurants = new Map();
    restaurants.forEach((r) => {
        uniqueRestaurants.set(r.id, r);
    });
    return Array.from(uniqueRestaurants.values());
}

// Main landing page
app.get("/", async (req, res) => {
    try {
        // Fetch all restaurants sorted by rating and deduplicate them
        const restaurants = await prisma.restaurant.findMany({
            orderBy: { rating: "desc" },
        });

        const uniqueRestaurants = deduplicateRestaurants(restaurants);

        console.log("Fetched Restaurants:", uniqueRestaurants); // Debugging info

        // Render the homepage with the unique restaurant data
        res.render("pages/home", { blogs: uniqueRestaurants });
    } catch (error) {
        console.error("Error fetching restaurants:", error);
        res.render("pages/home", { blogs: [] }); // Render with empty data if error occurs
    }
});

// Increment Happy Visit Counter
app.post("/happy-visit/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: parseInt(id) },
        });

        if (!restaurant) {
            console.error(`Restaurant with ID ${id} not found.`);
            return res.status(404).send("Restaurant not found.");
        }

        // Increment the happyVisits counter
        await prisma.restaurant.update({
            where: { id: parseInt(id) },
            data: {
                happyVisits: (restaurant.happyVisits || 0) + 1,
            },
        });

        console.log(`Happy visit incremented for restaurant ID ${id}`);
        res.status(200).send("Happy visit recorded.");
    } catch (error) {
        console.error("Error incrementing happy visit:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Increment Unhappy Visit Counter
app.post("/unhappy-visit/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: parseInt(id) },
        });

        if (!restaurant) {
            console.error(`Restaurant with ID ${id} not found.`);
            return res.status(404).send("Restaurant not found.");
        }

        // Increment the unhappyVisits counter
        await prisma.restaurant.update({
            where: { id: parseInt(id) },
            data: {
                unhappyVisits: (restaurant.unhappyVisits || 0) + 1,
            },
        });

        console.log(`Unhappy visit incremented for restaurant ID ${id}`);
        res.status(200).send("Unhappy visit recorded.");
    } catch (error) {
        console.error("Error incrementing unhappy visit:", error);
        res.status(500).send("Internal Server Error");
    }
});

// About page
app.get("/about", (req, res) => {
    res.render("pages/about");
});

// New restaurant page
app.get("/new", (req, res) => {
    res.render("pages/new");
});

// Create a new restaurant
app.post("/new", async (req, res) => {
    try {
        const { name, cuisine, price, location, rating, diet } = req.body;

        // Validate fields
        if (!name || !cuisine || !price || !location || !rating || !diet) {
            return res.render("pages/new", { error: "All fields are required!" });
        }

        const ratingFloat = parseFloat(rating);
        if (isNaN(ratingFloat) || ratingFloat < 0 || ratingFloat > 5) {
            return res.render("pages/new", { error: "Rating must be a number between 0 and 5." });
        }

        // Create a new restaurant entry in the database
        await prisma.restaurant.create({
            data: { name, cuisine, price, location, rating: ratingFloat, diet, happyVisits: 0, unhappyVisits: 0 },
        });

        console.log("New restaurant added:", { name, cuisine, price, location, rating, diet });

        res.redirect("/");
    } catch (error) {
        console.error("Error creating restaurant:", error);
        res.render("pages/new", { error: "Error creating the restaurant entry!" });
    }
});

// Delete a restaurant by ID
app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.restaurant.delete({
            where: { id: parseInt(id) },
        });

        console.log(`Restaurant with ID ${id} deleted successfully`);
        res.redirect("/");
    } catch (error) {
        console.error("Error deleting restaurant:", error);
        res.redirect("/");
    }
});

// Handle undefined routes (404)
app.use((req, res) => {
    res.status(404).render("pages/404");
});

// Tells the app which port to run on
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
