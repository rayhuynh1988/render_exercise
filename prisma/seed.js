const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const data = require('./data.json'); // Ensure correct path

async function main() {
    for (const item of data) {
        await prisma.restaurant.create({
            data: {
                name: item.name,          // Matches "name" from data.json
                cuisine: item.cuisine,    // Matches "cuisine" from data.json
                price: item.price,        // Matches "price" from data.json
                location: item.location,  // Matches "location" from data.json
                rating: item.rating,      // Matches "rating" from data.json
                diet: item.diet           // Matches "diet" from data.json
            },
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
