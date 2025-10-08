// Malaysian cities and states for location selection
const MALAYSIAN_CITIES = [
  // Kuala Lumpur
  { city: 'Kuala Lumpur', state: 'Kuala Lumpur' },
  
  // Selangor
  { city: 'Petaling Jaya', state: 'Selangor' },
  { city: 'Subang Jaya', state: 'Selangor' },
  { city: 'Puchong', state: 'Selangor' },
  { city: 'Shah Alam', state: 'Selangor' },
  { city: 'Klang', state: 'Selangor' },
  { city: 'Ampang', state: 'Selangor' },
  { city: 'Cheras', state: 'Selangor' },
  { city: 'Kajang', state: 'Selangor' },
  { city: 'Rawang', state: 'Selangor' },
  { city: 'Sepang', state: 'Selangor' },
  { city: 'Hulu Selangor', state: 'Selangor' },
  { city: 'Gombak', state: 'Selangor' },
  { city: 'Kuala Selangor', state: 'Selangor' },
  { city: 'Sabak Bernam', state: 'Selangor' },
  
  // Johor
  { city: 'Johor Bahru', state: 'Johor' },
  { city: 'Kulai', state: 'Johor' },
  { city: 'Kluang', state: 'Johor' },
  { city: 'Batu Pahat', state: 'Johor' },
  { city: 'Muar', state: 'Johor' },
  { city: 'Segamat', state: 'Johor' },
  { city: 'Pontian', state: 'Johor' },
  { city: 'Kota Tinggi', state: 'Johor' },
  { city: 'Mersing', state: 'Johor' },
  { city: 'Tangkak', state: 'Johor' },
  
  // Penang
  { city: 'George Town', state: 'Penang' },
  { city: 'Butterworth', state: 'Penang' },
  { city: 'Bukit Mertajam', state: 'Penang' },
  { city: 'Nibong Tebal', state: 'Penang' },
  { city: 'Kepala Batas', state: 'Penang' },
  
  // Perak
  { city: 'Ipoh', state: 'Perak' },
  { city: 'Taiping', state: 'Perak' },
  { city: 'Kuala Kangsar', state: 'Perak' },
  { city: 'Teluk Intan', state: 'Perak' },
  { city: 'Kampar', state: 'Perak' },
  { city: 'Sungai Siput', state: 'Perak' },
  { city: 'Parit Buntar', state: 'Perak' },
  { city: 'Batu Gajah', state: 'Perak' },
  
  // Kedah
  { city: 'Alor Setar', state: 'Kedah' },
  { city: 'Sungai Petani', state: 'Kedah' },
  { city: 'Kulim', state: 'Kedah' },
  { city: 'Langkawi', state: 'Kedah' },
  { city: 'Kubang Pasu', state: 'Kedah' },
  { city: 'Kota Setar', state: 'Kedah' },
  
  // Kelantan
  { city: 'Kota Bharu', state: 'Kelantan' },
  { city: 'Pasir Mas', state: 'Kelantan' },
  { city: 'Tumpat', state: 'Kelantan' },
  { city: 'Bachok', state: 'Kelantan' },
  { city: 'Pasir Puteh', state: 'Kelantan' },
  
  // Terengganu
  { city: 'Kuala Terengganu', state: 'Terengganu' },
  { city: 'Kemaman', state: 'Terengganu' },
  { city: 'Dungun', state: 'Terengganu' },
  { city: 'Marang', state: 'Terengganu' },
  { city: 'Hulu Terengganu', state: 'Terengganu' },
  
  // Pahang
  { city: 'Kuantan', state: 'Pahang' },
  { city: 'Temerloh', state: 'Pahang' },
  { city: 'Bentong', state: 'Pahang' },
  { city: 'Raub', state: 'Pahang' },
  { city: 'Jerantut', state: 'Pahang' },
  { city: 'Cameron Highlands', state: 'Pahang' },
  { city: 'Fraser\'s Hill', state: 'Pahang' },
  
  // Negeri Sembilan
  { city: 'Seremban', state: 'Negeri Sembilan' },
  { city: 'Port Dickson', state: 'Negeri Sembilan' },
  { city: 'Nilai', state: 'Negeri Sembilan' },
  { city: 'Rembau', state: 'Negeri Sembilan' },
  { city: 'Jelebu', state: 'Negeri Sembilan' },
  { city: 'Kuala Pilah', state: 'Negeri Sembilan' },
  
  // Melaka
  { city: 'Melaka', state: 'Melaka' },
  { city: 'Alor Gajah', state: 'Melaka' },
  { city: 'Jasin', state: 'Melaka' },
  
  // Sabah
  { city: 'Kota Kinabalu', state: 'Sabah' },
  { city: 'Sandakan', state: 'Sabah' },
  { city: 'Tawau', state: 'Sabah' },
  { city: 'Lahad Datu', state: 'Sabah' },
  { city: 'Keningau', state: 'Sabah' },
  { city: 'Kudat', state: 'Sabah' },
  { city: 'Beaufort', state: 'Sabah' },
  { city: 'Sipitang', state: 'Sabah' },
  
  // Sarawak
  { city: 'Kuching', state: 'Sarawak' },
  { city: 'Miri', state: 'Sarawak' },
  { city: 'Sibu', state: 'Sarawak' },
  { city: 'Bintulu', state: 'Sarawak' },
  { city: 'Limbang', state: 'Sarawak' },
  { city: 'Sarikei', state: 'Sarawak' },
  { city: 'Sri Aman', state: 'Sarawak' },
  { city: 'Kapit', state: 'Sarawak' },
  
  // Perlis
  { city: 'Kangar', state: 'Perlis' },
  { city: 'Arau', state: 'Perlis' },
  
  // Labuan
  { city: 'Labuan', state: 'Labuan' },
  
  // Putrajaya
  { city: 'Putrajaya', state: 'Putrajaya' },
];

// Get unique states
const MALAYSIAN_STATES = Array.from(
  new Set(MALAYSIAN_CITIES.map(city => city.state))
).sort();

// Get cities by state
const getCitiesByState = (state) => {
  return MALAYSIAN_CITIES.filter(city => city.state === state);
};

// Get all city names
const getAllCityNames = () => {
  return MALAYSIAN_CITIES.map(city => city.city);
};

export {
  MALAYSIAN_CITIES,
  MALAYSIAN_STATES,
  getCitiesByState,
  getAllCityNames
};
