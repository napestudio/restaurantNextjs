import { PrismaClient, UserRole, PriceType } from "../app/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create Restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { id: "seed-restaurant-1" },
    update: {},
    create: {
      id: "seed-restaurant-1",
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      description: "A demo restaurant for testing and development",
      phone: "+1 (555) 123-4567",
      logoUrl: "/logo.png",
      isActive: true,
    },
  });
  console.log("✅ Restaurant created:", restaurant.name);

  // Create Branch
  const branch = await prisma.branch.upsert({
    where: { id: "seed-branch-1" },
    update: {},
    create: {
      id: "seed-branch-1",
      name: "Main Branch",
      slug: "main-branch",
      address: "123 Main Street, Downtown",
      restaurantId: restaurant.id,
    },
  });
  console.log("✅ Branch created:", branch.name);

  // Create Admin User
  const hashedPassword = await bcrypt.hash("Admin@123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@restaurant.com" },
    update: {},
    create: {
      email: "admin@restaurant.com",
      name: "Admin User",
      accounts: {
        create: {
          type: "credentials",
          provider: "credentials",
          providerAccountId: "admin@restaurant.com",
          refresh_token: hashedPassword,
        },
      },
      userOnBranches: {
        create: {
          branchId: branch.id,
          role: UserRole.ADMIN,
        },
      },
    },
  });
  console.log("✅ Admin user created:", adminUser.email);

  // Create Manager User
  const managerPassword = await bcrypt.hash("Manager@123", 10);
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@restaurant.com" },
    update: {},
    create: {
      email: "manager@restaurant.com",
      name: "Manager User",
      accounts: {
        create: {
          type: "credentials",
          provider: "credentials",
          providerAccountId: "manager@restaurant.com",
          refresh_token: managerPassword,
        },
      },
      userOnBranches: {
        create: {
          branchId: branch.id,
          role: UserRole.MANAGER,
        },
      },
    },
  });
  console.log("✅ Manager user created:", managerUser.email);

  // Create Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: "cat-appetizers" },
      update: {},
      create: {
        id: "cat-appetizers",
        name: "Appetizers",
        order: 1,
        restaurantId: restaurant.id,
      },
    }),
    prisma.category.upsert({
      where: { id: "cat-main-courses" },
      update: {},
      create: {
        id: "cat-main-courses",
        name: "Main Courses",
        order: 2,
        restaurantId: restaurant.id,
      },
    }),
    prisma.category.upsert({
      where: { id: "cat-desserts" },
      update: {},
      create: {
        id: "cat-desserts",
        name: "Desserts",
        order: 3,
        restaurantId: restaurant.id,
      },
    }),
    prisma.category.upsert({
      where: { id: "cat-beverages" },
      update: {},
      create: {
        id: "cat-beverages",
        name: "Beverages",
        order: 4,
        restaurantId: restaurant.id,
      },
    }),
  ]);
  console.log("✅ Categories created:", categories.length);

  // Create Products
  const products = [
    {
      id: "prod-caesar-salad",
      name: "Caesar Salad",
      description: "Fresh romaine lettuce with Caesar dressing and croutons",
      categoryId: "cat-appetizers",
      prices: { dineIn: 8.99, takeAway: 7.99, delivery: 9.99 },
      stock: 50,
    },
    {
      id: "prod-bruschetta",
      name: "Bruschetta",
      description: "Toasted bread topped with tomatoes, garlic, and basil",
      categoryId: "cat-appetizers",
      prices: { dineIn: 7.99, takeAway: 6.99, delivery: 8.99 },
      stock: 40,
    },
    {
      id: "prod-grilled-salmon",
      name: "Grilled Salmon",
      description: "Fresh salmon fillet with seasonal vegetables",
      categoryId: "cat-main-courses",
      prices: { dineIn: 24.99, takeAway: 22.99, delivery: 26.99 },
      stock: 30,
    },
    {
      id: "prod-pasta-carbonara",
      name: "Pasta Carbonara",
      description: "Classic Italian pasta with bacon, eggs, and parmesan",
      categoryId: "cat-main-courses",
      prices: { dineIn: 16.99, takeAway: 14.99, delivery: 18.99 },
      stock: 45,
    },
    {
      id: "prod-ribeye-steak",
      name: "Ribeye Steak",
      description: "12oz premium ribeye steak with mashed potatoes",
      categoryId: "cat-main-courses",
      prices: { dineIn: 32.99, takeAway: 30.99, delivery: 34.99 },
      stock: 20,
    },
    {
      id: "prod-tiramisu",
      name: "Tiramisu",
      description: "Classic Italian coffee-flavored dessert",
      categoryId: "cat-desserts",
      prices: { dineIn: 7.99, takeAway: 6.99, delivery: 8.99 },
      stock: 35,
    },
    {
      id: "prod-chocolate-lava-cake",
      name: "Chocolate Lava Cake",
      description: "Warm chocolate cake with molten center",
      categoryId: "cat-desserts",
      prices: { dineIn: 8.99, takeAway: 7.99, delivery: 9.99 },
      stock: 25,
    },
    {
      id: "prod-espresso",
      name: "Espresso",
      description: "Strong Italian coffee",
      categoryId: "cat-beverages",
      prices: { dineIn: 3.99, takeAway: 3.49, delivery: 4.49 },
      stock: 100,
    },
    {
      id: "prod-fresh-juice",
      name: "Fresh Orange Juice",
      description: "Freshly squeezed orange juice",
      categoryId: "cat-beverages",
      prices: { dineIn: 4.99, takeAway: 4.49, delivery: 5.49 },
      stock: 60,
    },
  ];

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: { id: productData.id },
      update: {},
      create: {
        id: productData.id,
        name: productData.name,
        description: productData.description,
        categoryId: productData.categoryId,
        restaurantId: restaurant.id,
        isActive: true,
      },
    });

    // Create ProductOnBranch with prices
    await prisma.productOnBranch.upsert({
      where: {
        productId_branchId: {
          productId: product.id,
          branchId: branch.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        branchId: branch.id,
        stock: productData.stock,
        isActive: true,
        prices: {
          create: [
            {
              type: PriceType.DINE_IN,
              price: productData.prices.dineIn,
            },
            {
              type: PriceType.TAKE_AWAY,
              price: productData.prices.takeAway,
            },
            {
              type: PriceType.DELIVERY,
              price: productData.prices.delivery,
            },
          ],
        },
      },
    });
  }
  console.log("✅ Products created:", products.length);

  // Create Tables
  const tables = [
    { number: 1, capacity: 2 },
    { number: 2, capacity: 2 },
    { number: 3, capacity: 4 },
    { number: 4, capacity: 4 },
    { number: 5, capacity: 4 },
    { number: 6, capacity: 6 },
    { number: 7, capacity: 6 },
    { number: 8, capacity: 8 },
  ];

  for (const tableData of tables) {
    await prisma.table.upsert({
      where: {
        id: `table-${branch.id}-${tableData.number}`,
      },
      update: {},
      create: {
        id: `table-${branch.id}-${tableData.number}`,
        number: tableData.number,
        capacity: tableData.capacity,
        branchId: branch.id,
        isActive: true,
      },
    });
  }
  console.log("✅ Tables created:", tables.length);

  // Create Time Slots
  const timeSlots = [
    {
      startTime: "11:00",
      endTime: "11:30",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      pricePerPerson: 0,
      notes: "Weekday lunch service",
    },
    {
      startTime: "12:00",
      endTime: "13:00",
      daysOfWeek: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      pricePerPerson: 0,
      notes: "Peak lunch hour - all days",
    },
    {
      startTime: "19:00",
      endTime: "20:00",
      daysOfWeek: ["friday", "saturday"],
      pricePerPerson: 25,
      notes: "Weekend peak dinner - premium pricing",
    },
    {
      startTime: "18:00",
      endTime: "19:00",
      daysOfWeek: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      pricePerPerson: 0,
      notes: "Early dinner - all days free",
    },
    {
      startTime: "20:00",
      endTime: "21:00",
      daysOfWeek: ["friday", "saturday", "sunday"],
      pricePerPerson: 15,
      notes: "Weekend late dinner",
    },
  ];

  // Use reference date for time-only values
  const referenceDate = new Date("1970-01-01");

  for (const slot of timeSlots) {
    const [startHour, startMin] = slot.startTime.split(":").map(Number);
    const [endHour, endMin] = slot.endTime.split(":").map(Number);

    const startTime = new Date(referenceDate);
    startTime.setHours(startHour, startMin);

    const endTime = new Date(referenceDate);
    endTime.setHours(endHour, endMin);

    await prisma.timeSlot.upsert({
      where: {
        id: `slot-${branch.id}-${slot.startTime}`,
      },
      update: {},
      create: {
        id: `slot-${branch.id}-${slot.startTime}`,
        startTime,
        endTime,
        daysOfWeek: slot.daysOfWeek,
        pricePerPerson: slot.pricePerPerson,
        notes: slot.notes,
        isActive: true,
        branchId: branch.id,
      },
    });
  }
  console.log("✅ Time slots created:", timeSlots.length);

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n📝 Login Credentials:");
  console.log("-----------------------------------");
  console.log("Admin User:");
  console.log("  Email: admin@restaurant.com");
  console.log("  Password: Admin@123");
  console.log("\nManager User:");
  console.log("  Email: manager@restaurant.com");
  console.log("  Password: Manager@123");
  console.log("-----------------------------------\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
