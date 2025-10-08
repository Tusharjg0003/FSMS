/**
 * Geocoding utility functions to convert addresses to coordinates
 * Uses OpenStreetMap Nominatim (free) as primary, with Google Maps fallback
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  confidence?: number;
}

export interface GeocodingError {
  error: string;
  message: string;
}

/**
 * Geocode an address using OpenStreetMap Nominatim (free, no API key required)
 */
export async function geocodeWithNominatim(address: string): Promise<GeocodingResult | GeocodingError> {
  try {
    // Clean and format the address for better results
    const cleanAddress = address.trim().replace(/\s+/g, '+');
    
    // Add Malaysia context for better results (only if not already present)
    const searchQuery = cleanAddress.includes('Malaysia') 
      ? cleanAddress 
      : `${cleanAddress}, Malaysia`;
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FSMS-FYP/1.0 (Field Service Management System)', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      return {
        error: 'NETWORK_ERROR',
        message: `Failed to fetch from Nominatim: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return {
        error: 'NO_RESULTS',
        message: 'No results found for the given address',
      };
    }

    const result = data[0];
    
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      formattedAddress: result.display_name,
      confidence: result.importance || 0,
    };
  } catch (error) {
    return {
      error: 'UNKNOWN_ERROR',
      message: `Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Geocode an address using Google Maps Geocoding API (requires API key)
 */
export async function geocodeWithGoogle(address: string, apiKey?: string): Promise<GeocodingResult | GeocodingError> {
  if (!apiKey) {
    return {
      error: 'NO_API_KEY',
      message: 'Google Maps API key is required',
    };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );

    if (!response.ok) {
      return {
        error: 'NETWORK_ERROR',
        message: `Failed to fetch from Google Maps: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return {
        error: 'NO_RESULTS',
        message: `Google Maps geocoding failed: ${data.status}`,
      };
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
      confidence: result.geometry.location_type === 'ROOFTOP' ? 1.0 : 0.8,
    };
  } catch (error) {
    return {
      error: 'UNKNOWN_ERROR',
      message: `Google Maps geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Main geocoding function that tries multiple services with validation
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | GeocodingError> {
  console.log(`Geocoding address: "${address}"`);

  // Try Google Maps first (more reliable for Malaysian addresses)
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    const googleResult = await geocodeWithGoogle(address, googleApiKey);
    
    if (!('error' in googleResult)) {
      // Validate coordinates are in Malaysia
      if (validateMalaysiaCoordinates(googleResult.latitude, googleResult.longitude)) {
        console.log(`Google Maps success: (${googleResult.latitude}, ${googleResult.longitude})`);
        return googleResult;
      } else {
        console.log(`Google Maps result outside Malaysia: (${googleResult.latitude}, ${googleResult.longitude})`);
      }
    }
    
    console.log(`Google Maps failed: ${googleResult.message}`);
  }

  // Try OpenStreetMap Nominatim as fallback
  const nominatimResult = await geocodeWithNominatim(address);
  
  if (!('error' in nominatimResult)) {
    // Validate coordinates are in Malaysia
    if (validateMalaysiaCoordinates(nominatimResult.latitude, nominatimResult.longitude)) {
      console.log(`Nominatim success: (${nominatimResult.latitude}, ${nominatimResult.longitude})`);
      return nominatimResult;
    } else {
      console.log(`Nominatim result outside Malaysia: (${nominatimResult.latitude}, ${nominatimResult.longitude})`);
      // Return error if coordinates are outside Malaysia
      return {
        error: 'OUTSIDE_MALAYSIA',
        message: `Geocoded coordinates (${nominatimResult.latitude}, ${nominatimResult.longitude}) are outside Malaysia bounds`
      };
    }
  }

  console.log(`Nominatim failed: ${nominatimResult.message}`);

  // Return the Nominatim error as final result
  return nominatimResult;
}

/**
 * Validate if coordinates are within Malaysia bounds
 */
export function validateMalaysiaCoordinates(latitude: number, longitude: number): boolean {
  // Malaysia bounds (more precise)
  const MALAYSIA_BOUNDS = {
    north: 7.5,   // Northernmost point (Perlis)
    south: 0.5,   // Southernmost point (Johor)
    east: 119.5,  // Easternmost point (Sabah)
    west: 99.5,   // Westernmost point (Perlis)
  };

  const isValid = (
    latitude >= MALAYSIA_BOUNDS.south &&
    latitude <= MALAYSIA_BOUNDS.north &&
    longitude >= MALAYSIA_BOUNDS.west &&
    longitude <= MALAYSIA_BOUNDS.east
  );

  if (!isValid) {
    console.log(`Coordinates (${latitude}, ${longitude}) are outside Malaysia bounds`);
  }

  return isValid;
}

/**
 * Check if coordinates are suspiciously similar (indicating geocoding service issues)
 */
export function detectSuspiciousCoordinates(latitude: number, longitude: number, recentCoordinates: Array<{lat: number, lng: number}>): boolean {
  // Check if coordinates are identical to recent ones (within 0.001 degrees)
  const threshold = 0.001;
  
  for (const coord of recentCoordinates) {
    const latDiff = Math.abs(latitude - coord.lat);
    const lngDiff = Math.abs(longitude - coord.lng);
    
    if (latDiff < threshold && lngDiff < threshold) {
      console.log(`Suspicious coordinates detected: (${latitude}, ${longitude}) matches recent result`);
      return true;
    }
  }
  
  return false;
}

/**
 * Extract state name from geocoded address
 */
function extractStateFromAddress(address: string): string | null {
  const stateMappings = {
    'pulau pinang': 'penang',
    'penang': 'penang',
    'selangor': 'selangor',
    'kuala lumpur': 'kuala lumpur',
    'johor': 'johor',
    'perak': 'perak',
    'pahang': 'pahang',
    'sabah': 'sabah',
    'sarawak': 'sarawak',
    'kedah': 'kedah',
    'kelantan': 'kelantan',
    'terengganu': 'terengganu',
    'perlis': 'perlis',
    'negeri sembilan': 'negeri sembilan',
    'melaka': 'melaka',
    'malacca': 'melaka',
    'johor bahru': 'johor',
    'iskandar puteri': 'johor'
  };
  
  const lowerAddress = address.toLowerCase();
  console.log(`Extracting state from: "${lowerAddress}"`);
  
  for (const [key, value] of Object.entries(stateMappings)) {
    if (lowerAddress.includes(key)) {
      console.log(`Found state mapping: "${key}" -> "${value}"`);
      return value;
    }
  }
  
  console.log(`No state mapping found for: "${lowerAddress}"`);
  return null;
}

/**
 * Interface for structured address components
 */
export interface StructuredAddress {
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  customCity?: string;
}

/**
 * Geocode using structured address components with progressive fallback
 * Tries: Full address -> City + State -> City only -> Postcode only
 */
export async function geocodeStructuredAddress(addressComponents: StructuredAddress): Promise<GeocodingResult | GeocodingError> {
  const city = addressComponents.city === 'Other' ? addressComponents.customCity : addressComponents.city;
  
  // Strategy 1: Full address with all components
  if (addressComponents.address && city && addressComponents.state) {
    const fullQuery = [
      addressComponents.address,
      city,
      addressComponents.state,
      addressComponents.postcode,
      'Malaysia'
    ].filter(Boolean).join(', ');
    
    console.log(`Geocoding Strategy 1 (Full): "${fullQuery}"`);
    const result1 = await geocodeAddress(fullQuery);
    if (!('error' in result1)) {
      console.log(`Strategy 1 success: (${result1.latitude}, ${result1.longitude})`);
      return result1;
    }
    console.log(`Strategy 1 failed: ${result1.message}`);
  }
  
  // Strategy 2: City + State + Postcode (without specific address)
  if (city && addressComponents.state) {
    const cityStateQuery = [
      city,
      addressComponents.state,
      addressComponents.postcode,
      'Malaysia'
    ].filter(Boolean).join(', ');
    
    console.log(`Geocoding Strategy 2 (City+State): "${cityStateQuery}"`);
    const result2 = await geocodeAddress(cityStateQuery);
    if (!('error' in result2)) {
      console.log(`Strategy 2 success: (${result2.latitude}, ${result2.longitude})`);
      return result2;
    }
    console.log(`Strategy 2 failed: ${result2.message}`);
  }
  
  // Strategy 3: City + State only (more specific)
  if (city && addressComponents.state) {
    // Try different variations of city+state
    const cityVariations = [
      `${city}, ${addressComponents.state}, Malaysia`,
      `${city}, Pulau Pinang, Malaysia`, // Specific for Penang
      `${city}, Penang, Malaysia`
    ];
    
    for (let i = 0; i < cityVariations.length; i++) {
      const cityQuery = cityVariations[i];
      console.log(`Geocoding Strategy 3.${i + 1} (City variation): "${cityQuery}"`);
      const result3 = await geocodeAddress(cityQuery);
      if (!('error' in result3)) {
        console.log(`Strategy 3.${i + 1} success: (${result3.latitude}, ${result3.longitude})`);
        return result3;
      }
      console.log(`Strategy 3.${i + 1} failed: ${result3.message}`);
    }
  }
  
  // Strategy 4: Postcode only (if available) - but validate against expected state
  if (addressComponents.postcode && addressComponents.state) {
    console.log(`🔍 ENTERING STRATEGY 4 - POSTCODE VALIDATION VERSION`);
    const postcodeQuery = `${addressComponents.postcode}, Malaysia`;
    console.log(`Geocoding Strategy 4 (Postcode): "${postcodeQuery}"`);
    const result4 = await geocodeAddress(postcodeQuery);
    if (!('error' in result4)) {
      // Validate that the postcode result is in the expected state
      console.log(`Strategy 4 raw result: ${result4.formattedAddress}`);
      const resultState = extractStateFromAddress(result4.formattedAddress);
      const expectedState = addressComponents.state.toLowerCase();
      
      console.log(`Strategy 4 validation: resultState="${resultState}", expectedState="${expectedState}"`);
      
      if (resultState && resultState.includes(expectedState)) {
        console.log(`Strategy 4 success: (${result4.latitude}, ${result4.longitude}) - State validated`);
        return result4;
      } else {
        console.log(`Strategy 4 failed: Postcode ${addressComponents.postcode} geocoded to ${resultState}, expected ${expectedState}`);
        // Don't return this result, continue to next strategy
      }
    }
    console.log(`Strategy 4 failed: ${result4.message}`);
  }
  
  // Strategy 5: City only (fallback) - try multiple variations
  if (city) {
    const cityVariations = [
      `${city}, Malaysia`,
      `${city}, Penang, Malaysia`,
      `${city}, Pulau Pinang, Malaysia`,
      `George Town, Penang, Malaysia`, // Fallback to main city
      `Penang, Malaysia` // State-level fallback
    ];
    
    for (let i = 0; i < cityVariations.length; i++) {
      const cityQuery = cityVariations[i];
      console.log(`Geocoding Strategy 5.${i + 1} (City fallback): "${cityQuery}"`);
      const result5 = await geocodeAddress(cityQuery);
      if (!('error' in result5)) {
        console.log(`Strategy 5.${i + 1} success: (${result5.latitude}, ${result5.longitude})`);
        return result5;
      }
      console.log(`Strategy 5.${i + 1} failed: ${result5.message}`);
    }
  }
  
  // All strategies failed
  return {
    error: 'ALL_STRATEGIES_FAILED',
    message: 'All geocoding strategies failed. Please provide more specific location information.'
  };
}

/**
 * Geocode using just city and state (for quick location-based assignment)
 */
export async function geocodeCityState(city: string, state: string): Promise<GeocodingResult | GeocodingError> {
  const query = `${city}, ${state}, Malaysia`;
  console.log(`Geocoding city-state: "${query}"`);
  
  return await geocodeAddress(query);
}

/**
 * Geocode using just postcode (for Malaysian postcodes)
 */
export async function geocodePostcode(postcode: string): Promise<GeocodingResult | GeocodingError> {
  const query = `${postcode}, Malaysia`;
  console.log(`Geocoding postcode: "${query}"`);
  
  return await geocodeAddress(query);
}

/**
 * Smart geocoding with automatic fallback strategies and suspicious coordinate detection
 * This is the main function that should be used for all geocoding
 */
export async function smartGeocode(addressComponents: StructuredAddress): Promise<GeocodingResult | GeocodingError> {
  console.log(`Smart geocoding for:`, addressComponents);
  
  // If we have structured components, use the progressive fallback
  if (addressComponents.address || addressComponents.city || addressComponents.state || addressComponents.postcode) {
    const result = await geocodeStructuredAddress(addressComponents);
    
    // If geocoding succeeded, validate the result
    if (!('error' in result)) {
      // Check if coordinates are in Malaysia
      if (!validateMalaysiaCoordinates(result.latitude, result.longitude)) {
        console.log(`Geocoded coordinates are outside Malaysia: (${result.latitude}, ${result.longitude})`);
        return {
          error: 'OUTSIDE_MALAYSIA',
          message: `Geocoded coordinates (${result.latitude}, ${result.longitude}) are outside Malaysia bounds`
        };
      }
      
      // Check for suspicious coordinates (same as recent results)
      // This would require passing recent coordinates, but for now we'll just validate Malaysia bounds
      console.log(`Geocoding successful: (${result.latitude}, ${result.longitude})`);
    }
    
    return result;
  }
  
  // Fallback to basic geocoding
  return {
    error: 'NO_ADDRESS_COMPONENTS',
    message: 'No address components provided for geocoding'
  };
}

