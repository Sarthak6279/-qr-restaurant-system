const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const QRCode = require('qrcode');

const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const OWNER_ID = process.env.OWNER_ID || 'owner';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'CoffeeCulture@2026';
const OWNER_SESSION_TTL = 8 * 60 * 60 * 1000;
const ownerSessions = new Map();
const loginAttempts = new Map();
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getCookie(req, name) {
  const cookies = (req.headers.cookie || '').split(';');
  const cookie = cookies.find(value => value.trim().startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : null;
}

function isOwnerRequest(req) {
  const token = getCookie(req, 'owner_session');
  const expiresAt = token && ownerSessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    ownerSessions.delete(token);
    return false;
  }
  return true;
}

function requireOwner(req, res, next) {
  if (isOwnerRequest(req)) return next();
  res.status(401).json({ error: 'Owner login required' });
}

function passwordsMatch(input) {
  const provided = Buffer.from(String(input || ''));
  const expected = Buffer.from(OWNER_PASSWORD);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function ownerCredentialsMatch(id, password) {
  return String(id || '') === OWNER_ID && passwordsMatch(password);
}

// -------------------------------------------------------------
// Network Discovery Helper
// -------------------------------------------------------------
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIpAddress();

// -------------------------------------------------------------
// In-Memory Data Store (With Rich Seeds)
// -------------------------------------------------------------
let menuItems = [
  {
    "id": "cc-bev-1",
    "name": "Classic Cappuccino",
    "category": "coffees_drinks",
    "price": 140,
    "description": "Rich double espresso with silky textured steamed milk foam and a dusting of cocoa.",
    "image": "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "5 min",
    "addons": [
      {
        "name": "Extra Espresso Shot",
        "price": 35
      },
      {
        "name": "Vanilla Syrup",
        "price": 30
      },
      {
        "name": "Caramel Drizzle",
        "price": 30
      }
    ]
  },
  {
    "id": "cc-bev-2",
    "name": "Signature Cold Coffee",
    "category": "coffees_drinks",
    "price": 150,
    "description": "Thick, creamy and decadent blend of handcrafted espresso with chilled vanilla cream.",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "6 min",
    "addons": [
      {
        "name": "Vanilla Ice Cream Scoop",
        "price": 40
      },
      {
        "name": "Hazelnut Flavor",
        "price": 35
      },
      {
        "name": "Chocolate Fudge Swirl",
        "price": 35
      }
    ]
  },
  {
    "id": "cc-bev-3",
    "name": "Cafe Latte",
    "category": "coffees_drinks",
    "price": 160,
    "description": "Smooth espresso gently balanced with rich steamed milk and a delicate micro-foam layer.",
    "image": "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "5 min",
    "addons": [
      {
        "name": "Hazelnut Syrup",
        "price": 35
      },
      {
        "name": "Oat Milk Substitute",
        "price": 45
      }
    ]
  },
  {
    "id": "cc-bev-4",
    "name": "Cafe Mocha",
    "category": "coffees_drinks",
    "price": 170,
    "description": "Decadent Belgian dark chocolate melted with espresso and velvety steamed milk, topped with cream.",
    "image": "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "7 min",
    "addons": [
      {
        "name": "Whipped Cream Cloud",
        "price": 30
      },
      {
        "name": "Dark Chocolate Chips",
        "price": 25
      }
    ]
  },
  {
    "id": "cc-bev-5",
    "name": "Americano / Long Black",
    "category": "coffees_drinks",
    "price": 120,
    "description": "Bold double shot of artisanal roasted Arabica espresso poured over steaming hot filtered water.",
    "image": "https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=600&q=80",
    "dietary": "vegan",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "4 min",
    "addons": [
      {
        "name": "Extra Espresso Shot",
        "price": 35
      }
    ]
  },
  {
    "id": "cc-bev-6",
    "name": "Exotic Berry Smoothie",
    "category": "coffees_drinks",
    "price": 180,
    "description": "Refreshing crushed blueberries, strawberries, and rich Greek yogurt churned to frosty perfection.",
    "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "6 min",
    "addons": [
      {
        "name": "Chia Seeds & Honey",
        "price": 25
      }
    ]
  },
  {
    "id": "cc-bev-7",
    "name": "Chilled Belgian Frappe",
    "category": "coffees_drinks",
    "price": 190,
    "description": "Ice-blended coffee beverage swirled with dark chocolate ganache and crowned with whipped cream.",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "7 min",
    "addons": [
      {
        "name": "Crushed Oreos",
        "price": 30
      }
    ]
  },
  {
    "id": "cc-bev-8",
    "name": "Veg Kama Ka Kazi (Signature Cooler)",
    "category": "coffees_drinks",
    "price": 159,
    "description": "House special mocktail cooler infused with tangy citrus, spices, mint leaves and sparkling fizz.",
    "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    "dietary": "vegan",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "5 min",
    "addons": []
  },
  {
    "id": "cc-bev-9",
    "name": "Veg Aam Panna Cooler",
    "category": "coffees_drinks",
    "price": 95,
    "description": "Traditional roasted raw mango cooler spiced with cumin, black salt and fresh mint.",
    "image": "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80",
    "dietary": "vegan",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "4 min",
    "addons": []
  },
  {
    "id": "cc-bev-10",
    "name": "Special Promo Cappuccino (Offer)",
    "category": "coffees_drinks",
    "price": 40,
    "description": "Special promotional flash offer — aromatic handcrafted cappuccino at unbeatable cafe value.",
    "image": "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "5 min",
    "addons": []
  },
  {
    "id": "cc-bev-11",
    "name": "Special Promo Cold Coffee (Offer)",
    "category": "coffees_drinks",
    "price": 40,
    "description": "Special promotional chilled coffee brew — quick sweet refreshment.",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "5 min",
    "addons": []
  },
  {
    "id": "cc-str-1",
    "name": "Classic Salted French Fries",
    "category": "starters",
    "price": 140,
    "description": "Golden crispy skin-on potato fries seasoned with sea salt, served with tangy tomato relish.",
    "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    "dietary": "vegan",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "8 min",
    "addons": [
      {
        "name": "Cheese Dip",
        "price": 35
      },
      {
        "name": "Garlic Mayo",
        "price": 25
      }
    ]
  },
  {
    "id": "cc-str-2",
    "name": "Peri Peri Loaded Fries",
    "category": "starters",
    "price": 190,
    "description": "Crispy fries dusted with fiery African peri-peri spices, drizzled with warm cheddar cheese sauce.",
    "image": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 2,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "10 min",
    "addons": [
      {
        "name": "Extra Melted Cheddar",
        "price": 40
      },
      {
        "name": "Jalapeno Slices",
        "price": 25
      }
    ]
  },
  {
    "id": "cc-str-3",
    "name": "Cheesy Garlic Bread",
    "category": "starters",
    "price": 180,
    "description": "Toasted Italian baguette brushed with roasted garlic herb butter, smothered in bubbling mozzarella cheese.",
    "image": "https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "10 min",
    "addons": [
      {
        "name": "Green Chilli & Corn Topping",
        "price": 30
      }
    ]
  },
  {
    "id": "cc-str-4",
    "name": "Crispy Chicken Wings",
    "category": "starters",
    "price": 260,
    "description": "Crisp-fried tender chicken wings tossed in your choice of spicy BBQ or fiery honey chilli glaze.",
    "image": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80",
    "dietary": "non-veg",
    "spiceLevel": 2,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "14 min",
    "addons": [
      {
        "name": "Blue Cheese Dip",
        "price": 40
      }
    ]
  },
  {
    "id": "cc-str-5",
    "name": "Tandoori Starters Platter",
    "category": "starters",
    "price": 280,
    "description": "Marinated spiced cottage cheese chunks and crunchy peppers grilled in tandoor style.",
    "image": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "12 min",
    "addons": []
  },
  {
    "id": "cc-str-6",
    "name": "Cafe Special Maggi (Cheese & Butter)",
    "category": "starters",
    "price": 140,
    "description": "All-time favorite instant noodles spiced with exotic cafe seasonings, loaded with butter and shredded cheese.",
    "image": "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "8 min",
    "addons": [
      {
        "name": "Extra Cheese Cube",
        "price": 30
      }
    ]
  },
  {
    "id": "cc-str-7",
    "name": "Special Promo French Fries (Offer)",
    "category": "starters",
    "price": 40,
    "description": "Special promotional flash offer — crispy salted french fries at café anniversary price.",
    "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    "dietary": "vegan",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "8 min",
    "addons": []
  },
  {
    "id": "cc-str-8",
    "name": "Special Promo Maggi (Offer)",
    "category": "starters",
    "price": 40,
    "description": "Flash deal hot masala Maggi bowl.",
    "image": "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "7 min",
    "addons": []
  },
  {
    "id": "cc-sal-1",
    "name": "Chicken Caesar Salad",
    "category": "salads",
    "price": 340,
    "description": "Crisp romaine hearts tossed with grilled herb chicken breast, garlic croutons, parmesan shavings & Caesar dressing.",
    "image": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80",
    "dietary": "non-veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "10 min",
    "addons": [
      {
        "name": "Extra Grilled Chicken",
        "price": 80
      }
    ]
  },
  {
    "id": "cc-sal-2",
    "name": "Tandoori Paneer Salad",
    "category": "salads",
    "price": 220,
    "description": "Tender tandoori paneer cubes, tossed cherry tomatoes, bell peppers, fresh greens and lemon-cumin vinaigrette.",
    "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "10 min",
    "addons": []
  },
  {
    "id": "cc-sal-3",
    "name": "Mediterranean Tossed Garden Salad",
    "category": "salads",
    "price": 190,
    "description": "Fresh cucumbers, kalamata olives, feta crumbles, crisp greens drizzled with extra virgin olive oil.",
    "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "8 min",
    "addons": []
  },
  {
    "id": "cc-brg-1",
    "name": "American-Style Gourmet Veg Burger",
    "category": "burgers_sandwiches",
    "price": 190,
    "description": "Crisp potato-herb patty, melted cheese slice, caramelized onions, gherkins and secret bistro sauce on a brioche bun.",
    "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "12 min",
    "addons": [
      {
        "name": "Extra Cheddar Slice",
        "price": 30
      },
      {
        "name": "Side of Fries Upgrade",
        "price": 50
      }
    ]
  },
  {
    "id": "cc-brg-2",
    "name": "American-Style Crispy Chicken Burger",
    "category": "burgers_sandwiches",
    "price": 250,
    "description": "Buttermilk fried crispy chicken thigh, honey mustard coleslaw, cheddar cheese and chipotle mayo.",
    "image": "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80",
    "dietary": "non-veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "14 min",
    "addons": [
      {
        "name": "Extra Fried Bacon / Egg",
        "price": 60
      },
      {
        "name": "Side of Fries Upgrade",
        "price": 50
      }
    ]
  },
  {
    "id": "cc-brg-3",
    "name": "Triple Decker Club Sandwich",
    "category": "burgers_sandwiches",
    "price": 180,
    "description": "Three layers of toasted multigrain bread packed with cucumber, tomatoes, cheese, coleslaw and herb spread.",
    "image": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "10 min",
    "addons": [
      {
        "name": "Cheese Burst Layer",
        "price": 35
      }
    ]
  },
  {
    "id": "cc-brg-4",
    "name": "Grilled Corn & Cheese Sandwich",
    "category": "burgers_sandwiches",
    "price": 160,
    "description": "Golden toasted panini bread with sweet American corn kernels, crushed peppers and gooey melted mozzarella.",
    "image": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "10 min",
    "addons": []
  },
  {
    "id": "cc-brg-5",
    "name": "Special Promo Burger (Offer)",
    "category": "burgers_sandwiches",
    "price": 40,
    "description": "Limited time promotional cafe veggie snack burger.",
    "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "10 min",
    "addons": []
  },
  {
    "id": "cc-piz-1",
    "name": "Classic Margherita Pizza",
    "category": "pizzas",
    "price": 240,
    "description": "Thin crust artisan pizza baked with San Marzano tomato sauce, fresh mozzarella cheese, basil and olive oil.",
    "image": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "15 min",
    "addons": [
      {
        "name": "Extra Mozzarella",
        "price": 50
      },
      {
        "name": "Mushrooms",
        "price": 40
      }
    ]
  },
  {
    "id": "cc-piz-2",
    "name": "Regular Farmhouse Veg Pizza",
    "category": "pizzas",
    "price": 260,
    "description": "Loaded with bell peppers, crisp onions, tender sweet corn, button mushrooms and bubbling cheese.",
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "15 min",
    "addons": [
      {
        "name": "Jalapenos & Black Olives",
        "price": 45
      },
      {
        "name": "Cheese Crust",
        "price": 60
      }
    ]
  },
  {
    "id": "cc-piz-3",
    "name": "Premium Loaded Cheese & Paneer Pizza",
    "category": "pizzas",
    "price": 380,
    "description": "Chef's special pizza with spiced paneer tikka, red paprika, charred capsicum, and a four-cheese blend.",
    "image": "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "16 min",
    "addons": [
      {
        "name": "Stuffed Crust",
        "price": 70
      }
    ]
  },
  {
    "id": "cc-piz-4",
    "name": "Barbecue Chicken Supreme Pizza",
    "category": "pizzas",
    "price": 390,
    "description": "Smoky barbecue shredded chicken, caramelized red onions, roasted peppers and mozzarella on crisp crust.",
    "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
    "dietary": "non-veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "16 min",
    "addons": [
      {
        "name": "Extra BBQ Chicken",
        "price": 70
      }
    ]
  },
  {
    "id": "cc-piz-5",
    "name": "Special Promo Personal Pizza (Offer)",
    "category": "pizzas",
    "price": 40,
    "description": "Special promotional flash offer — personal 6-inch cheese pizza on cafe deal days.",
    "image": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "12 min",
    "addons": []
  },
  {
    "id": "cc-pas-1",
    "name": "Italian Creamy Alfredo White Sauce Pasta",
    "category": "pastas",
    "price": 260,
    "description": "Penne tossed in a velvety garlic parmesan cream sauce with sautéed mushrooms, broccoli and herbs.",
    "image": "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "14 min",
    "addons": [
      {
        "name": "Garlic Bread Slice (2 pcs)",
        "price": 40
      },
      {
        "name": "Extra Parmesan Shavings",
        "price": 35
      }
    ]
  },
  {
    "id": "cc-pas-2",
    "name": "Spicy Italian Arrabbiata Red Sauce Pasta",
    "category": "pastas",
    "price": 250,
    "description": "Italian penne pasta cooked in slow-simmered plum tomato ragu infused with fiery red chilli flakes, basil & garlic.",
    "image": "https://images.unsplash.com/photo-1621996346565-e3d5d62816ef?auto=format&fit=crop&w=600&q=80",
    "dietary": "vegan",
    "spiceLevel": 2,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "12 min",
    "addons": [
      {
        "name": "Black Olives & Mushrooms",
        "price": 40
      }
    ]
  },
  {
    "id": "cc-pas-3",
    "name": "Creamy Chicken Alfredo Pasta",
    "category": "pastas",
    "price": 330,
    "description": "Tender seasoned grilled chicken breast tossed with fettuccine in decadent rich Italian white cream sauce.",
    "image": "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=600&q=80",
    "dietary": "non-veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "15 min",
    "addons": [
      {
        "name": "Extra Grilled Chicken",
        "price": 65
      }
    ]
  },
  {
    "id": "cc-siz-1",
    "name": "Signature Veg Sizzler",
    "category": "sizzlers_mains",
    "price": 340,
    "description": "Sizzling platter loaded with buttered herb rice, grilled seasonal vegetables, French fries and hot pepper garlic sauce.",
    "image": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "18 min",
    "addons": [
      {
        "name": "Extra Sizzler Sauce",
        "price": 40
      },
      {
        "name": "Melted Cheese on Rice",
        "price": 45
      }
    ]
  },
  {
    "id": "cc-siz-2",
    "name": "Paneer Tikka Steak Sizzler",
    "category": "sizzlers_mains",
    "price": 360,
    "description": "Tandoor-charred cottage cheese steaks served over fragrant rice with sautéed baby corn, fries and spicy barbecue glaze.",
    "image": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "18 min",
    "addons": []
  },
  {
    "id": "cc-siz-3",
    "name": "Classic Chicken Sizzler",
    "category": "sizzlers_mains",
    "price": 380,
    "description": "Plump marinated grilled chicken breast served sizzling with buttered parsley rice, potato wedges, and mushroom brown sauce.",
    "image": "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80",
    "dietary": "non-veg",
    "spiceLevel": 1,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "20 min",
    "addons": [
      {
        "name": "Fried Egg on Top",
        "price": 30
      }
    ]
  },
  {
    "id": "cc-des-1",
    "name": "Sizzling Brownie with Ice Cream",
    "category": "desserts",
    "price": 180,
    "description": "Warm walnut dark chocolate brownie served on a cast-iron sizzler plate, crowned with vanilla ice cream and bubbling fudge sauce.",
    "image": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "7 min",
    "addons": [
      {
        "name": "Extra Vanilla Ice Cream Scoop",
        "price": 40
      },
      {
        "name": "Roasted Almond Flakes",
        "price": 25
      }
    ]
  },
  {
    "id": "cc-des-2",
    "name": "Exotic Hot Fudge Chocolate Sundae",
    "category": "desserts",
    "price": 190,
    "description": "Three generous scoops of premium ice cream drizzled with hot Belgian fudge, topped with roasted nuts and a maraschino cherry.",
    "image": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "6 min",
    "addons": []
  },
  {
    "id": "cc-des-3",
    "name": "Exotic Red Velvet Pastry",
    "category": "desserts",
    "price": 150,
    "description": "Layers of moist crimson sponge cake layered with silky cream cheese frosting and white chocolate curls.",
    "image": "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": false,
    "prepTime": "4 min",
    "addons": []
  },
  {
    "id": "cc-des-4",
    "name": "Warm Belgian Choco Lava Cake",
    "category": "desserts",
    "price": 160,
    "description": "Decadent dark cocoa sponge cake that reveals a luscious pool of warm molten chocolate when sliced.",
    "image": "https://images.unsplash.com/photo-1617305855058-336d24456869?auto=format&fit=crop&w=600&q=80",
    "dietary": "veg",
    "spiceLevel": 0,
    "isAvailable": true,
    "isChefSpecial": true,
    "prepTime": "6 min",
    "addons": [
      {
        "name": "Vanilla Ice Cream Scoop",
        "price": 40
      }
    ]
  }
];

let tables = [
  { id: "1", name: "Table 1", section: "Main Dining", seats: 2, status: "available" },
  { id: "2", name: "Table 2", section: "Main Dining", seats: 4, status: "available" },
  { id: "3", name: "Table 3", section: "Main Dining", seats: 4, status: "available" },
  { id: "4", name: "Table 4", section: "Main Dining", seats: 6, status: "available" },
  { id: "5", name: "Table 5", section: "Window Booth", seats: 4, status: "available" },
  { id: "6", name: "Table 6", section: "Window Booth", seats: 4, status: "available" },
  { id: "7", name: "Table 7", section: "Window Booth", seats: 6, status: "available" },
  { id: "8", name: "Table 8", section: "Bar High Top", seats: 2, status: "available" },
  { id: "9", name: "Table 9", section: "Bar High Top", seats: 2, status: "available" },
  { id: "10", name: "Table 10", section: "Outdoor Patio", seats: 4, status: "available" },
  { id: "11", name: "Table 11", section: "Outdoor Patio", seats: 6, status: "available" },
  { id: "12", name: "VIP-1", name: "VIP Lounge A", section: "VIP Suite", seats: 8, status: "available" }
];

let orders = [
  {
    "id": "ord-1001",
    "orderNumber": "#1001",
    "tableId": "4",
    "tableName": "Table 4",
    "customerName": "Rohan S.",
    "items": [
      {
        "id": "cc-bev-1",
        "name": "Classic Cappuccino",
        "price": 140,
        "quantity": 2,
        "selectedAddons": [
          {
            "name": "Caramel Drizzle",
            "price": 30
          }
        ],
        "notes": "Extra hot please"
      },
      {
        "id": "cc-str-2",
        "name": "Peri Peri Loaded Fries",
        "price": 190,
        "quantity": 1,
        "selectedAddons": [
          {
            "name": "Extra Melted Cheddar",
            "price": 40
          }
        ],
        "notes": "Crispy"
      },
      {
        "id": "cc-piz-1",
        "name": "Classic Margherita Pizza",
        "price": 240,
        "quantity": 1,
        "selectedAddons": [],
        "notes": ""
      }
    ],
    "subtotal": 740,
    "tax": 37,
    "tip": 50,
    "total": 827,
    "status": "preparing",
    "specialInstructions": "Table on the window side",
    "paymentStatus": "paid",
    "createdAt": "2026-09-13T11:04:37.994Z",
    "updatedAt": "2026-09-13T11:08:37.995Z"
  },
  {
    "id": "ord-1002",
    "orderNumber": "#1002",
    "tableId": "7",
    "tableName": "Table 7",
    "customerName": "Pooja & Friends",
    "items": [
      {
        "id": "cc-siz-1",
        "name": "Signature Veg Sizzler",
        "price": 340,
        "quantity": 1,
        "selectedAddons": [
          {
            "name": "Extra Sizzler Sauce",
            "price": 40
          }
        ],
        "notes": "Spicy sauce"
      },
      {
        "id": "cc-bev-2",
        "name": "Signature Cold Coffee",
        "price": 150,
        "quantity": 2,
        "selectedAddons": [
          {
            "name": "Vanilla Ice Cream Scoop",
            "price": 40
          }
        ],
        "notes": ""
      },
      {
        "id": "cc-des-1",
        "name": "Sizzling Brownie with Ice Cream",
        "price": 180,
        "quantity": 1,
        "selectedAddons": [],
        "notes": "Serve after sizzler"
      }
    ],
    "subtotal": 940,
    "tax": 47,
    "tip": 60,
    "total": 1047,
    "status": "pending",
    "specialInstructions": "Birthday celebration hangout",
    "paymentStatus": "unpaid",
    "createdAt": "2026-09-13T11:12:37.995Z",
    "updatedAt": "2026-09-13T11:12:37.995Z"
  }
];

let serviceRequests = [
  {
    id: "req-1",
    tableId: "5",
    tableName: "Table 5",
    type: "water", // waiter | water | bill | clean
    message: "Requested extra water & napkins",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    resolved: false
  }
];

let orderCounter = 1003;

let banquetLeads = [
  {
    id: "lead-1",
    eventType: "Wedding",
    guests: 500,
    date: "2026-11-15",
    venue: "Grand Elizey",
    foodPref: "Vegetarian",
    name: "Rahul Verma",
    phone: "+91 9876543210",
    email: "rahul@example.com",
    status: "new",
    createdAt: new Date().toISOString()
  }
];

// -------------------------------------------------------------
// WebSocket Real-Time Broadcast Hub
// -------------------------------------------------------------
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function sendInitialSync(ws) {
  ws.send(JSON.stringify({
    type: 'INIT_SYNC',
    menu: menuItems,
    orders: ws.isOwner ? orders : [],
    tables: tables,
    serviceRequests: ws.isOwner ? serviceRequests : [],
    banquetLeads: ws.isOwner ? banquetLeads : [],
    serverTime: new Date().toISOString()
  }));
}

wss.on('connection', (ws, req) => {
  ws.isOwner = isOwnerRequest(req);
  sendInitialSync(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWsMessage(ws, data);
    } catch (err) {
      console.error('Error parsing WS message:', err);
    }
  });

  ws.on('error', (err) => console.error('WS client error:', err));
});

