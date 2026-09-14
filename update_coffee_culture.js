const fs = require('fs');

const coffeeCultureMenu = [
  // 1. Coffees & Cold Drinks
  {
    id: "cc-bev-1",
    name: "Classic Cappuccino",
    category: "coffees_drinks",
    price: 140,
    description: "Rich double espresso with silky textured steamed milk foam and a dusting of cocoa.",
    image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "5 min",
    addons: [
      { name: "Extra Espresso Shot", price: 35 },
      { name: "Vanilla Syrup", price: 30 },
      { name: "Caramel Drizzle", price: 30 }
    ]
  },
  {
    id: "cc-bev-2",
    name: "Signature Cold Coffee",
    category: "coffees_drinks",
    price: 150,
    description: "Thick, creamy and decadent blend of handcrafted espresso with chilled vanilla cream.",
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "6 min",
    addons: [
      { name: "Vanilla Ice Cream Scoop", price: 40 },
      { name: "Hazelnut Flavor", price: 35 },
      { name: "Chocolate Fudge Swirl", price: 35 }
    ]
  },
  {
    id: "cc-bev-3",
    name: "Cafe Latte",
    category: "coffees_drinks",
    price: 160,
    description: "Smooth espresso gently balanced with rich steamed milk and a delicate micro-foam layer.",
    image: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "5 min",
    addons: [
      { name: "Hazelnut Syrup", price: 35 },
      { name: "Oat Milk Substitute", price: 45 }
    ]
  },
  {
    id: "cc-bev-4",
    name: "Cafe Mocha",
    category: "coffees_drinks",
    price: 170,
    description: "Decadent Belgian dark chocolate melted with espresso and velvety steamed milk, topped with cream.",
    image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "7 min",
    addons: [
      { name: "Whipped Cream Cloud", price: 30 },
      { name: "Dark Chocolate Chips", price: 25 }
    ]
  },
  {
    id: "cc-bev-5",
    name: "Americano / Long Black",
    category: "coffees_drinks",
    price: 120,
    description: "Bold double shot of artisanal roasted Arabica espresso poured over steaming hot filtered water.",
    image: "https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=600&q=80",
    dietary: "vegan",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "4 min",
    addons: [
      { name: "Extra Espresso Shot", price: 35 }
    ]
  },
  {
    id: "cc-bev-6",
    name: "Exotic Berry Smoothie",
    category: "coffees_drinks",
    price: 180,
    description: "Refreshing crushed blueberries, strawberries, and rich Greek yogurt churned to frosty perfection.",
    image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "6 min",
    addons: [
      { name: "Chia Seeds & Honey", price: 25 }
    ]
  },
  {
    id: "cc-bev-7",
    name: "Chilled Belgian Frappe",
    category: "coffees_drinks",
    price: 190,
    description: "Ice-blended coffee beverage swirled with dark chocolate ganache and crowned with whipped cream.",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "7 min",
    addons: [
      { name: "Crushed Oreos", price: 30 }
    ]
  },
  {
    id: "cc-bev-8",
    name: "Veg Kama Ka Kazi (Signature Cooler)",
    category: "coffees_drinks",
    price: 159,
    description: "House special mocktail cooler infused with tangy citrus, spices, mint leaves and sparkling fizz.",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    dietary: "vegan",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "5 min",
    addons: []
  },
  {
    id: "cc-bev-9",
    name: "Veg Aam Panna Cooler",
    category: "coffees_drinks",
    price: 95,
    description: "Traditional roasted raw mango cooler spiced with cumin, black salt and fresh mint.",
    image: "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80",
    dietary: "vegan",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "4 min",
    addons: []
  },
  {
    id: "cc-bev-10",
    name: "Special Promo Cappuccino (Offer)",
    category: "coffees_drinks",
    price: 40,
    description: "Special promotional flash offer — aromatic handcrafted cappuccino at unbeatable cafe value.",
    image: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "5 min",
    addons: []
  },
  {
    id: "cc-bev-11",
    name: "Special Promo Cold Coffee (Offer)",
    category: "coffees_drinks",
    price: 40,
    description: "Special promotional chilled coffee brew — quick sweet refreshment.",
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "5 min",
    addons: []
  },

  // 2. Starters & Snacks
  {
    id: "cc-str-1",
    name: "Classic Salted French Fries",
    category: "starters",
    price: 140,
    description: "Golden crispy skin-on potato fries seasoned with sea salt, served with tangy tomato relish.",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    dietary: "vegan",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "8 min",
    addons: [
      { name: "Cheese Dip", price: 35 },
      { name: "Garlic Mayo", price: 25 }
    ]
  },
  {
    id: "cc-str-2",
    name: "Peri Peri Loaded Fries",
    category: "starters",
    price: 190,
    description: "Crispy fries dusted with fiery African peri-peri spices, drizzled with warm cheddar cheese sauce.",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 2,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "10 min",
    addons: [
      { name: "Extra Melted Cheddar", price: 40 },
      { name: "Jalapeno Slices", price: 25 }
    ]
  },
  {
    id: "cc-str-3",
    name: "Cheesy Garlic Bread",
    category: "starters",
    price: 180,
    description: "Toasted Italian baguette brushed with roasted garlic herb butter, smothered in bubbling mozzarella cheese.",
    image: "https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "10 min",
    addons: [
      { name: "Green Chilli & Corn Topping", price: 30 }
    ]
  },
  {
    id: "cc-str-4",
    name: "Crispy Chicken Wings",
    category: "starters",
    price: 260,
    description: "Crisp-fried tender chicken wings tossed in your choice of spicy BBQ or fiery honey chilli glaze.",
    image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80",
    dietary: "non-veg",
    spiceLevel: 2,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "14 min",
    addons: [
      { name: "Blue Cheese Dip", price: 40 }
    ]
  },
  {
    id: "cc-str-5",
    name: "Tandoori Starters Platter",
    category: "starters",
    price: 280,
    description: "Marinated spiced cottage cheese chunks and crunchy peppers grilled in tandoor style.",
    image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "12 min",
    addons: []
  },
  {
    id: "cc-str-6",
    name: "Cafe Special Maggi (Cheese & Butter)",
    category: "starters",
    price: 140,
    description: "All-time favorite instant noodles spiced with exotic cafe seasonings, loaded with butter and shredded cheese.",
    image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "8 min",
    addons: [
      { name: "Extra Cheese Cube", price: 30 }
    ]
  },
  {
    id: "cc-str-7",
    name: "Special Promo French Fries (Offer)",
    category: "starters",
    price: 40,
    description: "Special promotional flash offer — crispy salted french fries at café anniversary price.",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    dietary: "vegan",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "8 min",
    addons: []
  },
  {
    id: "cc-str-8",
    name: "Special Promo Maggi (Offer)",
    category: "starters",
    price: 40,
    description: "Flash deal hot masala Maggi bowl.",
    image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "7 min",
    addons: []
  },

  // 3. Salads
  {
    id: "cc-sal-1",
    name: "Chicken Caesar Salad",
    category: "salads",
    price: 340,
    description: "Crisp romaine hearts tossed with grilled herb chicken breast, garlic croutons, parmesan shavings & Caesar dressing.",
    image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80",
    dietary: "non-veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "10 min",
    addons: [
      { name: "Extra Grilled Chicken", price: 80 }
    ]
  },
  {
    id: "cc-sal-2",
    name: "Tandoori Paneer Salad",
    category: "salads",
    price: 220,
    description: "Tender tandoori paneer cubes, tossed cherry tomatoes, bell peppers, fresh greens and lemon-cumin vinaigrette.",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "10 min",
    addons: []
  },
  {
    id: "cc-sal-3",
    name: "Mediterranean Tossed Garden Salad",
    category: "salads",
    price: 190,
    description: "Fresh cucumbers, kalamata olives, feta crumbles, crisp greens drizzled with extra virgin olive oil.",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "8 min",
    addons: []
  },

  // 4. Burgers & Sandwiches
  {
    id: "cc-brg-1",
    name: "American-Style Gourmet Veg Burger",
    category: "burgers_sandwiches",
    price: 190,
    description: "Crisp potato-herb patty, melted cheese slice, caramelized onions, gherkins and secret bistro sauce on a brioche bun.",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "12 min",
    addons: [
      { name: "Extra Cheddar Slice", price: 30 },
      { name: "Side of Fries Upgrade", price: 50 }
    ]
  },
  {
    id: "cc-brg-2",
    name: "American-Style Crispy Chicken Burger",
    category: "burgers_sandwiches",
    price: 250,
    description: "Buttermilk fried crispy chicken thigh, honey mustard coleslaw, cheddar cheese and chipotle mayo.",
    image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80",
    dietary: "non-veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "14 min",
    addons: [
      { name: "Extra Fried Bacon / Egg", price: 60 },
      { name: "Side of Fries Upgrade", price: 50 }
    ]
  },
  {
    id: "cc-brg-3",
    name: "Triple Decker Club Sandwich",
    category: "burgers_sandwiches",
    price: 180,
    description: "Three layers of toasted multigrain bread packed with cucumber, tomatoes, cheese, coleslaw and herb spread.",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "10 min",
    addons: [
      { name: "Cheese Burst Layer", price: 35 }
    ]
  },
  {
    id: "cc-brg-4",
    name: "Grilled Corn & Cheese Sandwich",
    category: "burgers_sandwiches",
    price: 160,
    description: "Golden toasted panini bread with sweet American corn kernels, crushed peppers and gooey melted mozzarella.",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "10 min",
    addons: []
  },
  {
    id: "cc-brg-5",
    name: "Special Promo Burger (Offer)",
    category: "burgers_sandwiches",
    price: 40,
    description: "Limited time promotional cafe veggie snack burger.",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "10 min",
    addons: []
  },

  // 5. Pizzas
  {
    id: "cc-piz-1",
    name: "Classic Margherita Pizza",
    category: "pizzas",
    price: 240,
    description: "Thin crust artisan pizza baked with San Marzano tomato sauce, fresh mozzarella cheese, basil and olive oil.",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "15 min",
    addons: [
      { name: "Extra Mozzarella", price: 50 },
      { name: "Mushrooms", price: 40 }
    ]
  },
  {
    id: "cc-piz-2",
    name: "Regular Farmhouse Veg Pizza",
    category: "pizzas",
    price: 260,
    description: "Loaded with bell peppers, crisp onions, tender sweet corn, button mushrooms and bubbling cheese.",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "15 min",
    addons: [
      { name: "Jalapenos & Black Olives", price: 45 },
      { name: "Cheese Crust", price: 60 }
    ]
  },
  {
    id: "cc-piz-3",
    name: "Premium Loaded Cheese & Paneer Pizza",
    category: "pizzas",
    price: 380,
    description: "Chef's special pizza with spiced paneer tikka, red paprika, charred capsicum, and a four-cheese blend.",
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "16 min",
    addons: [
      { name: "Stuffed Crust", price: 70 }
    ]
  },
  {
    id: "cc-piz-4",
    name: "Barbecue Chicken Supreme Pizza",
    category: "pizzas",
    price: 390,
    description: "Smoky barbecue shredded chicken, caramelized red onions, roasted peppers and mozzarella on crisp crust.",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
    dietary: "non-veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "16 min",
    addons: [
      { name: "Extra BBQ Chicken", price: 70 }
    ]
  },
  {
    id: "cc-piz-5",
    name: "Special Promo Personal Pizza (Offer)",
    category: "pizzas",
    price: 40,
    description: "Special promotional flash offer — personal 6-inch cheese pizza on cafe deal days.",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "12 min",
    addons: []
  },

  // 6. Pastas
  {
    id: "cc-pas-1",
    name: "Italian Creamy Alfredo White Sauce Pasta",
    category: "pastas",
    price: 260,
    description: "Penne tossed in a velvety garlic parmesan cream sauce with sautéed mushrooms, broccoli and herbs.",
    image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "14 min",
    addons: [
      { name: "Garlic Bread Slice (2 pcs)", price: 40 },
      { name: "Extra Parmesan Shavings", price: 35 }
    ]
  },
  {
    id: "cc-pas-2",
    name: "Spicy Italian Arrabbiata Red Sauce Pasta",
    category: "pastas",
    price: 250,
    description: "Italian penne pasta cooked in slow-simmered plum tomato ragu infused with fiery red chilli flakes, basil & garlic.",
    image: "https://images.unsplash.com/photo-1621996346565-e3d5d62816ef?auto=format&fit=crop&w=600&q=80",
    dietary: "vegan",
    spiceLevel: 2,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "12 min",
    addons: [
      { name: "Black Olives & Mushrooms", price: 40 }
    ]
  },
  {
    id: "cc-pas-3",
    name: "Creamy Chicken Alfredo Pasta",
    category: "pastas",
    price: 330,
    description: "Tender seasoned grilled chicken breast tossed with fettuccine in decadent rich Italian white cream sauce.",
    image: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=600&q=80",
    dietary: "non-veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "15 min",
    addons: [
      { name: "Extra Grilled Chicken", price: 65 }
    ]
  },

  // 7. Sizzlers & Mains
  {
    id: "cc-siz-1",
    name: "Signature Veg Sizzler",
    category: "sizzlers_mains",
    price: 340,
    description: "Sizzling platter loaded with buttered herb rice, grilled seasonal vegetables, French fries and hot pepper garlic sauce.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "18 min",
    addons: [
      { name: "Extra Sizzler Sauce", price: 40 },
      { name: "Melted Cheese on Rice", price: 45 }
    ]
  },
  {
    id: "cc-siz-2",
    name: "Paneer Tikka Steak Sizzler",
    category: "sizzlers_mains",
    price: 360,
    description: "Tandoor-charred cottage cheese steaks served over fragrant rice with sautéed baby corn, fries and spicy barbecue glaze.",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "18 min",
    addons: []
  },
  {
    id: "cc-siz-3",
    name: "Classic Chicken Sizzler",
    category: "sizzlers_mains",
    price: 380,
    description: "Plump marinated grilled chicken breast served sizzling with buttered parsley rice, potato wedges, and mushroom brown sauce.",
    image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80",
    dietary: "non-veg",
    spiceLevel: 1,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "20 min",
    addons: [
      { name: "Fried Egg on Top", price: 30 }
    ]
  },

  // 8. Desserts & Bakery
  {
    id: "cc-des-1",
    name: "Sizzling Brownie with Ice Cream",
    category: "desserts",
    price: 180,
    description: "Warm walnut dark chocolate brownie served on a cast-iron sizzler plate, crowned with vanilla ice cream and bubbling fudge sauce.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "7 min",
    addons: [
      { name: "Extra Vanilla Ice Cream Scoop", price: 40 },
      { name: "Roasted Almond Flakes", price: 25 }
    ]
  },
  {
    id: "cc-des-2",
    name: "Exotic Hot Fudge Chocolate Sundae",
    category: "desserts",
    price: 190,
    description: "Three generous scoops of premium ice cream drizzled with hot Belgian fudge, topped with roasted nuts and a maraschino cherry.",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "6 min",
    addons: []
  },
  {
    id: "cc-des-3",
    name: "Exotic Red Velvet Pastry",
    category: "desserts",
    price: 150,
    description: "Layers of moist crimson sponge cake layered with silky cream cheese frosting and white chocolate curls.",
    image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: false,
    prepTime: "4 min",
    addons: []
  },
  {
    id: "cc-des-4",
    name: "Warm Belgian Choco Lava Cake",
    category: "desserts",
    price: 160,
    description: "Decadent dark cocoa sponge cake that reveals a luscious pool of warm molten chocolate when sliced.",
    image: "https://images.unsplash.com/photo-1617305855058-336d24456869?auto=format&fit=crop&w=600&q=80",
    dietary: "veg",
    spiceLevel: 0,
    isAvailable: true,
    isChefSpecial: true,
    prepTime: "6 min",
    addons: [
      { name: "Vanilla Ice Cream Scoop", price: 40 }
    ]
  }
];

