// Test MongoDB Database Initialization Script
// This database simulates a user's MongoDB for testing database workflow nodes
// Showcases MongoDB-native patterns: embedded documents, arrays, nested objects

// Switch to test_database
db = db.getSiblingDB("test_database");

// Create users collection with embedded address and preferences
db.users.insertMany([
    {
        username: "john_doe",
        email: "john@example.com",
        profile: {
            fullName: "John Doe",
            age: 30,
            avatar: "https://example.com/avatars/john.jpg",
            bio: "Software engineer with 10 years of experience"
        },
        address: {
            street: "123 Main St",
            city: "New York",
            state: "NY",
            country: "USA",
            zipCode: "10001"
        },
        preferences: {
            newsletter: true,
            notifications: ["email", "push"],
            theme: "dark",
            language: "en"
        },
        tags: ["premium", "early-adopter"],
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z")
    },
    {
        username: "jane_smith",
        email: "jane@example.com",
        profile: {
            fullName: "Jane Smith",
            age: 28,
            avatar: "https://example.com/avatars/jane.jpg",
            bio: "Product designer passionate about UX"
        },
        address: {
            street: "456 Oak Ave",
            city: "London",
            country: "UK",
            zipCode: "SW1A 1AA"
        },
        preferences: {
            newsletter: false,
            notifications: ["email"],
            theme: "light",
            language: "en"
        },
        tags: ["designer", "premium"],
        createdAt: new Date("2024-01-05T14:30:00Z"),
        updatedAt: new Date("2024-01-05T14:30:00Z")
    },
    {
        username: "bob_wilson",
        email: "bob@example.com",
        profile: {
            fullName: "Bob Wilson",
            age: 35,
            avatar: "https://example.com/avatars/bob.jpg",
            bio: "DevOps specialist and cloud architect"
        },
        address: {
            street: "789 Maple Dr",
            city: "Toronto",
            state: "ON",
            country: "Canada",
            zipCode: "M5V 2H1"
        },
        preferences: {
            newsletter: true,
            notifications: ["push", "sms"],
            theme: "auto",
            language: "en"
        },
        tags: ["devops", "cloud"],
        createdAt: new Date("2024-01-10T09:15:00Z"),
        updatedAt: new Date("2024-01-10T09:15:00Z")
    },
    {
        username: "alice_brown",
        email: "alice@example.com",
        profile: {
            fullName: "Alice Brown",
            age: 25,
            avatar: "https://example.com/avatars/alice.jpg",
            bio: "Full-stack developer and open source contributor"
        },
        address: {
            street: "321 Pine Rd",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            zipCode: "2000"
        },
        preferences: {
            newsletter: true,
            notifications: ["email", "push", "sms"],
            theme: "dark",
            language: "en"
        },
        tags: ["developer", "open-source", "premium"],
        createdAt: new Date("2024-01-15T16:45:00Z"),
        updatedAt: new Date("2024-01-15T16:45:00Z")
    },
    {
        username: "charlie_davis",
        email: "charlie@example.com",
        profile: {
            fullName: "Charlie Davis",
            age: 42,
            avatar: "https://example.com/avatars/charlie.jpg",
            bio: "Tech lead and engineering manager"
        },
        address: {
            street: "555 Cedar Ln",
            city: "Berlin",
            country: "Germany",
            zipCode: "10115"
        },
        preferences: {
            newsletter: false,
            notifications: ["email"],
            theme: "light",
            language: "de"
        },
        tags: ["manager", "tech-lead"],
        createdAt: new Date("2024-01-20T11:00:00Z"),
        updatedAt: new Date("2024-01-20T11:00:00Z")
    }
]);

