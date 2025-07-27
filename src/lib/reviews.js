// Datos de muestra para reseñas de productos
const sampleReviews = [
  // Esmalte Rojo Clásico (ID: 1)
  {
    id: 1,
    productId: 1,
    author: "María González",
    rating: 5,
    title: "Color perfecto y duradero",
    comment: "Me encanta este esmalte! El color rojo es exactamente lo que buscaba y ha durado más de una semana sin descascararse. La aplicación es muy fácil y el acabado es profesional.",
    date: "2024-01-20",
    verified: true
  },
  {
    id: 2,
    productId: 1,
    author: "Ana Ruiz",
    rating: 4,
    title: "Muy buena calidad",
    comment: "Excelente producto, aunque me hubiera gustado que secara un poco más rápido. El color es vibrante y la duración es buena.",
    date: "2024-01-18",
    verified: true
  },
  {
    id: 3,
    productId: 1,
    author: "Carmen López",
    rating: 5,
    title: "Mi esmalte favorito",
    comment: "Es mi segunda compra de este producto. La calidad es consistente y el precio es muy bueno para lo que ofrece.",
    date: "2024-01-15",
    verified: false
  },

  // Esmalte Gel Azul Océano (ID: 2)
  {
    id: 4,
    productId: 2,
    author: "Laura Martín",
    rating: 5,
    title: "Increíble duración",
    comment: "Como técnico en uñas, este gel es uno de los mejores que he usado. La duración es excepcional y el color azul es hermoso.",
    date: "2024-01-22",
    verified: true
  },
  {
    id: 5,
    productId: 2,
    author: "Sofía Hernández",
    rating: 4,
    title: "Muy buen producto",
    comment: "Me gusta mucho el color y la textura. Necesita lámpara UV pero el resultado vale la pena.",
    date: "2024-01-19",
    verified: true
  },

  // Lima de Cristal Profesional (ID: 7)
  {
    id: 6,
    productId: 7,
    author: "Patricia Gómez",
    rating: 5,
    title: "La mejor lima que he tenido",
    comment: "Esta lima de cristal es increíble. Deja las uñas súper suaves y no las daña como las limas normales. Totalmente recomendada.",
    date: "2024-01-25",
    verified: true
  },
  {
    id: 7,
    productId: 7,
    author: "Isabel Torres",
    rating: 5,
    title: "Excelente calidad",
    comment: "Es mi tercera lima de cristal y esta es la mejor. Se nota la calidad desde el primer uso.",
    date: "2024-01-21",
    verified: true
  },
  {
    id: 8,
    productId: 7,
    author: "Rosa Jiménez",
    rating: 4,
    title: "Muy buena pero frágil",
    comment: "La lima funciona perfectamente, solo hay que tener cuidado de no dejarla caer porque se puede quebrar.",
    date: "2024-01-17",
    verified: false
  },

  // Polvo Acrílico Transparente (ID: 11)
  {
    id: 9,
    productId: 11,
    author: "Alejandra Morales",
    rating: 5,
    title: "Perfecto para extensiones",
    comment: "Como manicurista profesional, este polvo acrílico me da resultados perfectos. La consistencia es ideal y se trabaja muy bien.",
    date: "2024-01-23",
    verified: true
  },
  {
    id: 10,
    productId: 11,
    author: "Elena Vargas",
    rating: 4,
    title: "Buena calidad-precio",
    comment: "Para ser mi primer intento con acrílicos, este producto me facilitó mucho el trabajo. Recomendado para principiantes.",
    date: "2024-01-16",
    verified: true
  },

  // Aceite de Cutícula Vitamin E (ID: 16)
  {
    id: 11,
    productId: 16,
    author: "Mónica Castro",
    rating: 5,
    title: "Mis cutículas nunca estuvieron mejor",
    comment: "Este aceite ha transformado completamente mis cutículas. Son más suaves y saludables. Lo uso todos los días.",
    date: "2024-01-28",
    verified: true
  },
  {
    id: 12,
    productId: 16,
    author: "Beatriz Ramírez",
    rating: 4,
    title: "Muy hidratante",
    comment: "Buen producto, aunque el envase es un poco pequeño para el precio. Pero la calidad es excelente.",
    date: "2024-01-24",
    verified: true
  }
];

// Función para obtener reseñas de un producto específico
export function getProductReviews(productId) {
  return sampleReviews.filter(review => review.productId === productId);
}

// Función para obtener todas las reseñas
export function getAllReviews() {
  return sampleReviews;
}

// Función para obtener estadísticas de reseñas de un producto
export function getProductRatingStats(productId) {
  const reviews = getProductReviews(productId);
  
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: [0, 0, 0, 0, 0]
    };
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => 
    reviews.filter(review => review.rating === rating).length
  );

  return {
    averageRating: Number(averageRating.toFixed(1)),
    totalReviews: reviews.length,
    ratingDistribution
  };
} 