function handleWsMessage(ws, data) {
  if (data.type === 'AUTH_OWNER') {
    ws.isOwner = passwordsMatch(data.password);
    ws.send(JSON.stringify({ type: 'OWNER_AUTH_RESULT', authenticated: ws.isOwner }));
    if (ws.isOwner) sendInitialSync(ws);
    return;
  }

  const ownerMessageTypes = [
    'UPDATE_ORDER_STATUS', 'RESOLVE_SERVICE', 'TOGGLE_ITEM_AVAILABILITY',
    'UPDATE_MENU_ITEM', 'ADD_MENU_ITEM', 'DELETE_MENU_ITEM'
  ];
  if (ownerMessageTypes.includes(data.type) && !ws.isOwner) {
    ws.send(JSON.stringify({ type: 'OWNER_AUTH_REQUIRED' }));
    return;
  }

  switch (data.type) {
    case 'PLACE_ORDER': {
      const orderData = data.order;
      const newOrder = {
        id: `ord-${orderCounter}`,
        orderNumber: `#${orderCounter}`,
        tableId: String(orderData.tableId || "1"),
        tableName: orderData.tableName || `Table ${orderData.tableId || "1"}`,
        customerName: orderData.customerName || "Guest",
        items: orderData.items || [],
        subtotal: Number(orderData.subtotal || 0),
        tax: Number(orderData.tax || 0),
        tip: Number(orderData.tip || 0),
        total: Number(orderData.total || 0),
        status: "pending",
        specialInstructions: orderData.specialInstructions || "",
        paymentStatus: orderData.paymentStatus || "unpaid",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      orderCounter++;
      orders.unshift(newOrder);

      // Update table status
      const table = tables.find(t => t.id === newOrder.tableId);
      if (table) table.status = "occupied";

      // Acknowledge back to sender with created order object
      ws.send(JSON.stringify({
        type: 'ORDER_PLACED_CONFIRMATION',
        order: newOrder
      }));

      // Broadcast new order to all clients (especially Kitchen Dashboard)
      broadcast({
        type: 'NEW_ORDER',
        order: newOrder,
        tables: tables
      });
      break;
    }

    case 'UPDATE_ORDER_STATUS': {
      const { orderId, status } = data;
      const order = orders.find(o => o.id === orderId);
      if (order) {
        order.status = status;
        order.updatedAt = new Date().toISOString();

        // If completed or cancelled, check if table has any other active orders
        if (status === 'completed' || status === 'cancelled') {
          const activeOrdersForTable = orders.filter(
            o => o.tableId === order.tableId && o.status !== 'completed' && o.status !== 'cancelled'
          );
          if (activeOrdersForTable.length === 0) {
            const table = tables.find(t => t.id === order.tableId);
            if (table) table.status = "available";
          }
        }

        broadcast({
          type: 'ORDER_STATUS_CHANGED',
          order: order,
          tables: tables
        });
      }
      break;
    }

    case 'REQUEST_SERVICE': {
      const { tableId, type, message } = data;
      const table = tables.find(t => t.id === String(tableId)) || { name: `Table ${tableId}` };
      const newReq = {
        id: `req-${Date.now()}`,
        tableId: String(tableId),
        tableName: table.name,
        type: type || 'waiter',
        message: message || `Table ${tableId} requested assistance`,
        timestamp: new Date().toISOString(),
        resolved: false
      };
      serviceRequests.unshift(newReq);
      broadcast({
        type: 'NEW_SERVICE_REQUEST',
        serviceRequest: newReq
      });
      break;
    }

    
    case 'SUBMIT_BANQUET_LEAD': {
      const { lead } = data;
      const newLead = {
        id: `lead-${Date.now()}`,
        ...lead,
        status: 'new',
        createdAt: new Date().toISOString()
      };
      banquetLeads.unshift(newLead);
      broadcast({
        type: 'NEW_BANQUET_LEAD',
        lead: newLead
      });
      break;
    }

    case 'RESOLVE_SERVICE': {
      const { requestId } = data;
      const req = serviceRequests.find(r => r.id === requestId);
      if (req) {
        req.resolved = true;
        broadcast({
          type: 'SERVICE_REQUEST_RESOLVED',
          requestId: requestId
        });
      }
      break;
    }

    case 'TOGGLE_ITEM_AVAILABILITY': {
      const { itemId, isAvailable } = data;
      const item = menuItems.find(i => i.id === itemId);
      if (item) {
        item.isAvailable = (isAvailable !== undefined) ? isAvailable : !item.isAvailable;
        broadcast({
          type: 'MENU_ITEM_UPDATED',
          item: item
        });
      }
      break;
    }

    case 'UPDATE_MENU_ITEM': {
      const { item } = data;
      const index = menuItems.findIndex(i => i.id === item.id);
      if (index !== -1) {
        menuItems[index] = { ...menuItems[index], ...item };
        broadcast({
          type: 'MENU_ITEM_UPDATED',
          item: menuItems[index]
        });
      }
      break;
    }

    case 'ADD_MENU_ITEM': {
      const { item } = data;
      const newItem = {
        id: `dish-${Date.now()}`,
        name: item.name || "New Dish",
        category: item.category || "starters",
        price: Number(item.price || 0),
        description: item.description || "",
        image: item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
        dietary: item.dietary || "veg",
        spiceLevel: Number(item.spiceLevel || 0),
        isAvailable: true,
        isChefSpecial: !!item.isChefSpecial,
        prepTime: item.prepTime || "15 min",
        addons: item.addons || []
      };
      menuItems.push(newItem);
      broadcast({
        type: 'MENU_UPDATED',
        menu: menuItems
      });
      break;
    }

    case 'DELETE_MENU_ITEM': {
      const { itemId } = data;
      menuItems = menuItems.filter(i => i.id !== itemId);
      broadcast({
        type: 'MENU_UPDATED',
        menu: menuItems
      });
      break;
    }
  }
}

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// Network and Config Info
app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: isOwnerRequest(req) });
});

