import { Restaurant, MenuSection } from './types.ts';
import okMinimarkLogo from './assets/images/ok_minimark_logo_1781204934172.jpg';


export const restaurants: Restaurant[] = [
  {
    id: 'lucy-blu',
    name: 'Lucy Blu',
    description: 'Lucy Blu Restaurant featuring breakfast, mains, pizzas, and an extensive wine list.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1000',
    category: 'Bistro & Bar',
    rating: 4.8,
    deliveryTime: '30-45 min',
    email: 'orders@lucyblu.co.za',
    phone: '028 254 9123',
    responsiblePerson: 'Lucy Blue',
    isVisible: true,
    menu: [
      {
        id: 'breakfast',
        title: 'Sunrise Soirée',
        subtitle: 'Served till 12h00',
        note: 'A 12.5% gratuity will be added to tables of eight or more. Please note, we cannot do split bills. All our food is made to order - please be patient with us.',
        content: [
          {
            items: [
              {
                name: "The Basic",
                description: "Two eggs, bacon, grilled tomato, toast.",
                price: "R95",
                extras: [{ label: "Replace bacon with vegan bacon", price: "R115" }],
                modifiers: ["Egg Style"]
              },
              {
                name: "French Toast",
                description: "Dipped and fried bread, bacon, syrup.",
                price: "R85"
              },
              {
                name: "Lucy",
                description: "Two eggs, bacon, banger, fried mushrooms, grilled tomato, toast.",
                price: "R135",
                extras: [{ label: "Replace meat with vegan bacon & sausage", price: "R155" }],
                modifiers: ["Egg Style"]
              },
              {
                name: "Three-Egg Omelette",
                description: "Free-range eggs with a choice of three fillings served with toast. Options: Bacon, Smoked trout, Pulled pork, Ham, Banger slices, Chorizo, Pepperoni, Cheddar, Mozzarella, Tomato, Mushrooms, Onions, Spicy chicken livers.",
                price: "R135"
              },
              {
                name: "Eggs Benedict",
                description: "Two poached eggs nestled on an English muffin with rocket, avo and bacon, finished with hollandaise sauce.",
                price: "R145",
                extras: [{ label: "Replace bacon with vegan bacon", price: "R155" }]
              },
              {
                name: "Breakfast Parfait",
                description: "Layers of Greek yoghurt, fresh fruit, homemade granola, topped with honey.",
                price: "R115"
              },
              {
                name: "Eggs Royale",
                description: "Two poached eggs nestled on an English muffin with rocket, avo and smoked trout, finished with hollandaise sauce.",
                price: "R155",
                extras: [{ label: "Replace salmon with vegan bacon", price: "R165" }]
              },
              {
                name: "Croissant",
                description: "Mixed berry compote, cream or cream cheese.",
                price: "R115"
              }
            ]
          }
        ]
      },
      {
        id: 'mains',
        title: 'Mains',
        content: [
          {
            items: [
              {
                name: "Szechuan Pork Belly",
                description: "Asian flavours, noodles and stir-fry vegetables.",
                price: "R235"
              },
              {
                name: "Nonna's Meatballs",
                description: "Saucy beef meatballs served on linguini, topped with mozzarella and parmesan.",
                price: "R165"
              },
              {
                name: "Spicy Chicken Livers",
                description: "Sautéed in brandy, served with toast.",
                price: "R165"
              },
              {
                name: "Chef's Salad",
                description: "Greek-style salad with a sprinkling of nuts and our homemade vinaigrette.",
                price: "R145",
                extras: [
                  { label: "Add pulled chicken", price: "+R20" },
                  { label: "Add smoked trout", price: "+R30" },
                  { label: "Replace feta with vegan feta", price: "+R20" }
                ]
              },
              {
                name: "Steak",
                description: "250g steak served with a sauce of your choice, accompanied by chips or salad. Sauces: Pepper, mushroom, cheese, chimichurri, garlic butter, peri-peri, garlic sauce.",
                price: "R230",
                modifiers: ["Temperature", "Select Sauce"]
              }
            ]
          },
          {
            title: "Gourmet Burgers",
            description: "Served with Chips or Salad",
            items: [
              {
                name: "Beef or Chicken Burger",
                description: "Homemade beef patty (double) or a grilled chicken fillet served with chips.",
                price: "R135",
                extras: [{ label: "Vegan patty option", price: "R155" }],
                modifiers: ["Select Patty"]
              },
              {
                name: "The Drunken Mushroom",
                description: "Beef or Chicken topped with a mushroom brandy cream sauce.",
                price: "R160",
                modifiers: ["Select Patty"]
              },
              {
                name: "The Caprese",
                description: "Beef or Chicken, homemade mozzarella, heirloom tomato, basil pesto.",
                price: "R160",
                modifiers: ["Select Patty"]
              },
              {
                name: "Juicy Lucy",
                description: "Chicken topped with cheese and pineapple with our secret house sauce.",
                price: "R160"
              },
              {
                name: "The Jefa",
                description: "Beef or Chicken, peri-mayo, avo, bacon, cheese, and spicy salsa.",
                price: "R185",
                modifiers: ["Select Patty"]
              }
            ]
          }
        ]
      },
      {
        id: 'pizza',
        title: 'Pizza',
        content: [
          {
            items: [
              { name: "Pizza Bread", description: "Feta, garlic.", price: "R95", modifiers: ["Pizza Toppings"] },
              { name: "Margherita", description: "Fresh basil, oregano.", price: "R110", modifiers: ["Pizza Toppings"] },
              { name: "Hawaiian", description: "Ham, pineapple.", price: "R145", modifiers: ["Pizza Toppings"] },
              { name: "Regina", description: "Ham, mushroom.", price: "R150", modifiers: ["Pizza Toppings"] },
              { name: "Glow", description: "Pulled chicken, peppadews, feta, chilli jam.", price: "R165", modifiers: ["Pizza Toppings"] },
              { name: "Icon", description: "Bacon, feta, avo.", price: "R160", modifiers: ["Pizza Toppings"] },
              { name: "Lucy", description: "Bacon, chorizo, pepperoni, ham, rocket.", price: "R180", modifiers: ["Pizza Toppings"] },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'ok-minimark',
    name: 'OK MiniMark Greyton',
    description: 'Fresh everyday groceries, basic essentials, local fresh produce, and household goods delivered straight to your door.',
    image: okMinimarkLogo,
    category: 'Retail Grocery Store',
    rating: 4.6,
    deliveryTime: '20-40 min',
    email: 'minimark@greyton.co.za',
    phone: '028 254 9888',
    responsiblePerson: 'Deon Joubert',
    isVisible: true,
    isGroceryStore: true,
    menu: [],
    popularGroceryItems: [
      { name: "Fresh Bananas 1kg", description: "Ripe local sweet bananas", price: "R24.90" },
      { name: "Full Cream Milk 2L", description: "Freshly pasteurized creamy dairy milk", price: "R32.00" },
      { name: "White Sliced Bread 700g", description: "Freshly-baked day-to-day sandwich loaf", price: "R18.50" },
      { name: "Extra Large Eggs 18s", description: "Free-range farmhouse brown eggs", price: "R52.00" },
      { name: "Unsalted Butter 500g", description: "Rich churned dairy table butter", price: "R65.00" },
      { name: "White Sugar 2.5kg", description: "Fine select white granulated sugar", price: "R48.00" },
      { name: "Ceylon Black Tea 100s", description: "Rich tagless morning tea bags", price: "R42.90" },
      { name: "Instant Coffee Granules 200g", description: "Rich roast premium coffee blend", price: "R115.00" },
      { name: "Sunflower Cooking Oil 2L", description: "Pure sunflower cooking oil", price: "R75.05" },
      { name: "Potatoes 2kg pocket", description: "Locally sourced rustic cooking potatoes", price: "R39.95" },
      { name: "Spaghetti Pasta 500g", description: "Traditional durum wheat semolina pasta", price: "R17.50" },
      { name: "Baked Beans 410g", description: "Premium canned slow-cooked haricot beans", price: "R14.95" }
    ]
  }
];

export const menuData: MenuSection[] = restaurants[0].menu; // Fallback for old code
