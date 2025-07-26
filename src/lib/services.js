// Datos de muestra para servicios/cursos
export const sampleServices = [
  {
    id: 1,
    name: "Curso de Manicure Profesional",
    description: "Aprende técnicas profesionales de manicure, desde básico hasta avanzado. Incluye teoría y práctica intensiva.",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=400&fit=crop&crop=center",
    category: "curso",
    duration: "3 días",
    price: 299.99,
    level: "Principiante a Intermedio",
    includes: [
      "Kit completo de herramientas",
      "Certificado de finalización",
      "Material didáctico",
      "Práctica supervisada"
    ],
    schedule: [
      {
        id: 101,
        date: "2024-02-15",
        time: "09:00 - 17:00",
        availableSpots: 8,
        totalSpots: 12,
        status: "available"
      },
      {
        id: 102,
        date: "2024-02-22",
        time: "09:00 - 17:00", 
        availableSpots: 3,
        totalSpots: 12,
        status: "limited"
      },
      {
        id: 103,
        date: "2024-03-01",
        time: "09:00 - 17:00",
        availableSpots: 0,
        totalSpots: 12,
        status: "full"
      },
      {
        id: 104,
        date: "2024-03-15",
        time: "09:00 - 17:00",
        availableSpots: 12,
        totalSpots: 12,
        status: "available"
      }
    ]
  },
  {
    id: 2,
    name: "Nail Art y Diseños Creativos",
    description: "Especialízate en nail art con técnicas avanzadas de diseño, degradados, y arte en uñas.",
    image: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=600&h=400&fit=crop&crop=center",
    category: "curso",
    duration: "2 días",
    price: 199.99,
    level: "Intermedio a Avanzado",
    includes: [
      "Materiales de diseño premium",
      "Certificado especializado",
      "Portfolio de diseños",
      "Técnicas exclusivas"
    ],
    schedule: [
      {
        id: 201,
        date: "2024-02-20",
        time: "10:00 - 16:00",
        availableSpots: 6,
        totalSpots: 8,
        status: "available"
      },
      {
        id: 202,
        date: "2024-03-05",
        time: "10:00 - 16:00",
        availableSpots: 2,
        totalSpots: 8,
        status: "limited"
      },
      {
        id: 203,
        date: "2024-03-20",
        time: "10:00 - 16:00",
        availableSpots: 8,
        totalSpots: 8,
        status: "available"
      }
    ]
  },
  {
    id: 3,
    name: "Cuidado de Cutículas y Salud de Uñas",
    description: "Aprende técnicas profesionales para el cuidado integral de cutículas y mantenimiento de uñas saludables.",
    image: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=600&h=400&fit=crop&crop=center",
    category: "curso",
    duration: "1 día",
    price: 149.99,
    level: "Todos los niveles",
    includes: [
      "Kit de cuidado de cutículas",
      "Guía de productos",
      "Técnicas de higiene",
      "Certificado de participación"
    ],
    schedule: [
      {
        id: 301,
        date: "2024-02-18",
        time: "09:00 - 15:00",
        availableSpots: 10,
        totalSpots: 15,
        status: "available"
      },
      {
        id: 302,
        date: "2024-02-25",
        time: "09:00 - 15:00",
        availableSpots: 4,
        totalSpots: 15,
        status: "available"
      },
      {
        id: 303,
        date: "2024-03-10",
        time: "09:00 - 15:00",
        availableSpots: 15,
        totalSpots: 15,
        status: "available"
      }
    ]
  },
  {
    id: 4,
    name: "Emprendimiento en Belleza",
    description: "Curso completo para crear y gestionar tu propio negocio de belleza y manicure.",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop&crop=center",
    category: "negocio",
    duration: "2 días",
    price: 249.99,
    level: "Todos los niveles",
    includes: [
      "Plan de negocio template",
      "Estrategias de marketing",
      "Gestión financiera",
      "Networking con profesionales"
    ],
    schedule: [
      {
        id: 401,
        date: "2024-02-28",
        time: "09:00 - 17:00",
        availableSpots: 12,
        totalSpots: 20,
        status: "available"
      },
      {
        id: 402,
        date: "2024-03-12",
        time: "09:00 - 17:00",
        availableSpots: 8,
        totalSpots: 20,
        status: "available"
      }
    ]
  },
  {
    id: 5,
    name: "Pedicure Spa Profesional",
    description: "Técnicas completas de pedicure spa, relajación, tratamientos especiales y cuidado de pies.",
    image: "https://images.unsplash.com/photo-1582747652673-603191058c91?w=600&h=400&fit=crop&crop=center",
    category: "curso",
    duration: "2 días",
    price: 179.99,
    level: "Principiante a Intermedio",
    includes: [
      "Kit completo de pedicure",
      "Productos de spa",
      "Técnicas de relajación",
      "Certificado profesional"
    ],
    schedule: [
      {
        id: 501,
        date: "2024-03-08",
        time: "09:00 - 16:00",
        availableSpots: 6,
        totalSpots: 10,
        status: "available"
      },
      {
        id: 502,
        date: "2024-03-22",
        time: "09:00 - 16:00",
        availableSpots: 1,
        totalSpots: 10,
        status: "limited"
      }
    ]
  },
  {
    id: 6,
    name: "Extensiones de Uñas - Gel y Acrílico",
    description: "Domina las técnicas de extensiones de uñas con gel y acrílico para looks espectaculares.",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop&crop=center",
    category: "curso",
    duration: "3 días",
    price: 349.99,
    level: "Intermedio a Avanzado",
    includes: [
      "Kit profesional completo",
      "Materiales premium",
      "Técnicas avanzadas",
      "Certificación especializada"
    ],
    schedule: [
      {
        id: 601,
        date: "2024-03-25",
        time: "09:00 - 17:00",
        availableSpots: 4,
        totalSpots: 8,
        status: "limited"
      },
      {
        id: 602,
        date: "2024-04-05",
        time: "09:00 - 17:00",
        availableSpots: 8,
        totalSpots: 8,
        status: "available"
      }
    ]
  }
];

