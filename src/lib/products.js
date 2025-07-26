// Datos de muestra para productos
export const sampleProducts = [
  {
    id: 1,
    name: "Burger Dreams",
    description: "Una deliciosa hamburguesa con carne jugosa y verduras frescas",
    price: 12.99,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&crop=center",
    category: "burgers",
    brand: "Gourmet Burgers",
    createdAt: "2024-01-15"
  },
  {
    id: 2,
    name: "Burger Waldo",
    description: "Hamburguesa especial con ingredientes premium",
    price: 15.50,
    image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=300&fit=crop&crop=center",
    category: "burgers",
    brand: "Premium Eats",
    createdAt: "2024-01-20"
  },
  {
    id: 3,
    name: "Classic Burger",
    description: "La hamburguesa clásica que nunca pasa de moda",
    price: 9.99,
    image: "https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400&h=300&fit=crop&crop=center",
    category: "burgers",
    brand: "Classic Food",
    createdAt: "2024-01-10"
  },
  {
    id: 4,
    name: "BBQ Burger",
    description: "Hamburguesa con salsa BBQ y cebolla caramelizada",
    price: 13.75,
    image: "https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400&h=300&fit=crop&crop=center",
    category: "burgers",
    brand: "Gourmet Burgers",
    createdAt: "2024-01-25"
  },
  {
    id: 5,
    name: "Veggie Burger",
    description: "Hamburguesa vegetariana llena de sabor",
    price: 11.25,
    image: "https://images.unsplash.com/photo-1525059696034-4967a729002e?w=400&h=300&fit=crop&crop=center",
    category: "burgers",
    brand: "Green Bites",
    createdAt: "2024-01-18"
  },
  {
    id: 6,
    name: "Double Burger",
    description: "Doble carne para los más hambrientos",
    price: 18.99,
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop&crop=center",
    category: "burgers",
    brand: "Premium Eats",
    createdAt: "2024-01-30"
  },
  {
    id: 7,
    name: "Red Velvet Polish",
    description: "Esmalte de uñas color rojo intenso",
    price: 8.99,
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop&crop=center",
    category: "beauty",
    brand: "Glamour Nails",
    createdAt: "2024-01-12"
  },
  {
    id: 8,
    name: "Ocean Blue Polish",
    description: "Esmalte azul como el océano",
    price: 9.50,
    image: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400&h=300&fit=crop&crop=center",
    category: "beauty",
    brand: "Sea Beauty",
    createdAt: "2024-01-22"
  },
  {
    id: 9,
    name: "Golden Shine Polish",
    description: "Esmalte dorado con brillo espectacular",
    price: 12.99,
    image: "https://images.unsplash.com/photo-1582747652673-603191058c91?w=400&h=300&fit=crop&crop=center",
    category: "beauty",
    brand: "Luxury Cosmetics",
    createdAt: "2024-01-14"
  },
  {
    id: 10,
    name: "Pink Dream Polish",
    description: "Esmalte rosa suave y elegante",
    price: 7.75,
    image: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400&h=300&fit=crop&crop=center",
    category: "beauty",
    brand: "Sweet Colors",
    createdAt: "2024-01-28"
  },
  {
    id: 11,
    name: "Black Pearl Polish",
    description: "Esmalte negro con efecto perla",
    price: 11.50,
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center",
    category: "beauty",
    brand: "Glamour Nails",
    createdAt: "2024-01-16"
  },
  {
    id: 12,
    name: "Rainbow Polish Set",
    description: "Set de esmaltes con todos los colores del arcoíris",
    price: 25.99,
    image: "https://images.unsplash.com/photo-1515688594390-b649af70d282?w=400&h=300&fit=crop&crop=center",
    category: "beauty",
    brand: "Rainbow Beauty",
    createdAt: "2024-01-08"
  }
];

// Función para obtener productos con filtros y paginación
export function getProducts(filters = {}) {
  const {
    category = '',
    brand = '',
    minPrice = '',
    maxPrice = '',
    sortBy = 'newest',
    page = 1,
    limit = 8
  } = filters;

  let filteredProducts = [...sampleProducts];

  // Filtro por categoría
  if (category) {
    filteredProducts = filteredProducts.filter(product => 
      product.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Filtro por marca
  if (brand) {
    filteredProducts = filteredProducts.filter(product => 
      product.brand.toLowerCase().includes(brand.toLowerCase())
    );
  }

  // Filtro por rango de precios
  if (minPrice) {
    filteredProducts = filteredProducts.filter(product => 
      product.price >= parseFloat(minPrice)
    );
  }

  if (maxPrice) {
    filteredProducts = filteredProducts.filter(product => 
      product.price <= parseFloat(maxPrice)
    );
  }

  // Ordenamiento
  switch (sortBy) {
    case 'newest':
      filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest':
      filteredProducts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'price-low':
      filteredProducts.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      filteredProducts.sort((a, b) => b.price - a.price);
      break;
    default:
      filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Paginación
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  return {
    products: paginatedProducts,
    total: filteredProducts.length,
    totalPages: Math.ceil(filteredProducts.length / limit),
    currentPage: page,
    hasNextPage: endIndex < filteredProducts.length,
    hasPrevPage: page > 1
  };
}

// Obtener todas las categorías únicas
export function getCategories() {
  const categories = [...new Set(sampleProducts.map(product => product.category))];
  return categories.map(category => ({
    value: category,
    label: category.charAt(0).toUpperCase() + category.slice(1)
  }));
}

// Obtener todas las marcas únicas
export function getBrands() {
  const brands = [...new Set(sampleProducts.map(product => product.brand))];
  return brands.sort();
}

// Obtener rango de precios
export function getPriceRange() {
  const prices = sampleProducts.map(product => product.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
} 