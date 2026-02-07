export interface City {
  name: string;
  province: string;
  region: string;
  deliveryZone: 'Metro Manila' | 'Luzon' | 'Visayas' | 'Mindanao';
}

export const philippineCities: City[] = [
  // Metro Manila (NCR)
  { name: 'Manila', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Quezon City', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Makati', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Pasig', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Taguig', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Parañaque', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Caloocan', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Mandaluyong', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Las Piñas', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Muntinlupa', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Marikina', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'San Juan', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Pasay', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Valenzuela', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Malabon', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Navotas', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },
  { name: 'Pateros', province: 'Metro Manila', region: 'NCR', deliveryZone: 'Metro Manila' },

  // Luzon
  { name: 'Baguio', province: 'Benguet', region: 'CAR', deliveryZone: 'Luzon' },
  { name: 'Angeles', province: 'Pampanga', region: 'Central Luzon', deliveryZone: 'Luzon' },
  { name: 'San Fernando', province: 'Pampanga', region: 'Central Luzon', deliveryZone: 'Luzon' },
  { name: 'Olongapo', province: 'Zambales', region: 'Central Luzon', deliveryZone: 'Luzon' },
  { name: 'Batangas City', province: 'Batangas', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Antipolo', province: 'Rizal', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Cavite City', province: 'Cavite', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Dasmariñas', province: 'Cavite', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Bacoor', province: 'Cavite', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Imus', province: 'Cavite', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Santa Rosa', province: 'Laguna', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Biñan', province: 'Laguna', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Calamba', province: 'Laguna', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'San Pablo', province: 'Laguna', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Lucena', province: 'Quezon', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Lipa', province: 'Batangas', region: 'CALABARZON', deliveryZone: 'Luzon' },
  { name: 'Naga', province: 'Camarines Sur', region: 'Bicol', deliveryZone: 'Luzon' },
  { name: 'Legazpi', province: 'Albay', region: 'Bicol', deliveryZone: 'Luzon' },
  { name: 'Tuguegarao', province: 'Cagayan', region: 'Cagayan Valley', deliveryZone: 'Luzon' },
  { name: 'Dagupan', province: 'Pangasinan', region: 'Ilocos', deliveryZone: 'Luzon' },
  { name: 'San Fernando', province: 'La Union', region: 'Ilocos', deliveryZone: 'Luzon' },
  { name: 'Laoag', province: 'Ilocos Norte', region: 'Ilocos', deliveryZone: 'Luzon' },
  { name: 'Vigan', province: 'Ilocos Sur', region: 'Ilocos', deliveryZone: 'Luzon' },
  { name: 'Cabanatuan', province: 'Nueva Ecija', region: 'Central Luzon', deliveryZone: 'Luzon' },
  { name: 'Tarlac City', province: 'Tarlac', region: 'Central Luzon', deliveryZone: 'Luzon' },
  { name: 'Meycauayan', province: 'Bulacan', region: 'Central Luzon', deliveryZone: 'Luzon' },
  { name: 'Malolos', province: 'Bulacan', region: 'Central Luzon', deliveryZone: 'Luzon' },

  // Visayas
  { name: 'Cebu City', province: 'Cebu', region: 'Central Visayas', deliveryZone: 'Visayas' },
  { name: 'Mandaue', province: 'Cebu', region: 'Central Visayas', deliveryZone: 'Visayas' },
  { name: 'Lapu-Lapu', province: 'Cebu', region: 'Central Visayas', deliveryZone: 'Visayas' },
  { name: 'Talisay', province: 'Cebu', region: 'Central Visayas', deliveryZone: 'Visayas' },
  { name: 'Iloilo City', province: 'Iloilo', region: 'Western Visayas', deliveryZone: 'Visayas' },
  { name: 'Bacolod', province: 'Negros Occidental', region: 'Western Visayas', deliveryZone: 'Visayas' },
  { name: 'Dumaguete', province: 'Negros Oriental', region: 'Central Visayas', deliveryZone: 'Visayas' },
  { name: 'Tagbilaran', province: 'Bohol', region: 'Central Visayas', deliveryZone: 'Visayas' },
  { name: 'Tacloban', province: 'Leyte', region: 'Eastern Visayas', deliveryZone: 'Visayas' },
  { name: 'Ormoc', province: 'Leyte', region: 'Eastern Visayas', deliveryZone: 'Visayas' },
  { name: 'Roxas City', province: 'Capiz', region: 'Western Visayas', deliveryZone: 'Visayas' },

  // Mindanao
  { name: 'Davao City', province: 'Davao del Sur', region: 'Davao', deliveryZone: 'Mindanao' },
  { name: 'Cagayan de Oro', province: 'Misamis Oriental', region: 'Northern Mindanao', deliveryZone: 'Mindanao' },
  { name: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Zamboanga Peninsula', deliveryZone: 'Mindanao' },
  { name: 'General Santos', province: 'South Cotabato', region: 'SOCCSKSARGEN', deliveryZone: 'Mindanao' },
  { name: 'Butuan', province: 'Agusan del Norte', region: 'Caraga', deliveryZone: 'Mindanao' },
  { name: 'Iligan', province: 'Lanao del Norte', region: 'Northern Mindanao', deliveryZone: 'Mindanao' },
  { name: 'Cotabato City', province: 'Maguindanao', region: 'BARMM', deliveryZone: 'Mindanao' },
  { name: 'Koronadal', province: 'South Cotabato', region: 'SOCCSKSARGEN', deliveryZone: 'Mindanao' },
  { name: 'Dipolog', province: 'Zamboanga del Norte', region: 'Zamboanga Peninsula', deliveryZone: 'Mindanao' },
  { name: 'Pagadian', province: 'Zamboanga del Sur', region: 'Zamboanga Peninsula', deliveryZone: 'Mindanao' },
  { name: 'Surigao City', province: 'Surigao del Norte', region: 'Caraga', deliveryZone: 'Mindanao' },
  { name: 'Marawi', province: 'Lanao del Sur', region: 'BARMM', deliveryZone: 'Mindanao' },
];

export const getDeliveryZoneByCity = (cityName: string): string | null => {
  const city = philippineCities.find(c => c.name === cityName);
  return city?.deliveryZone || null;
};

export const getCitiesByProvince = (province: string): City[] => {
  return philippineCities.filter(c => c.province === province);
};

export const getUniqueProvinces = (): string[] => {
  return [...new Set(philippineCities.map(c => c.province))];
};