// Función para obtener todos los servicios
export function getServices(filters = {}) {
  const { category = '', level = '', minPrice = '', maxPrice = '' } = filters;
  
  let filteredServices = [...sampleServices];
  
  // Filtro por categoría
  if (category) {
    filteredServices = filteredServices.filter(service => 
      service.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Filtro por nivel
  if (level) {
    filteredServices = filteredServices.filter(service => 
      service.level.toLowerCase().includes(level.toLowerCase())
    );
  }
  
  // Filtro por rango de precios
  if (minPrice) {
    filteredServices = filteredServices.filter(service => 
      service.price >= parseFloat(minPrice)
    );
  }
  
  if (maxPrice) {
    filteredServices = filteredServices.filter(service => 
      service.price <= parseFloat(maxPrice)
    );
  }
  
  return filteredServices;
}

// Función para obtener un servicio específico
export function getServiceById(id) {
  return sampleServices.find(service => service.id === parseInt(id));
}

// Función para obtener categorías únicas
export function getServiceCategories() {
  const categories = [...new Set(sampleServices.map(service => service.category))];
  return categories.map(category => ({
    value: category,
    label: category.charAt(0).toUpperCase() + category.slice(1)
  }));
}

// Función para obtener niveles únicos
export function getServiceLevels() {
  const levels = [...new Set(sampleServices.map(service => service.level))];
  return levels;
}

// Función para reservar un lugar en un horario
export function reserveSpot(serviceId, scheduleId, reservationData) {
  // En una aplicación real, esto se conectaría a una base de datos
  const service = sampleServices.find(s => s.id === serviceId);
  if (!service) return { success: false, message: "Servicio no encontrado" };
  
  const schedule = service.schedule.find(s => s.id === scheduleId);
  if (!schedule) return { success: false, message: "Horario no encontrado" };
  
  if (schedule.availableSpots <= 0) {
    return { success: false, message: "No hay lugares disponibles" };
  }
  
  // Simular reserva exitosa
  schedule.availableSpots -= 1;
  
  // Actualizar estado basado en lugares disponibles
  if (schedule.availableSpots === 0) {
    schedule.status = "full";
  } else if (schedule.availableSpots <= 3) {
    schedule.status = "limited";
  }
  
  return { 
    success: true, 
    message: "Reserva realizada exitosamente",
    confirmationNumber: `BBS-${Date.now()}`,
    reservationData
  };
} 

// Obtener rango de precios para servicios
export function getServicePriceRange() {
  const prices = sampleServices.map(service => service.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
} 