export type HelpContent = {
  title?: string;
  content: string;
  example?: string;
};

export const productHelp = {
  category: {
    content: "Sirve para organizar tus productos por tipo.",
    example: "Ej: Mascotas, Belleza, Ropa, Alimentos.",
    title: "Categoría",
  },
  cost: {
    content: "Es lo que te cuesta adquirir el producto antes de venderlo.",
    example: "Si compras a $8.000 y vendes a $15.000, el costo es $8.000.",
    title: "Costo",
  },
  currentStock: {
    content: "Es la cantidad que tienes disponible actualmente.",
    example: "20 unidades, 22 kg, 5 litros.",
    title: "Existencia actual",
  },
  inventoryModeMeasured: {
    content: "Úsalo cuando vendes una cantidad variable.",
    example: "500 g de alimento, 1 litro de aceite, 2 metros de tela.",
    title: "Por peso, volumen o longitud",
  },
  inventoryModeUnit: {
    content: "Úsalo cuando vendes piezas completas.",
    example: "1 botella, 1 camiseta, 1 labial.",
    title: "Por unidad",
  },
  minimumStock: {
    content: "Es la cantidad desde la que quieres revisar o reponer este producto.",
    example: "Si configuras 3 kg, sabrás que debes reponer cuando queden 3 kg o menos.",
    title: "Stock mínimo o alerta",
  },
  name: {
    content: "Es el nombre con el que reconocerás este producto en tu catálogo.",
    example: "Dogourmet adulto, Labial matte, Camiseta básica.",
    title: "Nombre del producto",
  },
  purchasePackageLabel: {
    content: "Es cómo compras el producto a tu proveedor.",
    example: "Bulto, caja, saco, garrafa, rollo.",
    title: "Presentación de compra",
  },
  purchasePackageQuantity: {
    content: "Es cuánto trae la presentación que compras.",
    example: "Un bulto trae 22 kg.",
    title: "Cantidad contenida",
  },
  salePrice: {
    content: "Es el precio que cobrará tu negocio al cliente.",
    example: "Ej: $15.000 por unidad o $10.000 por kg.",
    title: "Precio de venta",
  },
  saleUnit: {
    content: "Es la unidad en la que normalmente vendes al cliente.",
    example: "kg, gramos, litros, unidades.",
    title: "Unidad de venta",
  },
  sellingMode: {
    content: "Define si el producto se vende como pieza, por medida o con variantes.",
    example: "Un cuaderno se vende por unidad; comida a granel por kg; una camiseta puede tener tallas.",
    title: "¿Cómo vendes este producto?",
  },
  sku: {
    content: "Es un código interno opcional para identificar productos.",
    example: "DOG-ADULTO-22KG.",
    title: "SKU",
  },
  variants: {
    content: "Actívalo cuando el mismo producto tenga tallas, colores, tonos, sabores o presentaciones.",
    example: "Talla M, color negro, tono nude, sabor pollo.",
    title: "Este producto tiene variantes",
  },
} satisfies Record<string, HelpContent>;

export const comboHelp = {
  addProduct: {
    content: "Agrega un producto de tu catálogo para que haga parte del combo.",
    example: "Ej: 1 kg de alimento + 1 snack.",
    title: "Agregar producto al combo",
  },
  baseCost: {
    content: "Es la suma del costo de todos los productos incluidos.",
    example: "Si incluye dos productos de $5.000, el costo base es $10.000.",
    title: "Costo del combo",
  },
  margin: {
    content: "Es el porcentaje aproximado que queda como ganancia después de cubrir costos.",
    example: "Un margen de 35% significa que una parte saludable de la venta queda como utilidad.",
    title: "Margen",
  },
  name: {
    content: "Es el nombre del paquete que venderás.",
    example: "Kit cachorro, Combo ahorro, Pack glow.",
    title: "Nombre del combo",
  },
  products: {
    content: "Son los productos de tu catálogo que componen este combo.",
    example: "1 kg de alimento + 1 snack + 1 shampoo.",
    title: "Productos incluidos",
  },
  quantity: {
    content: "Define cuánto de cada producto se incluye en el combo.",
    example: "2 unidades, 500 g, 1 litro.",
    title: "Cantidad",
  },
  salePrice: {
    content: "Es el precio que cobrarás por el combo completo.",
    example: "Kit cachorro por $89.900.",
    title: "Precio de venta del combo",
  },
  stockPossible: {
    content: "Indica cuántos combos podrías vender con el inventario actual.",
    example: "Si tienes 10 snacks y el combo usa 2, puedes vender 5 combos.",
    title: "Stock posible",
  },
  suggestedPrice: {
    content: "Margenia calcula un precio recomendado según costos y margen deseado.",
    example: "Úsalo como referencia antes de definir el precio final.",
    title: "Precio sugerido",
  },
} satisfies Record<string, HelpContent>;

