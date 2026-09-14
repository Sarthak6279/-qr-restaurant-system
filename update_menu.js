const fs = require('fs');

const menuData = [
  { category: 'breakfast', items: [
    ['Tea', 80], ['Coffee', 120], ['Fresh seasonal juice', 180], ['Fruit platter', 250],
    ['Poha', 150], ['Idli and sambhar', 180], ['Aloo paratha with curd', 220],
    ['Masala dosa', 250], ['Continental breakfast', 450], ['Shawn Elizey breakfast combo', 550]
  ]},
  { category: 'soups', items: [
    ['Tomato soup', 220], ['Sweet corn soup', 240], ['Hot and sour soup', 240],
    ['Manchow soup', 250], ['Cream of mushroom soup', 280], ['Dal shorba', 220]
  ]},
  { category: 'veg_starters', items: [
    ['Paneer tikka', 420], ['Hara bhara kebab', 350], ['Dahi ke kebab', 380],
    ['Veg seekh kebab', 360], ['Tandoori vegetables', 380], ['Crispy corn', 320],
    ['Cheese stuffed mushroom', 420]
  ]},
  { category: 'non_veg_starters', items: [
    ['Chicken tikka', 520], ['Chicken seekh kebab', 500], ['Chicken malai tikka', 560],
    ['Tandoori chicken half', 550], ['Tandoori chicken full', 950], ['Fish tikka', 650],
    ['Mutton seekh kebab', 650]
  ]},
  { category: 'veg_mains', items: [
    ['Dal tadka', 280], ['Dal makhani', 340], ['Shahi paneer', 420],
    ['Paneer butter masala', 430], ['Kadai paneer', 420], ['Mix vegetable', 360],
    ['Veg kofta', 400], ['Jeera rice', 280], ['Veg pulao', 320], ['Assorted Indian bread basket', 350]
  ]},
  { category: 'non_veg_mains', items: [
    ['Butter chicken', 580], ['Kadai chicken', 560], ['Chicken curry', 540],
    ['Chicken tikka masala', 600], ['Mutton rogan josh', 700], ['Fish curry', 650],
    ['Egg curry', 380], ['Chicken biryani', 550], ['Mutton biryani', 700]
  ]},
  { category: 'chinese_continental', items: [
    ['Veg noodles', 320], ['Chicken noodles', 420], ['Veg fried rice', 320],
    ['Chicken fried rice', 420], ['Chilli paneer', 420], ['Chilli chicken', 520],
    ['Pasta Alfredo', 450], ['Arrabbiata pasta', 420], ['Grilled vegetables', 420],
    ['Grilled chicken', 650], ['Veg sandwich', 280], ['Chicken sandwich', 380],
    ['Margherita pizza', 450], ['Farmhouse pizza', 550], ['Chicken pizza', 650]
  ]},
  { category: 'desserts', items: [
    ['Gulab jamun', 180], ['Rasmalai', 220], ['Brownie with ice cream', 320],
    ['Fruit cream', 250], ['Ice cream, two scoops', 220], ['Chocolate mousse', 280],
    ['Fresh fruit platter', 300], ['Cheesecake', 350]
  ]},
  { category: 'beverages', items: [
    ['Mineral water', 60], ['Soft drink', 120], ['Fresh lime soda', 160],
    ['Virgin mojito', 250], ['Fresh juice', 220], ['Cold coffee', 250],
    ['Milkshake', 280], ['Masala tea', 120], ['Cappuccino', 220], ['Latte', 240]
  ]}
];

let generatedMenuItems = [];
let idCounter = 1;

for (const section of menuData) {
  for (const item of section.items) {
    let dietary = 'veg';
    if (section.category.includes('non_veg') || item[0].toLowerCase().includes('chicken') || item[0].toLowerCase().includes('mutton') || item[0].toLowerCase().includes('fish') || item[0].toLowerCase().includes('egg')) {
        dietary = 'non-veg';
    }
    
    generatedMenuItems.push({
      id: `dish-${idCounter++}`,
      name: item[0],
      category: section.category,
      price: item[1],
      description: "Sample description for " + item[0],
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      dietary: dietary,
      spiceLevel: 0,
      isAvailable: true,
      isChefSpecial: false,
      prepTime: "15 min",
      addons: []
    });
  }
}

const menuString = 'let menuItems = ' + JSON.stringify(generatedMenuItems, null, 2) + ';';

let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace everything between 'let menuItems = [' and 'let tables = ['
const regex = /let menuItems = \[\s*[\s\S]*?\s*\];\s*let tables =/m;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, menuString + '\n\nlet tables =');
    
    fs.writeFileSync('server.js', serverJs);
    console.log("Menu successfully updated!");
} else {
    console.log("Could not find the menuItems block to replace.");
}