app.post('/api/auth/login', (req, res) => {
  const address = req.ip || 'unknown';
  const attempt = loginAttempts.get(address) || { count: 0, blockedUntil: 0 };
  if (attempt.blockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  if (!ownerCredentialsMatch(req.body.ownerId, req.body.password)) {
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.count = 0;
      attempt.blockedUntil = Date.now() + 60 * 1000;
    }
    loginAttempts.set(address, attempt);
    return res.status(401).json({ error: 'Incorrect owner password' });
  }

  loginAttempts.delete(address);
  const token = crypto.randomBytes(32).toString('hex');
  ownerSessions.set(token, Date.now() + OWNER_SESSION_TTL);
  res.setHeader('Set-Cookie', `owner_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${OWNER_SESSION_TTL / 1000}`);
  res.json({ authenticated: true });
});

app.post('/api/auth/logout', (req, res) => {
  const token = getCookie(req, 'owner_session');
  if (token) ownerSessions.delete(token);
  res.setHeader('Set-Cookie', 'owner_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ authenticated: false });
});

app.get('/api/network-info', (req, res) => {
  res.json({
    localIp,
    port: PORT,
    networkUrl: `http://${localIp}:${PORT}`,
    publicUrl: PUBLIC_URL || null,
    restaurantName: 'Coffee Culture – The Ristorante Lounge',
    city: 'Jabalpur'
  });
});

app.get('/api/qr/:tableId', async (req, res) => {
  const baseUrl = req.query.mode === 'network'
    ? `http://${localIp}:${PORT}`
    : (PUBLIC_URL || `http://${localIp}:${PORT}`);
  const targetUrl = `${baseUrl}/?table=${encodeURIComponent(req.params.tableId)}`;

  try {
    const qr = await QRCode.toBuffer(targetUrl, { type: 'png', width: 500, margin: 2 });
    res.type('png').send(qr);
  } catch (error) {
    res.status(500).json({ error: 'Could not generate QR code' });
  }
});

// Menu Endpoints
app.get('/api/menu', (req, res) => {
  res.json(menuItems);
});

// Tables
app.get('/api/tables', (req, res) => {
  res.json(tables);
});

// Orders
app.get('/api/orders', requireOwner, (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const newOrder = {
    id: `ord-${Date.now()}`,
    orderNumber: `#${1000 + orders.length + 1}`,
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  orders.push(newOrder);
  const table = tables.find(t => t.id === String(newOrder.tableId));
  if (table) table.status = "occupied";
  broadcast({
    type: 'NEW_ORDER',
    order: newOrder,
    tables: tables
  });
  res.status(201).json(newOrder);
});

app.post('/api/orders/:orderId/cancel', (req, res) => {
  const order = orders.find(item => item.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (String(req.body.tableId || '') !== String(order.tableId)) {
    return res.status(403).json({ error: 'Order does not belong to this table' });
  }
  if (order.status !== 'pending') {
    return res.status(409).json({ error: 'This order can no longer be cancelled' });
  }

  order.status = 'cancelled';
  order.updatedAt = new Date().toISOString();
  broadcast({ type: 'ORDER_STATUS_CHANGED', order, tables });
  res.json(order);
});

// Service Requests
app.get('/api/service-requests', requireOwner, (req, res) => {
  res.json(serviceRequests);
});

// Stats
app.get('/api/stats', requireOwner, (req, res) => {
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');

  const itemFrequency = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      itemFrequency[item.name] = (itemFrequency[item.name] || 0) + (item.quantity || 1);
    });
  });

  const topDishes = Object.keys(itemFrequency)
    .map(name => ({ name, count: itemFrequency[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    totalOrders: orders.length,
    activeOrders: activeOrders.length,
    readyOrders: orders.filter(o => o.status === 'ready').length,
    completedOrdersCount: completedOrders.length,
    totalRevenue: totalRevenue.toFixed(2),
    topDishes
  });
});

// Serve frontend for all unmatched GET routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🍽️  QR RESTAURANT ORDERING & OWNER DASHBOARD IS LIVE!`);
    console.log(`=======================================================`);
    console.log(`🚀 Local URL:    http://localhost:${PORT}`);
    console.log(`📱 Wi-Fi Mobile: http://${localIp}:${PORT}`);
    console.log(`👨‍🍳 Dashboard:   http://localhost:${PORT}/?view=dashboard`);
    console.log(`📋 Customer T4:  http://localhost:${PORT}/?table=4`);
    console.log(`🏷️  QR Hub:       http://localhost:${PORT}/?view=qr-hub`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