// Create products collection with variants array (common e-commerce pattern)
db.products.insertMany([
    {
        name: "Laptop Pro",
        slug: "laptop-pro",
        description: "High-performance laptop for professionals with stunning display and all-day battery life",
        price: 1299.99,
        currency: "USD",
        category: "Electronics",
        subcategory: "Laptops",
        brand: "TechCorp",
        variants: [
            { sku: "LP-16-512", ram: "16GB", storage: "512GB SSD", color: "Space Gray", stock: 25, price: 1299.99 },
            { sku: "LP-32-1TB", ram: "32GB", storage: "1TB SSD", color: "Space Gray", stock: 15, price: 1599.99 },
            { sku: "LP-16-512-S", ram: "16GB", storage: "512GB SSD", color: "Silver", stock: 20, price: 1299.99 }
        ],
        specifications: {
            processor: "Intel Core i7-13700H",
            display: "15.6 inch 4K OLED",
            battery: "10 hours",
            weight: "1.8 kg",
            ports: ["USB-C x3", "HDMI 2.1", "SD Card"]
        },
        ratings: {
            average: 4.5,
            count: 128,
            distribution: { "5": 78, "4": 35, "3": 10, "2": 3, "1": 2 }
        },
        tags: ["laptop", "professional", "high-performance", "4k", "portable"],
        featured: true,
        active: true,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-15T00:00:00Z")
    },
    {
        name: "Smartphone X",
        slug: "smartphone-x",
        description: "Latest flagship smartphone with advanced camera system and 5G connectivity",
        price: 899.99,
        currency: "USD",
        category: "Electronics",
        subcategory: "Phones",
        brand: "TechCorp",
        variants: [
            { sku: "SPX-128-BLK", storage: "128GB", color: "Midnight Black", stock: 100, price: 899.99 },
            { sku: "SPX-256-BLK", storage: "256GB", color: "Midnight Black", stock: 75, price: 999.99 },
            { sku: "SPX-128-WHT", storage: "128GB", color: "Pearl White", stock: 80, price: 899.99 },
            { sku: "SPX-256-WHT", storage: "256GB", color: "Pearl White", stock: 60, price: 999.99 }
        ],
        specifications: {
            display: "6.7 inch AMOLED 120Hz",
            processor: "A17 Pro",
            camera: "48MP Main + 12MP Ultra Wide + 12MP Telephoto",
            battery: "4500 mAh",
            connectivity: ["5G", "WiFi 6E", "Bluetooth 5.3"]
        },
        ratings: {
            average: 4.7,
            count: 256,
            distribution: { "5": 180, "4": 55, "3": 15, "2": 4, "1": 2 }
        },
        tags: ["smartphone", "5g", "flagship", "camera"],
        featured: true,
        active: true,
        createdAt: new Date("2024-01-02T00:00:00Z"),
        updatedAt: new Date("2024-01-10T00:00:00Z")
    },
    {
        name: "Wireless Headphones Pro",
        slug: "wireless-headphones-pro",
        description: "Premium noise-cancelling wireless headphones with Hi-Res audio support",
        price: 349.99,
        currency: "USD",
        category: "Electronics",
        subcategory: "Audio",
        brand: "AudioMax",
        variants: [
            { sku: "WHP-BLK", color: "Black", stock: 200, price: 349.99 },
            { sku: "WHP-WHT", color: "White", stock: 150, price: 349.99 },
            { sku: "WHP-NVY", color: "Navy Blue", stock: 100, price: 349.99 }
        ],
        specifications: {
            driver: "40mm custom drivers",
            battery: "30 hours",
            noiseCancel: "Active Noise Cancellation",
            connectivity: ["Bluetooth 5.2", "3.5mm AUX"],
            weight: "250g"
        },
        ratings: {
            average: 4.6,
            count: 89,
            distribution: { "5": 55, "4": 25, "3": 6, "2": 2, "1": 1 }
        },
        tags: ["headphones", "wireless", "noise-cancelling", "audio"],
        featured: false,
        active: true,
        createdAt: new Date("2024-01-03T00:00:00Z"),
        updatedAt: new Date("2024-01-03T00:00:00Z")
    },
    {
        name: "Smart Watch Series 5",
        slug: "smart-watch-series-5",
        description: "Advanced smartwatch with health monitoring and fitness tracking features",
        price: 399.99,
        currency: "USD",
        category: "Electronics",
        subcategory: "Wearables",
        brand: "TechCorp",
        variants: [
            { sku: "SW5-40-BLK", size: "40mm", color: "Black", stock: 50, price: 399.99 },
            { sku: "SW5-44-BLK", size: "44mm", color: "Black", stock: 45, price: 429.99 },
            { sku: "SW5-40-SLV", size: "40mm", color: "Silver", stock: 40, price: 399.99 },
            { sku: "SW5-44-SLV", size: "44mm", color: "Silver", stock: 35, price: 429.99 }
        ],
        specifications: {
            display: "Always-on OLED",
            sensors: ["Heart Rate", "SpO2", "ECG", "Temperature"],
            battery: "18 hours",
            waterResistance: "50m",
            gps: true
        },
        ratings: {
            average: 4.4,
            count: 167,
            distribution: { "5": 90, "4": 50, "3": 20, "2": 5, "1": 2 }
        },
        tags: ["smartwatch", "fitness", "health", "wearable"],
        featured: true,
        active: true,
        createdAt: new Date("2024-01-04T00:00:00Z"),
        updatedAt: new Date("2024-01-12T00:00:00Z")
    },
    {
        name: "Ergonomic Office Chair",
        slug: "ergonomic-office-chair",
        description: "Premium ergonomic chair with lumbar support and adjustable armrests",
        price: 549.99,
        currency: "USD",
        category: "Furniture",
        subcategory: "Office",
        brand: "ComfortPlus",
        variants: [
            { sku: "EOC-BLK", color: "Black", stock: 30, price: 549.99 },
            { sku: "EOC-GRY", color: "Gray", stock: 25, price: 549.99 },
            { sku: "EOC-BLU", color: "Blue", stock: 15, price: 569.99 }
        ],
        specifications: {
            material: "Breathable mesh back, memory foam seat",
            maxWeight: "150 kg",
            adjustments: ["Height", "Armrests", "Lumbar", "Tilt", "Headrest"],
            warranty: "5 years"
        },
        ratings: {
            average: 4.3,
            count: 78,
            distribution: { "5": 40, "4": 25, "3": 8, "2": 3, "1": 2 }
        },
        tags: ["chair", "ergonomic", "office", "furniture"],
        featured: false,
        active: true,
        createdAt: new Date("2024-01-05T00:00:00Z"),
        updatedAt: new Date("2024-01-05T00:00:00Z")
    },
    {
        name: "Coffee Maker Pro",
        slug: "coffee-maker-pro",
        description: "Professional-grade coffee maker with built-in grinder and milk frother",
        price: 299.99,
        currency: "USD",
        category: "Home & Kitchen",
        subcategory: "Appliances",
        brand: "BrewMaster",
        variants: [
            { sku: "CMP-BLK", color: "Black", stock: 60, price: 299.99 },
            { sku: "CMP-SLV", color: "Silver", stock: 40, price: 299.99 },
            { sku: "CMP-RED", color: "Red", stock: 20, price: 319.99 }
        ],
        specifications: {
            capacity: "1.8L water tank",
            grinder: "Conical burr grinder",
            pressure: "15 bar",
            programs: ["Espresso", "Americano", "Latte", "Cappuccino"],
            power: "1450W"
        },
        ratings: {
            average: 4.2,
            count: 145,
            distribution: { "5": 70, "4": 45, "3": 20, "2": 7, "1": 3 }
        },
        tags: ["coffee", "espresso", "kitchen", "appliance"],
        featured: false,
        active: true,
        createdAt: new Date("2024-01-06T00:00:00Z"),
        updatedAt: new Date("2024-01-06T00:00:00Z")
    },
    {
        name: "Running Shoes Ultra",
        slug: "running-shoes-ultra",
        description: "Lightweight running shoes with responsive cushioning for marathon training",
        price: 179.99,
        currency: "USD",
        category: "Sports",
        subcategory: "Footwear",
        brand: "SpeedRun",
        variants: [
            { sku: "RSU-8-BLK", size: "US 8", color: "Black/Red", stock: 25, price: 179.99 },
            { sku: "RSU-9-BLK", size: "US 9", color: "Black/Red", stock: 30, price: 179.99 },
            { sku: "RSU-10-BLK", size: "US 10", color: "Black/Red", stock: 35, price: 179.99 },
            { sku: "RSU-11-BLK", size: "US 11", color: "Black/Red", stock: 20, price: 179.99 },
            { sku: "RSU-9-WHT", size: "US 9", color: "White/Blue", stock: 25, price: 179.99 },
            { sku: "RSU-10-WHT", size: "US 10", color: "White/Blue", stock: 30, price: 179.99 }
        ],
        specifications: {
            weight: "245g (US 9)",
            drop: "8mm",
            cushioning: "Carbon fiber plate + ZoomX foam",
            upper: "Engineered mesh",
            outsole: "Rubber with traction pods"
        },
        ratings: {
            average: 4.8,
            count: 312,
            distribution: { "5": 250, "4": 45, "3": 12, "2": 3, "1": 2 }
        },
        tags: ["running", "shoes", "sports", "marathon", "lightweight"],
        featured: true,
        active: true,
        createdAt: new Date("2024-01-07T00:00:00Z"),
        updatedAt: new Date("2024-01-14T00:00:00Z")
    },
    {
        name: "Backpack Travel Pro",
        slug: "backpack-travel-pro",
        description: "Versatile travel backpack with laptop compartment and anti-theft features",
        price: 129.99,
        currency: "USD",
        category: "Accessories",
        subcategory: "Bags",
        brand: "TravelGear",
        variants: [
            { sku: "BTP-BLK", color: "Black", capacity: "40L", stock: 80, price: 129.99 },
            { sku: "BTP-GRY", color: "Gray", capacity: "40L", stock: 60, price: 129.99 },
            { sku: "BTP-NVY", color: "Navy", capacity: "40L", stock: 45, price: 129.99 }
        ],
        specifications: {
            material: "Water-resistant polyester",
            laptopFit: "Up to 17 inch",
            features: ["Hidden pocket", "USB port", "Luggage strap", "Compression straps"],
            dimensions: "55 x 35 x 25 cm",
            weight: "1.2 kg"
        },
        ratings: {
            average: 4.5,
            count: 203,
            distribution: { "5": 130, "4": 50, "3": 15, "2": 5, "1": 3 }
        },
        tags: ["backpack", "travel", "laptop", "anti-theft"],
        featured: false,
        active: true,
        createdAt: new Date("2024-01-08T00:00:00Z"),
        updatedAt: new Date("2024-01-08T00:00:00Z")
    },
    {
        name: "Yoga Mat Premium",
        slug: "yoga-mat-premium",
        description: "Extra thick non-slip yoga mat with alignment lines",
        price: 59.99,
        currency: "USD",
        category: "Sports",
        subcategory: "Fitness",
        brand: "ZenFit",
        variants: [
            { sku: "YMP-PUR", color: "Purple", stock: 100, price: 59.99 },
            { sku: "YMP-BLU", color: "Blue", stock: 90, price: 59.99 },
            { sku: "YMP-GRN", color: "Green", stock: 70, price: 59.99 },
            { sku: "YMP-PNK", color: "Pink", stock: 60, price: 59.99 }
        ],
        specifications: {
            thickness: "6mm",
            material: "TPE eco-friendly",
            dimensions: "183 x 68 cm",
            features: ["Alignment lines", "Carrying strap", "Non-slip texture"],
            weight: "1 kg"
        },
        ratings: {
            average: 4.6,
            count: 178,
            distribution: { "5": 120, "4": 40, "3": 12, "2": 4, "1": 2 }
        },
        tags: ["yoga", "mat", "fitness", "exercise", "eco-friendly"],
        featured: false,
        active: true,
        createdAt: new Date("2024-01-09T00:00:00Z"),
        updatedAt: new Date("2024-01-09T00:00:00Z")
    },
    {
        name: "LED Desk Lamp",
        slug: "led-desk-lamp",
        description: "Adjustable LED desk lamp with wireless charging base",
        price: 79.99,
        currency: "USD",
        category: "Home & Kitchen",
        subcategory: "Lighting",
        brand: "LightWave",
        variants: [
            { sku: "LDL-BLK", color: "Black", stock: 55, price: 79.99 },
            { sku: "LDL-WHT", color: "White", stock: 45, price: 79.99 }
        ],
        specifications: {
            brightness: "5 levels",
            colorTemp: "2700K - 6500K (5 modes)",
            power: "12W LED",
            features: ["Wireless charging pad", "USB port", "Touch controls", "Timer"],
            warranty: "2 years"
        },
        ratings: {
            average: 4.4,
            count: 92,
            distribution: { "5": 50, "4": 30, "3": 8, "2": 3, "1": 1 }
        },
        tags: ["lamp", "desk", "led", "wireless-charging", "office"],
        featured: false,
        active: true,
        createdAt: new Date("2024-01-10T00:00:00Z"),
        updatedAt: new Date("2024-01-10T00:00:00Z")
    }
]);

