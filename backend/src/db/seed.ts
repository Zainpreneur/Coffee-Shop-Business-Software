import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, initSchema } from "./index";

function seed() {
  initSchema();

  const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (userCount > 0) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  console.log("Seeding database...");

  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`
  );
  const passwordHash = bcrypt.hashSync("password123", 10);
  insertUser.run("Alex Rivera", "admin@coffeeshop.test", passwordHash, "admin");
  insertUser.run("Morgan Lee", "manager@coffeeshop.test", passwordHash, "manager");
  insertUser.run("Sam Chen", "cashier@coffeeshop.test", passwordHash, "cashier");

  const insertCategory = db.prepare(`INSERT INTO categories (name, sort_order) VALUES (?, ?)`);
  const categories = ["Hot Coffee", "Cold Coffee", "Tea", "Pastries", "Sandwiches"];
  categories.forEach((name, i) => insertCategory.run(name, i));
  const categoryRows = db.prepare("SELECT id, name FROM categories").all() as { id: number; name: string }[];
  const catId = (name: string) => categoryRows.find((c) => c.name === name)!.id;

  const insertInventory = db.prepare(
    `INSERT INTO inventory_items (name, unit, quantity_on_hand, reorder_level, cost_per_unit) VALUES (?, ?, ?, ?, ?)`
  );
  const inventory = [
    ["Espresso Beans", "g", 5000, 1000, 0.02],
    ["Milk", "ml", 8000, 2000, 0.001],
    ["Oat Milk", "ml", 3000, 1000, 0.003],
    ["Sugar", "g", 4000, 500, 0.001],
    ["Vanilla Syrup", "ml", 1500, 300, 0.01],
    ["Caramel Syrup", "ml", 1500, 300, 0.01],
    ["Chocolate Syrup", "ml", 1500, 300, 0.01],
    ["Tea Leaves - Black", "g", 1000, 200, 0.02],
    ["Tea Leaves - Green", "g", 1000, 200, 0.02],
    ["Croissant Dough", "unit", 40, 10, 0.8],
    ["Bagel", "unit", 30, 10, 0.6],
    ["Cream Cheese", "g", 2000, 500, 0.01],
    ["Ham", "g", 2000, 500, 0.02],
    ["Cheese Slice", "unit", 60, 15, 0.3],
    ["Bread Loaf", "unit", 20, 5, 1.2],
    ["Whipped Cream", "ml", 1500, 300, 0.005],
    ["Ice", "g", 20000, 5000, 0.0005],
  ] as const;
  const invIds: Record<string, number> = {};
  for (const [name, unit, qty, reorder, cost] of inventory) {
    const info = insertInventory.run(name, unit, qty, reorder, cost);
    invIds[name] = info.lastInsertRowid as number;
  }

  const insertMenuItem = db.prepare(
    `INSERT INTO menu_items (category_id, name, description, price, image_emoji) VALUES (?, ?, ?, ?, ?)`
  );
  const insertRecipe = db.prepare(
    `INSERT INTO recipe_items (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)`
  );

  type MenuDef = {
    category: string;
    name: string;
    description: string;
    price: number;
    emoji: string;
    recipe: [string, number][];
  };

  const menuDefs: MenuDef[] = [
    {
      category: "Hot Coffee",
      name: "Espresso",
      description: "Double shot of rich espresso",
      price: 3.0,
      emoji: "☕",
      recipe: [["Espresso Beans", 18]],
    },
    {
      category: "Hot Coffee",
      name: "Cappuccino",
      description: "Espresso with steamed milk foam",
      price: 4.25,
      emoji: "☕",
      recipe: [["Espresso Beans", 18], ["Milk", 150]],
    },
    {
      category: "Hot Coffee",
      name: "Latte",
      description: "Espresso with steamed milk",
      price: 4.5,
      emoji: "☕",
      recipe: [["Espresso Beans", 18], ["Milk", 200]],
    },
    {
      category: "Hot Coffee",
      name: "Caramel Macchiato",
      description: "Espresso, milk, and caramel drizzle",
      price: 4.95,
      emoji: "☕",
      recipe: [["Espresso Beans", 18], ["Milk", 180], ["Caramel Syrup", 20]],
    },
    {
      category: "Hot Coffee",
      name: "Mocha",
      description: "Espresso with chocolate and steamed milk",
      price: 4.95,
      emoji: "☕",
      recipe: [["Espresso Beans", 18], ["Milk", 180], ["Chocolate Syrup", 20]],
    },
    {
      category: "Cold Coffee",
      name: "Iced Latte",
      description: "Espresso with cold milk over ice",
      price: 4.75,
      emoji: "🧊",
      recipe: [["Espresso Beans", 18], ["Milk", 180], ["Ice", 150]],
    },
    {
      category: "Cold Coffee",
      name: "Cold Brew",
      description: "Slow-steeped cold brew coffee",
      price: 4.5,
      emoji: "🧊",
      recipe: [["Espresso Beans", 25], ["Ice", 100]],
    },
    {
      category: "Cold Coffee",
      name: "Oat Milk Iced Latte",
      description: "Espresso with oat milk over ice",
      price: 5.25,
      emoji: "🧊",
      recipe: [["Espresso Beans", 18], ["Oat Milk", 180], ["Ice", 150]],
    },
    {
      category: "Cold Coffee",
      name: "Vanilla Sweet Cream Cold Brew",
      description: "Cold brew topped with vanilla sweet cream",
      price: 5.5,
      emoji: "🧊",
      recipe: [["Espresso Beans", 25], ["Ice", 100], ["Vanilla Syrup", 20], ["Whipped Cream", 30]],
    },
    {
      category: "Tea",
      name: "Black Tea",
      description: "Classic hot black tea",
      price: 3.0,
      emoji: "🍵",
      recipe: [["Tea Leaves - Black", 5]],
    },
    {
      category: "Tea",
      name: "Green Tea",
      description: "Classic hot green tea",
      price: 3.0,
      emoji: "🍵",
      recipe: [["Tea Leaves - Green", 5]],
    },
    {
      category: "Tea",
      name: "Chai Latte",
      description: "Spiced tea with steamed milk",
      price: 4.5,
      emoji: "🍵",
      recipe: [["Tea Leaves - Black", 6], ["Milk", 180]],
    },
    {
      category: "Pastries",
      name: "Butter Croissant",
      description: "Flaky, buttery croissant",
      price: 3.25,
      emoji: "🥐",
      recipe: [["Croissant Dough", 1]],
    },
    {
      category: "Pastries",
      name: "Bagel with Cream Cheese",
      description: "Toasted bagel with cream cheese",
      price: 3.75,
      emoji: "🥯",
      recipe: [["Bagel", 1], ["Cream Cheese", 40]],
    },
    {
      category: "Sandwiches",
      name: "Ham & Cheese Sandwich",
      description: "Ham and cheese on toasted bread",
      price: 6.5,
      emoji: "🥪",
      recipe: [["Bread Loaf", 0.25], ["Ham", 60], ["Cheese Slice", 1]],
    },
  ];

  for (const def of menuDefs) {
    const info = insertMenuItem.run(catId(def.category), def.name, def.description, def.price, def.emoji);
    const menuItemId = info.lastInsertRowid as number;
    for (const [invName, qty] of def.recipe) {
      insertRecipe.run(menuItemId, invIds[invName], qty);
    }
  }

  const insertCustomer = db.prepare(
    `INSERT INTO customers (name, email, phone, loyalty_points) VALUES (?, ?, ?, ?)`
  );
  insertCustomer.run("Jamie Park", "jamie.park@example.com", "555-0101", 120);
  insertCustomer.run("Taylor Smith", "taylor.smith@example.com", "555-0102", 45);
  insertCustomer.run("Riley Johnson", "riley.johnson@example.com", "555-0103", 300);

  console.log("Seed complete.");
  console.log("Login with: admin@coffeeshop.test / manager@coffeeshop.test / cashier@coffeeshop.test, password: password123");
}

seed();