const sampleOrders = [
  {
    id: "ord-1001",
    orderNumber: "#1001",
    tableId: "4",
    tableName: "Table 4",
    customerName: "Rohan S.",
    items: [
      {
        id: "cc-bev-1",
        name: "Classic Cappuccino",
        price: 140,
        quantity: 2,
        selectedAddons: [{ name: "Caramel Drizzle", price: 30 }],
        notes: "Extra hot please"
      },
      {
        id: "cc-str-2",
        name: "Peri Peri Loaded Fries",
        price: 190,
        quantity: 1,
        selectedAddons: [{ name: "Extra Melted Cheddar", price: 40 }],
        notes: "Crispy"
      },
      {
        id: "cc-piz-1",
        name: "Classic Margherita Pizza",
        price: 240,
        quantity: 1,
        selectedAddons: [],
        notes: ""
      }
    ],
    subtotal: 740,
    tax: 37,
    tip: 50,
    total: 827,
    status: "preparing",
    specialInstructions: "Table on the window side",
    paymentStatus: "paid",
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString()
  },
  {
    id: "ord-1002",
    orderNumber: "#1002",
    tableId: "7",
    tableName: "Table 7",
    customerName: "Pooja & Friends",
    items: [
      {
        id: "cc-siz-1",
        name: "Signature Veg Sizzler",
        price: 340,
        quantity: 1,
        selectedAddons: [{ name: "Extra Sizzler Sauce", price: 40 }],
        notes: "Spicy sauce"
      },
      {
        id: "cc-bev-2",
        name: "Signature Cold Coffee",
        price: 150,
        quantity: 2,
        selectedAddons: [{ name: "Vanilla Ice Cream Scoop", price: 40 }],
        notes: ""
      },
      {
        id: "cc-des-1",
        name: "Sizzling Brownie with Ice Cream",
        price: 180,
        quantity: 1,
        selectedAddons: [],
        notes: "Serve after sizzler"
      }
    ],
    subtotal: 940,
    tax: 47,
    tip: 60,
    total: 1047,
    status: "pending",
    specialInstructions: "Birthday celebration hangout",
    paymentStatus: "unpaid",
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString()
  }
];

