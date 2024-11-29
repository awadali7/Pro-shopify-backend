const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Endpoint to fetch products from a specific collection with metafields
app.get("/api/collection-products", async (req, res) => {
    try {
        // Fetch products in the collection
        const productsResponse = await axios.get(
            `https://proluxuryhome.com/admin/api/2024-10/collections/366257340597/products.json`,
            {
                headers: {
                    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(
            "Products Response:",
            JSON.stringify(productsResponse.data, null, 2)
        );

        // Check if there are any products
        if (
            !productsResponse.data.products ||
            productsResponse.data.products.length === 0
        ) {
            return res
                .status(400)
                .json({ error: "No products found in the collection" });
        }

        // Extract product IDs
        // const productIds = productsResponse.data.products
        //     .map((product) => product.id)
        //     .join(",");

        // Fetch metafields for these products
        const metafieldsResponse = await axios.get(
            `https://proluxuryhome.com/admin/api/2024-10/collections/366257340597/metafields.json`,
            {
                headers: {
                    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
                    "Content-Type": "application/json",
                },
                // params: {
                //     metafield: {
                //         owner_resource: "product",
                //         owner_ids: productIds,
                //     },
                // },
            }
        );

        const metafieldsResponseFiltered =
            metafieldsResponse.data.metafields.map((metafield) => ({
                id: metafield.id,
                title: metafield.key,
                value: metafield.value,
                admin_graphql_api_id: metafield.admin_graphql_api_id,
            }));

        const productsWithMetafields = productsResponse.data.products.map(
            (product) => ({
                id: product.id,
                title: product.title,
                product_type: product.product_type,
                admin_graphql_api_id: product.admin_graphql_api_id,
                image: product.image,
            })
        );

        const mergedData = [];
        const maxLength = Math.max(
            metafieldsResponseFiltered.length,
            productsWithMetafields.length
        );

        for (let i = 0; i < maxLength; i++) {
            if (i < metafieldsResponseFiltered.length) {
                mergedData.push(metafieldsResponseFiltered[i]);
            }
            if (i < productsWithMetafields.length) {
                mergedData.push(productsWithMetafields[i]);
            }
        }

        res.json({
            collection: {
                id: "366257340597",
                name: "lucky-draw",
            },
            data: mergedData,
        });
    } catch (error) {
        // console.error("Error in /api/collection-products:", error);

        // More detailed error response
        if (error.response) {
            // The request was made and the server responded with a status code
            res.status(error.response.status).json({
                error: error.response.data,
                message: "Error fetching collection products",
            });
        } else if (error.request) {
            // The request was made but no response was received
            res.status(500).json({
                error: "No response received",
                message: error.message,
            });
        } else {
            // Something happened in setting up the request
            res.status(500).json({
                error: "Error setting up the request",
                message: error.message,
            });
        }
    }
});

// Save email endpoint
app.post("/save-email", async (req, res) => {
    try {
        const { email } = req.body;

        console.log("Received body:", req.body);

        // Validate email
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ error: "Invalid email address." });
        }

        // Prepare the payload to create a customer on Shopify
        const customerPayload = {
            customer: {
                email: email,
                tags: "Email Subscriber", // Optionally, you can tag customers
                accepts_marketing: true, // Marks the customer as subscribed
                email_marketing_consent: {
                    state: "subscribed",
                    consent_updated_at: new Date().toISOString(),
                },
            },
        };

        // Make API request to Shopify to create or update the customer
        const response = await axios.post(
            "https://proluxuryhome.com/admin/api/2024-10/customers.json",
            customerPayload,
            {
                headers: {
                    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Shopify response:", response.data);

        // Respond with success
        res.status(200).json({
            message: "Email saved and subscribed successfully.",
            data: response.data,
        });
    } catch (error) {
        console.error(
            "Error saving email to Shopify:",
            error.response?.data || error.message
        );
        res.status(500).json({
            error: "Failed to save email to Shopify.",
            details: error.response?.data || error.message,
        });
    }
});

// Previous price rules endpoint
app.get("/api/price-rules", async (req, res) => {
    try {
        const response = await axios.get(
            "https://proluxuryhome.com/admin/api/2024-10/price_rules.json",
            {
                headers: {
                    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
                    "Content-Type": "application/json",
                },
            }
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Catch-all route to help diagnose routing issues
app.use((req, res) => {
    console.log(`Received ${req.method} request to ${req.path}`);
    res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});

// Export the app for Vercel
module.exports = app;
