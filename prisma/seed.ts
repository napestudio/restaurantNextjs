import { PrismaClient, UserRole, PriceType, UnitType, WeightUnit, VolumeUnit } from "../app/generated/prisma";
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
      name: "Kiku Sushi",
      slug: "kiku-sushi",
      description: "Auténtica cocina japonesa con los mejores ingredientes frescos",
      phone: "+54 11 1234-5678",
      logoUrl: "/logo.png",
      isActive: true,
    },
  });
  console.log("✅ Restaurante creado:", restaurant.name);

  // Create Branch
  const branch = await prisma.branch.upsert({
    where: { id: "seed-branch-1" },
    update: {},
    create: {
      id: "seed-branch-1",
      name: "Sucursal Principal",
      slug: "sucursal-principal",
      address: "Av. Corrientes 1234, Buenos Aires",
      restaurantId: restaurant.id,
    },
  });
  console.log("✅ Sucursal creada:", branch.name);

  // Create Admin User
  const hashedPassword = await bcrypt.hash("Admin@123", 10);
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@kikusushi.com",
      name: "Administrador",
      password: hashedPassword,
      userOnBranches: {
        create: {
          branchId: branch.id,
          role: UserRole.ADMIN,
        },
      },
    },
  });
  console.log("✅ Usuario administrador creado:", adminUser.username);

  // Create Manager User
  const managerPassword = await bcrypt.hash("Manager@123", 10);
  const managerUser = await prisma.user.upsert({
    where: { username: "gerente" },
    update: {},
    create: {
      username: "gerente",
      email: "gerente@kikusushi.com",
      name: "Gerente",
      password: managerPassword,
      userOnBranches: {
        create: {
          branchId: branch.id,
          role: UserRole.MANAGER,
        },
      },
    },
  });
  console.log("✅ Usuario gerente creado:", managerUser.username);

  // Create Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: "cat-appetizers" },
      update: {},
      create: {
        id: "cat-appetizers",
        name: "Entradas",
        order: 1,
        restaurantId: restaurant.id,
      },
    }),
    prisma.category.upsert({
      where: { id: "cat-main-courses" },
      update: {},
      create: {
        id: "cat-main-courses",
        name: "Platos Principales",
        order: 2,
        restaurantId: restaurant.id,
      },
    }),
    prisma.category.upsert({
      where: { id: "cat-desserts" },
      update: {},
      create: {
        id: "cat-desserts",
        name: "Postres",
        order: 3,
        restaurantId: restaurant.id,
      },
    }),
    prisma.category.upsert({
      where: { id: "cat-beverages" },
      update: {},
      create: {
        id: "cat-beverages",
        name: "Bebidas",
        order: 4,
        restaurantId: restaurant.id,
      },
    }),
  ]);
  console.log("✅ Categorías creadas:", categories.length);

  // Create Products
  const products = [
    {
      id: "prod-edamame",
      name: "Edamame",
      description: "Porotos de soja al vapor con sal marina",
      sku: "EDM-001",
      categoryId: "cat-appetizers",
      unitType: "WEIGHT" as UnitType,
      weightUnit: "KILOGRAM" as WeightUnit,
      prices: { dineIn: 650, takeAway: 600, delivery: 700 },
      stock: 5.5,
      minStock: 2,
      maxStock: 10,
      minStockAlert: 2.5,
      trackStock: true,
    },
    {
      id: "prod-gyoza",
      name: "Gyoza",
      description: "Empanaditas japonesas rellenas de cerdo y vegetales",
      sku: "GYZ-001",
      categoryId: "cat-appetizers",
      unitType: "UNIT" as UnitType,
      prices: { dineIn: 850, takeAway: 800, delivery: 900 },
      stock: 40,
      minStock: 20,
      maxStock: 100,
      minStockAlert: 25,
      trackStock: true,
    },
    {
      id: "prod-california-roll",
      name: "California Roll",
      description: "Roll de cangrejo, palta y pepino (8 piezas)",
      sku: "CAL-001",
      categoryId: "cat-main-courses",
      unitType: "UNIT" as UnitType,
      prices: { dineIn: 1200, takeAway: 1100, delivery: 1300 },
      stock: 30,
      minStock: 15,
      maxStock: 60,
      minStockAlert: 20,
      trackStock: true,
    },
    {
      id: "prod-salmon-nigiri",
      name: "Nigiri de Salmón",
      description: "Salmón fresco sobre arroz (5 piezas)",
      sku: "SAL-NIG-001",
      categoryId: "cat-main-courses",
      unitType: "UNIT" as UnitType,
      prices: { dineIn: 1800, takeAway: 1700, delivery: 1900 },
      stock: 45,
      minStock: 20,
      maxStock: 80,
      minStockAlert: 25,
      trackStock: true,
    },
    {
      id: "prod-dragon-roll",
      name: "Dragon Roll",
      description: "Roll premium con langostino tempura, palta y salsa de anguila (10 piezas)",
      sku: "DRG-001",
      categoryId: "cat-main-courses",
      unitType: "UNIT" as UnitType,
      prices: { dineIn: 2500, takeAway: 2400, delivery: 2600 },
      stock: 20,
      minStock: 10,
      maxStock: 40,
      minStockAlert: 12,
      trackStock: true,
    },
    {
      id: "prod-mochi",
      name: "Mochi",
      description: "Postre japonés de arroz dulce relleno de helado (3 piezas)",
      sku: "MCH-001",
      categoryId: "cat-desserts",
      unitType: "UNIT" as UnitType,
      prices: { dineIn: 900, takeAway: 850, delivery: 950 },
      stock: 35,
      minStock: 15,
      maxStock: 70,
      minStockAlert: 20,
      trackStock: true,
    },
    {
      id: "prod-dorayaki",
      name: "Dorayaki",
      description: "Panqueques japoneses rellenos con pasta de judías dulces",
      sku: "DRY-001",
      categoryId: "cat-desserts",
      unitType: "UNIT" as UnitType,
      prices: { dineIn: 750, takeAway: 700, delivery: 800 },
      stock: 25,
      minStock: 10,
      maxStock: 50,
      minStockAlert: 15,
      trackStock: true,
    },
    {
      id: "prod-te-verde",
      name: "Té Verde",
      description: "Té verde japonés tradicional",
      sku: "TEV-001",
      categoryId: "cat-beverages",
      unitType: "VOLUME" as UnitType,
      volumeUnit: "LITER" as VolumeUnit,
      prices: { dineIn: 400, takeAway: 350, delivery: 450 },
      stock: 15.5,
      minStock: 5,
      maxStock: 30,
      minStockAlert: 7.5,
      trackStock: false, // Always available - no stock tracking
    },
    {
      id: "prod-ramune",
      name: "Ramune",
      description: "Bebida gaseosa japonesa con sabor a frutas",
      sku: "RAM-001",
      categoryId: "cat-beverages",
      unitType: "UNIT" as UnitType,
      prices: { dineIn: 500, takeAway: 450, delivery: 550 },
      stock: 60,
      minStock: 30,
      maxStock: 120,
      minStockAlert: 40,
      trackStock: false, // Always available - no stock tracking
    },
    {
      id: "prod-arroz-sushi",
      name: "Arroz para Sushi",
      description: "Arroz japonés premium para preparación de sushi",
      sku: "ARZ-001",
      categoryId: "cat-appetizers",
      unitType: "WEIGHT" as UnitType,
      weightUnit: "KILOGRAM" as WeightUnit,
      prices: { dineIn: 0, takeAway: 0, delivery: 0 },
      stock: 25,
      minStock: 10,
      maxStock: 50,
      minStockAlert: 15,
      trackStock: true,
    },
    {
      id: "prod-sake",
      name: "Sake Premium",
      description: "Sake japonés tradicional de alta calidad",
      sku: "SAK-001",
      categoryId: "cat-beverages",
      unitType: "VOLUME" as UnitType,
      volumeUnit: "LITER" as VolumeUnit,
      prices: { dineIn: 3500, takeAway: 3200, delivery: 3700 },
      stock: 8.5,
      minStock: 3,
      maxStock: 15,
      minStockAlert: 5,
      trackStock: true,
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
        sku: productData.sku,
        categoryId: productData.categoryId,
        restaurantId: restaurant.id,
        unitType: productData.unitType,
        weightUnit: productData.weightUnit || null,
        volumeUnit: productData.volumeUnit || null,
        minStockAlert: productData.minStockAlert,
        trackStock: productData.trackStock,
        isActive: true,
      },
    });

    // Create ProductOnBranch with prices
    const productOnBranch = await prisma.productOnBranch.upsert({
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
        minStock: productData.minStock,
        maxStock: productData.maxStock,
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

    // Create initial stock movement for record keeping
    if (productData.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productOnBranchId: productOnBranch.id,
          quantity: productData.stock,
          previousStock: 0,
          newStock: productData.stock,
          reason: "Stock inicial",
          notes: "Carga inicial de inventario durante seed",
          createdBy: adminUser.id,
        },
      });
    }
  }
  console.log("✅ Productos creados:", products.length);

  // Create Sectors
  const salonPrincipal = await prisma.sector.upsert({
    where: { id: "sector-salon-principal" },
    update: {},
    create: {
      id: "sector-salon-principal",
      name: "Salón Principal",
      color: "#3b82f6", // blue
      order: 1,
      width: 1400,
      height: 800,
      branchId: branch.id,
      isActive: true,
    },
  });

  const patio = await prisma.sector.upsert({
    where: { id: "sector-patio" },
    update: {},
    create: {
      id: "sector-patio",
      name: "Patio",
      color: "#10b981", // green
      order: 2,
      width: 1200,
      height: 900,
      branchId: branch.id,
      isActive: true,
    },
  });

  const bar = await prisma.sector.upsert({
    where: { id: "sector-bar" },
    update: {},
    create: {
      id: "sector-bar",
      name: "Área de Bar",
      color: "#f59e0b", // amber
      order: 3,
      width: 1000,
      height: 600,
      branchId: branch.id,
      isActive: true,
    },
  });

  console.log("✅ Sectores creados: 3");

  // Create Tables
  const tables = [
    { number: 1, capacity: 2, sectorId: salonPrincipal.id },
    { number: 2, capacity: 2, sectorId: salonPrincipal.id },
    { number: 3, capacity: 4, sectorId: salonPrincipal.id },
    { number: 4, capacity: 4, sectorId: patio.id },
    { number: 5, capacity: 4, sectorId: patio.id },
    { number: 6, capacity: 6, sectorId: patio.id },
    { number: 7, capacity: 6, sectorId: bar.id },
    { number: 8, capacity: 8, sectorId: bar.id },
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
        sectorId: tableData.sectorId,
        isActive: true,
      },
    });
  }
  console.log("✅ Mesas creadas:", tables.length);

  // Create Time Slots
  const timeSlots = [
    {
      id: `slot-${branch.id}-11:00`,
      name: "Almuerzo Entre Semana",
      startTime: "11:00",
      endTime: "11:30",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      pricePerPerson: 0,
      notes: "Servicio de almuerzo entre semana",
      moreInfoUrl: null,
      // Link tables 1-4 (smaller tables for lunch)
      tableNumbers: [1, 2, 3, 4],
    },
    {
      id: `slot-${branch.id}-12:00`,
      name: "Almuerzo Pico",
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
      notes: "Hora pico del almuerzo - todos los días",
      moreInfoUrl: null,
      // All tables available for peak lunch
      tableNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
    },
    {
      id: `slot-${branch.id}-19:00`,
      name: "Cena Premium Fin de Semana",
      startTime: "19:00",
      endTime: "20:00",
      daysOfWeek: ["friday", "saturday"],
      pricePerPerson: 2500,
      notes: "Cena especial fin de semana - precio premium",
      moreInfoUrl: "https://kikusushi.com/experiencia-premium",
      // Larger tables for premium dining
      tableNumbers: [5, 6, 7, 8],
    },
    {
      id: `slot-${branch.id}-18:00`,
      name: "Cena Temprana",
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
      notes: "Cena temprana - todos los días gratis",
      moreInfoUrl: null,
      // All tables available
      tableNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
    },
    {
      id: `slot-${branch.id}-20:00`,
      name: "Cena Nocturna",
      startTime: "20:00",
      endTime: "21:00",
      daysOfWeek: ["friday", "saturday", "sunday"],
      pricePerPerson: 1500,
      notes: "Cena fin de semana tardía",
      moreInfoUrl: null,
      // Medium to large tables for late dinner
      tableNumbers: [3, 4, 5, 6, 7, 8],
    },
  ];

  // Use reference date for time-only values
  const referenceDate = new Date("1970-01-01");

  // Get all tables with their capacities for capacity calculation
  const allTablesWithCapacity = await prisma.table.findMany({
    where: { branchId: branch.id },
    select: { id: true, number: true, capacity: true },
  });

  for (const slot of timeSlots) {
    const [startHour, startMin] = slot.startTime.split(":").map(Number);
    const [endHour, endMin] = slot.endTime.split(":").map(Number);

    const startTime = new Date(referenceDate);
    startTime.setHours(startHour, startMin);

    const endTime = new Date(referenceDate);
    endTime.setHours(endHour, endMin);

    // Get table IDs for this slot
    const slotTables = allTablesWithCapacity.filter((t) =>
      slot.tableNumbers.includes(t.number)
    );
    const tableIds = slotTables.map((t) => t.id);

    // Calculate total capacity for this slot (sum of all assigned table capacities)
    const totalCapacity = slotTables.reduce((sum, t) => sum + t.capacity, 0);

    await prisma.timeSlot.upsert({
      where: {
        id: slot.id,
      },
      update: {},
      create: {
        id: slot.id,
        name: slot.name,
        startTime,
        endTime,
        daysOfWeek: slot.daysOfWeek,
        pricePerPerson: slot.pricePerPerson,
        capacity: totalCapacity, // Set the calculated capacity
        notes: slot.notes,
        moreInfoUrl: slot.moreInfoUrl,
        isActive: true,
        branchId: branch.id,
        tables: {
          create: tableIds.map((tableId) => ({
            tableId,
          })),
        },
      },
    });

    console.log(
      `  ✓ Turno "${slot.name}": ${slotTables.length} mesas, capacidad total: ${totalCapacity}`
    );
  }
  console.log("✅ Turnos creados:", timeSlots.length);

  // Create Sample Reservations with exactTime
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const allTimeSlots = await prisma.timeSlot.findMany({
    where: { branchId: branch.id },
  });

  // Sample reservation for tomorrow lunch
  const lunchSlot = allTimeSlots.find((s) => s.name === "Almuerzo Pico");
  if (lunchSlot) {
    const exactArrival = new Date(tomorrow);
    exactArrival.setHours(12, 15, 0, 0); // 12:15 PM

    await prisma.reservation.create({
      data: {
        branchId: branch.id,
        customerName: "María González",
        customerEmail: "maria.gonzalez@example.com",
        customerPhone: "+54 11 9876-5432",
        date: tomorrow,
        people: 4,
        timeSlotId: lunchSlot.id,
        exactTime: exactArrival,
        status: "PENDING",
        notes: "Mesa cerca de la ventana, por favor",
        createdBy: "SEED",
      },
    });
  }

  // Sample reservation for dinner
  const dinnerSlot = allTimeSlots.find((s) => s.name === "Cena Temprana");
  if (dinnerSlot) {
    const exactArrival = new Date(tomorrow);
    exactArrival.setHours(18, 30, 0, 0); // 6:30 PM

    await prisma.reservation.create({
      data: {
        branchId: branch.id,
        customerName: "Juan Pérez",
        customerEmail: "juan.perez@example.com",
        customerPhone: "+54 11 5555-1234",
        date: tomorrow,
        people: 2,
        timeSlotId: dinnerSlot.id,
        exactTime: exactArrival,
        status: "CONFIRMED",
        dietaryRestrictions: "Sin gluten",
        createdBy: "SEED",
      },
    });
  }

  console.log("✅ Reservas de ejemplo creadas: 2");

  // Create Menus
  console.log("\n📋 Creando menús...");

  // Main Menu (Branch-specific, all day)
  const mainMenu = await prisma.menu.upsert({
    where: { id: "menu-main" },
    update: {},
    create: {
      id: "menu-main",
      name: "Menú Principal",
      slug: "menu-principal",
      description: "Nuestra carta completa con todos nuestros platos disponibles",
      restaurantId: restaurant.id,
      branchId: branch.id, // Menus are branch-specific
      isActive: true,
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    },
  });
  console.log("  ✓ Menú Principal creado");

  // Lunch Menu (weekdays only)
  const lunchMenu = await prisma.menu.upsert({
    where: { id: "menu-lunch" },
    update: {},
    create: {
      id: "menu-lunch",
      name: "Menú Ejecutivo",
      slug: "menu-ejecutivo",
      description: "Opciones especiales para el almuerzo de lunes a viernes",
      restaurantId: restaurant.id,
      branchId: branch.id, // Menus are branch-specific
      isActive: true,
      availableFrom: new Date("1970-01-01T11:00:00"),
      availableUntil: new Date("1970-01-01T15:00:00"),
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
  });
  console.log("  ✓ Menú Ejecutivo creado");

  // Weekend Special Menu
  const weekendMenu = await prisma.menu.upsert({
    where: { id: "menu-weekend" },
    update: {},
    create: {
      id: "menu-weekend",
      name: "Especiales de Fin de Semana",
      slug: "especiales-weekend",
      description: "Platos premium exclusivos para sábados y domingos",
      restaurantId: restaurant.id,
      branchId: branch.id, // Menus are branch-specific
      isActive: true,
      daysOfWeek: ["saturday", "sunday"],
    },
  });
  console.log("  ✓ Especiales de Fin de Semana creado");

  console.log("✅ Menús creados: 3");

  // Create Menu Sections and Items for Main Menu
  console.log("\n📑 Creando secciones y productos del Menú Principal...");

  const mainAppetizers = await prisma.menuSection.create({
    data: {
      id: "section-main-appetizers",
      menuId: mainMenu.id,
      name: "Entradas",
      description: "Comienza tu experiencia con nuestras deliciosas entradas",
      order: 1,
    },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        menuSectionId: mainAppetizers.id,
        productId: "prod-edamame",
        order: 1,
        isAvailable: true,
        isFeatured: false,
      },
      {
        menuSectionId: mainAppetizers.id,
        productId: "prod-gyoza",
        order: 2,
        isAvailable: true,
        isFeatured: true, // Featured item
      },
    ],
  });

  const mainCourses = await prisma.menuSection.create({
    data: {
      id: "section-main-courses",
      menuId: mainMenu.id,
      name: "Platos Principales",
      description: "Nuestras especialidades de sushi y rolls",
      order: 2,
    },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        menuSectionId: mainCourses.id,
        productId: "prod-california-roll",
        order: 1,
        isAvailable: true,
        isFeatured: false,
      },
      {
        menuSectionId: mainCourses.id,
        productId: "prod-salmon-nigiri",
        order: 2,
        isAvailable: true,
        isFeatured: true, // Featured
      },
      {
        menuSectionId: mainCourses.id,
        productId: "prod-dragon-roll",
        order: 3,
        isAvailable: true,
        isFeatured: true, // Premium featured item
      },
    ],
  });

  const mainDesserts = await prisma.menuSection.create({
    data: {
      id: "section-main-desserts",
      menuId: mainMenu.id,
      name: "Postres",
      description: "Dulces tradicionales japoneses",
      order: 3,
    },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        menuSectionId: mainDesserts.id,
        productId: "prod-mochi",
        order: 1,
        isAvailable: true,
        isFeatured: true,
      },
      {
        menuSectionId: mainDesserts.id,
        productId: "prod-dorayaki",
        order: 2,
        isAvailable: true,
        isFeatured: false,
      },
    ],
  });

  const mainBeverages = await prisma.menuSection.create({
    data: {
      id: "section-main-beverages",
      menuId: mainMenu.id,
      name: "Bebidas",
      description: "Bebidas tradicionales y refrescantes",
      order: 4,
    },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        menuSectionId: mainBeverages.id,
        productId: "prod-te-verde",
        order: 1,
        isAvailable: true,
        isFeatured: false,
      },
      {
        menuSectionId: mainBeverages.id,
        productId: "prod-ramune",
        order: 2,
        isAvailable: true,
        isFeatured: false,
      },
      {
        menuSectionId: mainBeverages.id,
        productId: "prod-sake",
        order: 3,
        isAvailable: true,
        isFeatured: true, // Premium beverage
      },
    ],
  });

  console.log("✅ Secciones del Menú Principal: 4");
  console.log("✅ Items del Menú Principal: 10");

  // Create Menu Sections and Items for Lunch Menu (Executive)
  console.log("\n📑 Creando secciones del Menú Ejecutivo...");

  const lunchQuick = await prisma.menuSection.create({
    data: {
      id: "section-lunch-quick",
      menuId: lunchMenu.id,
      name: "Opciones Rápidas",
      description: "Perfectas para tu pausa del almuerzo",
      order: 1,
    },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        menuSectionId: lunchQuick.id,
        productId: "prod-california-roll",
        order: 1,
        isAvailable: true,
        isFeatured: false,
        customPrice: 1000, // Special lunch pricing
      },
      {
        menuSectionId: lunchQuick.id,
        productId: "prod-salmon-nigiri",
        order: 2,
        isAvailable: true,
        isFeatured: true,
        customPrice: 1500, // Special lunch pricing
      },
      {
        menuSectionId: lunchQuick.id,
        productId: "prod-gyoza",
        order: 3,
        isAvailable: true,
        isFeatured: false,
        customPrice: 700, // Special lunch pricing
      },
    ],
  });

  console.log("✅ Secciones del Menú Ejecutivo: 1");
  console.log("✅ Items del Menú Ejecutivo: 3");

  // Create Menu Sections for Weekend Special
  console.log("\n📑 Creando secciones de Especiales de Fin de Semana...");

  const weekendSpecials = await prisma.menuSection.create({
    data: {
      id: "section-weekend-specials",
      menuId: weekendMenu.id,
      name: "Especiales del Chef",
      description: "Creaciones exclusivas disponibles solo en fin de semana",
      order: 1,
    },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        menuSectionId: weekendSpecials.id,
        productId: "prod-dragon-roll",
        order: 1,
        isAvailable: true,
        isFeatured: true,
      },
      {
        menuSectionId: weekendSpecials.id,
        productId: "prod-salmon-nigiri",
        order: 2,
        isAvailable: true,
        isFeatured: true,
      },
      {
        menuSectionId: weekendSpecials.id,
        productId: "prod-sake",
        order: 3,
        isAvailable: true,
        isFeatured: true,
      },
    ],
  });

  console.log("✅ Secciones de Especiales Weekend: 1");
  console.log("✅ Items de Especiales Weekend: 3");

  console.log("\n🎉 ¡Base de datos poblada exitosamente!");
  console.log("\n📝 Credenciales de Acceso:");
  console.log("-----------------------------------");
  console.log("Usuario Administrador:");
  console.log("  Username: admin");
  console.log("  Email: admin@kikusushi.com");
  console.log("  Password: Admin@123");
  console.log("\nUsuario Gerente:");
  console.log("  Username: gerente");
  console.log("  Email: gerente@kikusushi.com");
  console.log("  Password: Manager@123");
  console.log("-----------------------------------");
  console.log("\n📋 Menús Creados:");
  console.log("  • Menú Principal (todos los días)");
  console.log("  • Menú Ejecutivo (lunes-viernes, 11:00-15:00)");
  console.log("  • Especiales de Fin de Semana (sábado-domingo)");
  console.log("-----------------------------------\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error durante el poblado de la base de datos:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