let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace menuItems
const menuBlockRegex = /let menuItems = \[\s*[\s\S]*?\s*\];\s*let tables =/m;
const newMenuBlock = 'let menuItems = ' + JSON.stringify(coffeeCultureMenu, null, 2) + ';\n\nlet tables =';

if (menuBlockRegex.test(serverJs)) {
  serverJs = serverJs.replace(menuBlockRegex, newMenuBlock);
  console.log('Replaced menuItems successfully!');
} else {
  console.error('Could not match menuItems regex!');
}

// Replace orders
const ordersBlockRegex = /let orders = \[\s*[\s\S]*?\s*\];\s*let serviceRequests =/m;
const newOrdersBlock = 'let orders = ' + JSON.stringify(sampleOrders, null, 2) + ';\n\nlet serviceRequests =';

if (ordersBlockRegex.test(serverJs)) {
  serverJs = serverJs.replace(ordersBlockRegex, newOrdersBlock);
  console.log('Replaced orders successfully!');
} else {
  console.log('Could not match orders regex, attempting looser match...');
  const looserRegex = /let orders = \[\s*[\s\S]*?\n\];/m;
  if (looserRegex.test(serverJs)) {
    serverJs = serverJs.replace(looserRegex, 'let orders = ' + JSON.stringify(sampleOrders, null, 2) + ';');
    console.log('Replaced orders with looser match!');
  }
}

fs.writeFileSync('server.js', serverJs);
console.log('server.js successfully updated with Coffee Culture menu and orders!');