// Create orders collection with embedded line items
db.orders.insertMany([
    {
        orderNumber: "ORD-2024-001",
        customer: {
            userId: db.users.findOne({ username: "john_doe" })._id,
            email: "john@example.com",
            name: "John Doe",
            phone: "+1-555-0101"
        },
        items: [
            {
                productId: db.products.findOne({ slug: "laptop-pro" })._id,
                productName: "Laptop Pro",
                variant: { sku: "LP-16-512", ram: "16GB", storage: "512GB SSD", color: "Space Gray" },
                quantity: 1,
                unitPrice: 1299.99,
                total: 1299.99
            }
        ],
        totals: {
            subtotal: 1299.99,
            tax: 104.00,
            shipping: 0,
            discount: 0,
            total: 1403.99
        },
        status: "delivered",
        paymentMethod: "credit_card",
        paymentStatus: "paid",
        shipping: {
            method: "express",
            carrier: "FedEx",
            address: {
                street: "123 Main St",
                city: "New York",
                state: "NY",
                country: "USA",
                zipCode: "10001"
            },
            trackingNumber: "FX123456789US",
            estimatedDelivery: new Date("2024-01-18T00:00:00Z"),
            deliveredAt: new Date("2024-01-17T14:30:00Z")
        },
        timeline: [
            { status: "pending", timestamp: new Date("2024-01-15T10:00:00Z"), note: "Order placed" },
            { status: "confirmed", timestamp: new Date("2024-01-15T10:05:00Z"), note: "Payment confirmed" },
            { status: "processing", timestamp: new Date("2024-01-15T14:00:00Z"), note: "Order being prepared" },
            { status: "shipped", timestamp: new Date("2024-01-16T09:00:00Z"), note: "Shipped via FedEx" },
            { status: "delivered", timestamp: new Date("2024-01-17T14:30:00Z"), note: "Delivered to recipient" }
        ],
        notes: "Please leave at front door",
        createdAt: new Date("2024-01-15T10:00:00Z"),
        updatedAt: new Date("2024-01-17T14:30:00Z")
    },
    {
        orderNumber: "ORD-2024-002",
        customer: {
            userId: db.users.findOne({ username: "jane_smith" })._id,
            email: "jane@example.com",
            name: "Jane Smith",
            phone: "+44-20-5555-0102"
        },
        items: [
            {
                productId: db.products.findOne({ slug: "smartphone-x" })._id,
                productName: "Smartphone X",
                variant: { sku: "SPX-256-WHT", storage: "256GB", color: "Pearl White" },
                quantity: 1,
                unitPrice: 999.99,
                total: 999.99
            },
            {
                productId: db.products.findOne({ slug: "wireless-headphones-pro" })._id,
                productName: "Wireless Headphones Pro",
                variant: { sku: "WHP-WHT", color: "White" },
                quantity: 1,
                unitPrice: 349.99,
                total: 349.99
            }
        ],
        totals: {
            subtotal: 1349.98,
            tax: 270.00,
            shipping: 15.00,
            discount: 50.00,
            total: 1584.98
        },
        status: "shipped",
        paymentMethod: "paypal",
        paymentStatus: "paid",
        shipping: {
            method: "standard",
            carrier: "DHL",
            address: {
                street: "456 Oak Ave",
                city: "London",
                country: "UK",
                zipCode: "SW1A 1AA"
            },
            trackingNumber: "DHL987654321GB",
            estimatedDelivery: new Date("2024-01-25T00:00:00Z")
        },
        timeline: [
            { status: "pending", timestamp: new Date("2024-01-20T14:30:00Z"), note: "Order placed" },
            { status: "confirmed", timestamp: new Date("2024-01-20T14:35:00Z"), note: "Payment confirmed" },
            { status: "processing", timestamp: new Date("2024-01-21T09:00:00Z"), note: "Order being prepared" },
            { status: "shipped", timestamp: new Date("2024-01-22T10:00:00Z"), note: "Shipped via DHL" }
        ],
        couponCode: "SAVE50",
        createdAt: new Date("2024-01-20T14:30:00Z"),
        updatedAt: new Date("2024-01-22T10:00:00Z")
    },
    {
        orderNumber: "ORD-2024-003",
        customer: {
            userId: db.users.findOne({ username: "bob_wilson" })._id,
            email: "bob@example.com",
            name: "Bob Wilson",
            phone: "+1-416-555-0103"
        },
        items: [
            {
                productId: db.products.findOne({ slug: "ergonomic-office-chair" })._id,
                productName: "Ergonomic Office Chair",
                variant: { sku: "EOC-BLK", color: "Black" },
                quantity: 2,
                unitPrice: 549.99,
                total: 1099.98
            },
            {
                productId: db.products.findOne({ slug: "led-desk-lamp" })._id,
                productName: "LED Desk Lamp",
                variant: { sku: "LDL-BLK", color: "Black" },
                quantity: 2,
                unitPrice: 79.99,
                total: 159.98
            }
        ],
        totals: {
            subtotal: 1259.96,
            tax: 163.79,
            shipping: 50.00,
            discount: 0,
            total: 1473.75
        },
        status: "processing",
        paymentMethod: "credit_card",
        paymentStatus: "paid",
        shipping: {
            method: "freight",
            carrier: "Canada Post",
            address: {
                street: "789 Maple Dr",
                city: "Toronto",
                state: "ON",
                country: "Canada",
                zipCode: "M5V 2H1"
            },
            estimatedDelivery: new Date("2024-01-30T00:00:00Z")
        },
        timeline: [
            { status: "pending", timestamp: new Date("2024-01-22T09:15:00Z"), note: "Order placed" },
            { status: "confirmed", timestamp: new Date("2024-01-22T09:20:00Z"), note: "Payment confirmed" },
            { status: "processing", timestamp: new Date("2024-01-22T15:00:00Z"), note: "Order being prepared" }
        ],
        notes: "Business delivery - please call before delivery",
        createdAt: new Date("2024-01-22T09:15:00Z"),
        updatedAt: new Date("2024-01-22T15:00:00Z")
    },
    {
        orderNumber: "ORD-2024-004",
        customer: {
            userId: db.users.findOne({ username: "alice_brown" })._id,
            email: "alice@example.com",
            name: "Alice Brown",
            phone: "+61-2-5555-0104"
        },
        items: [
            {
                productId: db.products.findOne({ slug: "running-shoes-ultra" })._id,
                productName: "Running Shoes Ultra",
                variant: { sku: "RSU-9-WHT", size: "US 9", color: "White/Blue" },
                quantity: 1,
                unitPrice: 179.99,
                total: 179.99
            },
            {
                productId: db.products.findOne({ slug: "yoga-mat-premium" })._id,
                productName: "Yoga Mat Premium",
                variant: { sku: "YMP-BLU", color: "Blue" },
                quantity: 1,
                unitPrice: 59.99,
                total: 59.99
            },
            {
                productId: db.products.findOne({ slug: "backpack-travel-pro" })._id,
                productName: "Backpack Travel Pro",
                variant: { sku: "BTP-GRY", color: "Gray", capacity: "40L" },
                quantity: 1,
                unitPrice: 129.99,
                total: 129.99
            }
        ],
        totals: {
            subtotal: 369.97,
            tax: 37.00,
            shipping: 25.00,
            discount: 20.00,
            total: 411.97
        },
        status: "delivered",
        paymentMethod: "apple_pay",
        paymentStatus: "paid",
        shipping: {
            method: "standard",
            carrier: "Australia Post",
            address: {
                street: "321 Pine Rd",
                city: "Sydney",
                state: "NSW",
                country: "Australia",
                zipCode: "2000"
            },
            trackingNumber: "AP456789012AU",
            estimatedDelivery: new Date("2024-01-28T00:00:00Z"),
            deliveredAt: new Date("2024-01-26T11:00:00Z")
        },
        timeline: [
            { status: "pending", timestamp: new Date("2024-01-18T16:45:00Z"), note: "Order placed" },
            { status: "confirmed", timestamp: new Date("2024-01-18T16:46:00Z"), note: "Payment confirmed" },
            { status: "processing", timestamp: new Date("2024-01-19T08:00:00Z"), note: "Order being prepared" },
            { status: "shipped", timestamp: new Date("2024-01-20T10:00:00Z"), note: "Shipped via Australia Post" },
            { status: "delivered", timestamp: new Date("2024-01-26T11:00:00Z"), note: "Delivered" }
        ],
        couponCode: "WELCOME20",
        createdAt: new Date("2024-01-18T16:45:00Z"),
        updatedAt: new Date("2024-01-26T11:00:00Z")
    },
    {
        orderNumber: "ORD-2024-005",
        customer: {
            userId: db.users.findOne({ username: "charlie_davis" })._id,
            email: "charlie@example.com",
            name: "Charlie Davis",
            phone: "+49-30-5555-0105"
        },
        items: [
            {
                productId: db.products.findOne({ slug: "smart-watch-series-5" })._id,
                productName: "Smart Watch Series 5",
                variant: { sku: "SW5-44-BLK", size: "44mm", color: "Black" },
                quantity: 1,
                unitPrice: 429.99,
                total: 429.99
            }
        ],
        totals: {
            subtotal: 429.99,
            tax: 81.70,
            shipping: 0,
            discount: 0,
            total: 511.69
        },
        status: "pending",
        paymentMethod: "bank_transfer",
        paymentStatus: "pending",
        shipping: {
            method: "express",
            address: {
                street: "555 Cedar Ln",
                city: "Berlin",
                country: "Germany",
                zipCode: "10115"
            },
            estimatedDelivery: new Date("2024-02-02T00:00:00Z")
        },
        timeline: [
            { status: "pending", timestamp: new Date("2024-01-25T11:00:00Z"), note: "Order placed - awaiting payment" }
        ],
        notes: "Will pay via bank transfer today",
        createdAt: new Date("2024-01-25T11:00:00Z"),
        updatedAt: new Date("2024-01-25T11:00:00Z")
    },
    {
        orderNumber: "ORD-2024-006",
        customer: {
            userId: db.users.findOne({ username: "john_doe" })._id,
            email: "john@example.com",
            name: "John Doe",
            phone: "+1-555-0101"
        },
        items: [
            {
                productId: db.products.findOne({ slug: "coffee-maker-pro" })._id,
                productName: "Coffee Maker Pro",
                variant: { sku: "CMP-SLV", color: "Silver" },
                quantity: 1,
                unitPrice: 299.99,
                total: 299.99
            }
        ],
        totals: {
            subtotal: 299.99,
            tax: 24.00,
            shipping: 0,
            discount: 30.00,
            total: 293.99
        },
        status: "cancelled",
        paymentMethod: "credit_card",
        paymentStatus: "refunded",
        shipping: {
            method: "standard",
            address: {
                street: "123 Main St",
                city: "New York",
                state: "NY",
                country: "USA",
                zipCode: "10001"
            }
        },
        timeline: [
            { status: "pending", timestamp: new Date("2024-01-10T08:00:00Z"), note: "Order placed" },
            { status: "confirmed", timestamp: new Date("2024-01-10T08:05:00Z"), note: "Payment confirmed" },
            { status: "cancelled", timestamp: new Date("2024-01-10T12:00:00Z"), note: "Cancelled by customer - found better deal" }
        ],
        cancellationReason: "Found a better deal elsewhere",
        createdAt: new Date("2024-01-10T08:00:00Z"),
        updatedAt: new Date("2024-01-10T12:00:00Z")
    }
]);

// Create indexes for better query performance
print("Creating indexes...");

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ "address.city": 1 });
db.users.createIndex({ "address.country": 1 });
db.users.createIndex({ tags: 1 });
db.users.createIndex({ createdAt: -1 });

// Products indexes
db.products.createIndex({ slug: 1 }, { unique: true });
db.products.createIndex({ category: 1 });
db.products.createIndex({ subcategory: 1 });
db.products.createIndex({ brand: 1 });
db.products.createIndex({ "variants.sku": 1 });
db.products.createIndex({ tags: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ "ratings.average": -1 });
db.products.createIndex({ featured: 1, active: 1 });
db.products.createIndex({ createdAt: -1 });

// Orders indexes
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ "customer.userId": 1 });
db.orders.createIndex({ "customer.email": 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ paymentStatus: 1 });
db.orders.createIndex({ createdAt: -1 });
db.orders.createIndex({ "totals.total": -1 });

// Compound indexes for common queries
db.products.createIndex({ category: 1, active: 1, price: 1 });
db.orders.createIndex({ status: 1, createdAt: -1 });

print("Test MongoDB initialized successfully!");
print("Collections created: users, products, orders");
print("Sample data inserted with MongoDB-native patterns (embedded documents, arrays)");