export const salesHelp = {
  addToCart: {
    content: "Agrega el producto o combo vendido al carrito.",
    example: "Venta de 2 productos o 1 combo.",
    title: "Agregar al carrito",
  },
  customer: {
    content: "Es opcional cuando la venta está pagada, pero necesario si queda pendiente.",
    example: "Natalia Gómez.",
    title: "Cliente",
  },
  discount: {
    content: "Es el valor que restas al precio de venta.",
    example: "Si el total era $50.000 y descuentas $5.000, cobrarás $45.000.",
    title: "Descuento",
  },
  newSale: {
    content: "Registra una venta para actualizar ingresos, utilidad e inventario.",
    example: "Venta de 2 productos o 1 combo.",
    title: "Nueva venta",
  },
  paymentMethod: {
    content: "Indica cómo recibiste el dinero.",
    example: "Efectivo, transferencia, tarjeta, Nequi.",
    title: "Método de pago",
  },
  paymentStatus: {
    content: "Indica si la venta ya fue pagada, quedó parcial o pendiente.",
    example: "Pagada, parcial o pendiente por cobrar.",
    title: "Estado de pago",
  },
  pendingSale: {
    content: "Se usa cuando el cliente aún debe dinero.",
    example: "Cliente pagó $20.000 de una venta de $50.000.",
    title: "Venta pendiente",
  },
  quantity: {
    content: "Es cuánto vendiste de ese producto.",
    example: "2 unidades, 750 g, 1.5 kg.",
    title: "Cantidad",
  },
  searchItem: {
    content: "Busca lo que vendiste para agregarlo al carrito.",
    example: "Dogourmet, Kit cachorro, Labial nude.",
    title: "Buscar producto o combo",
  },
  unit: {
    content: "Es la medida usada para vender el producto.",
    example: "kg, gramos, litros, unidades.",
    title: "Unidad",
  },
  unitPrice: {
    content: "Es el precio cobrado por cada unidad o medida.",
    example: "$10.000 por kg o $25.000 por unidad.",
    title: "Precio unitario",
  },
  voidSale: {
    content: "Cancela una venta registrada y restaura el inventario descontado.",
    example: "Úsalo si registraste una venta por error.",
    title: "Anular venta",
  },
} satisfies Record<string, HelpContent>;

export const inventoryHelp = {
  count: {
    content: "Compara lo que tienes físicamente con lo que aparece en Margenia.",
    example: "El sistema dice 20, pero al contar encuentras 18.",
    title: "Conteo físico",
  },
  currentStock: {
    content: "Cantidad disponible actualmente según ventas, entradas y ajustes.",
    example: "22 kg, 10 unidades, 5 litros.",
    title: "Stock actual",
  },
  lastMovement: {
    content: "Último cambio registrado en el inventario.",
    example: "Venta, entrada, ajuste o conteo.",
    title: "Último movimiento",
  },
  location: {
    content: "Lugar interno donde guardas físicamente el producto.",
    example: "Bodega principal, Estante 2, Vitrina, Nevera.",
    title: "Ubicación en inventario",
  },
  lowStockAlert: {
    content: "Cantidad desde la que quieres que Margenia marque el producto como Stock bajo.",
    example: "Si configuras 3 kg, se alertará cuando queden 3 kg o menos.",
    title: "Alerta de stock bajo desde",
  },
  movement: {
    content: "Registra entradas, salidas, devoluciones, ajustes o pérdidas.",
    example: "Entraron 10 unidades o se dañaron 2.",
    title: "Registrar movimiento",
  },
  reason: {
    content: "Explica por qué hiciste el movimiento.",
    example: "Producto dañado, ajuste por conteo, compra nueva.",
    title: "Motivo",
  },
  value: {
    content: "Estimación del valor del inventario usando stock actual y costo.",
    example: "22 kg x costo por kg.",
    title: "Valor estimado",
  },
} satisfies Record<string, HelpContent>;

export const dashboardHelp = {
  inventory: {
    content: "Valor o estado actual de tus existencias.",
    example: "Productos disponibles, agotados o con stock bajo.",
    title: "Inventario",
  },
  pending: {
    content: "Dinero pendiente de pago por parte de clientes.",
    example: "Ventas parciales o pendientes.",
    title: "Por cobrar",
  },
  performance: {
    content: "Muestra la evolución de ventas y utilidad cuando tengas registros.",
    example: "Ventas por día, semana o mes.",
    title: "Rendimiento del negocio",
  },
  profit: {
    content: "Ganancia aproximada después de restar costos de productos.",
    example: "Venta menos costo del producto.",
    title: "Utilidad estimada",
  },
  sales: {
    content: "Total vendido en el periodo seleccionado.",
    example: "Suma de ventas completadas.",
    title: "Ventas",
  },
} satisfies Record<string, HelpContent>;
