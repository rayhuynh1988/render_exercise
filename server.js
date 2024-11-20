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

// Needed for Prisma to connect to the database
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
        const restaurants = await prisma.restaurant.findMany({
            orderBy: { rating: "desc" },
        });
        const uniqueRestaurants = deduplicateRestaurants(restaurants);
        res.render("pages/home", { blogs: uniqueRestaurants });
    } catch (error) {
        console.error("Error fetching restaurants:", error);
        res.render("pages/home", { blogs: [] });
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
            return res.status(404).json({ success: false, message: "Restaurant not found." });
        }

        const updatedRestaurant = await prisma.restaurant.update({
            where: { id: parseInt(id) },
            data: { happyVisits: (restaurant.happyVisits || 0) + 1 },
        });

        res.json({ success: true, newCount: updatedRestaurant.happyVisits });
    } catch (error) {
        console.error("Error incrementing happy visit:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
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
            return res.status(404).json({ success: false, message: "Restaurant not found." });
        }

        const updatedRestaurant = await prisma.restaurant.update({
            where: { id: parseInt(id) },
            data: { unhappyVisits: (restaurant.unhappyVisits || 0) + 1 },
        });

        res.json({ success: true, newCount: updatedRestaurant.unhappyVisits });
    } catch (error) {
        console.error("Error incrementing unhappy visit:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// About page
app.get("/about", (req, res) => {
    res.render("pages/about");
});

// Add Restaurant page
app.get("/add-restaurant", (req, res) => {
    res.render("pages/add-restaurant");
});

// Handle Add Restaurant form submission
app.post("/add-restaurant", async (req, res) => {
    const { name, cuisine, price, location, rating, diet } = req.body;

    try {
        const ratingFloat = parseFloat(rating);
        if (isNaN(ratingFloat) || ratingFloat < 0 || ratingFloat > 5) {
            return res.status(400).send("Rating must be a number between 0 and 5.");
        }

        await prisma.restaurant.create({
            data: {
                name,
                cuisine,
                price,
                location,
                rating: ratingFloat,
                diet,
                happyVisits: 0,
                unhappyVisits: 0,
            },
        });

        console.log("Restaurant successfully added:", { name, cuisine, price, location, rating, diet });
        res.redirect("/");
    } catch (error) {
        console.error("Error adding restaurant:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Delete a restaurant by ID
app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.restaurant.delete({
            where: { id: parseInt(id) },
        });

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

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
