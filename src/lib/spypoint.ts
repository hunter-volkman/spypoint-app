// SPYPOINT API Client
// TypeScript implementation 
// Matching Python client.py

const BASE_URL = 'https://restapi.spypoint.com/api/v3';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Camera {
  id: string;
  name: string;
  model: string;
  last_update: string;
  is_online: boolean;
  coordinates?: Coordinates;
}

export interface Photo {
  id: string;
  camera_id: string;
  timestamp: string;
  tags: string[];
  filename: string;
  url_small: string;
  url_medium: string;
  url_large: string;
  camera_name?: string;
  camera_coordinates?: Coordinates;
}

export class SpypointClient {
  private token: string | null = null;
  
  constructor(
    private username: string,
    private password: string
  ) {}
  
  async authenticate(): Promise<void> {
    const response = await fetch(`${BASE_URL}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.username,
        password: this.password
      })
    });
    
    if (response.status === 401) {
      throw new Error('Invalid SPYPOINT credentials');
    }
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }
    
    const data = await response.json();
    this.token = data.token;
  }
  
  private get headers() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }
  
  async get_cameras(): Promise<Camera[]> {
    const response = await fetch(`${BASE_URL}/camera/all`, {
      headers: this.headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cameras: ${response.status}`);
    }
    
    const cameras_data = await response.json();
    return cameras_data.map(this.parse_camera);
  }
  
  async get_photos(cameras: Camera[], limit = 100, tags: string[] = []): Promise<Photo[]> {
    const camera_ids = cameras.map(c => c.id);
    
    const response = await fetch(`${BASE_URL}/photo/all`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        camera: camera_ids,
        dateEnd: '2100-01-01T00:00:00.000Z',
        favorite: false,
        hd: false,
        limit,
        tag: tags
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.status}`);
    }
    
    const data = await response.json();
    const photos = data.photos || [];
    
    // Create camera lookup for enriching photos
    const camera_lookup = new Map(cameras.map(c => [c.id, c]));
    
    // Parse and enrich photos
    return photos
      .map((photo_data: any) => this.parse_photo(photo_data, camera_lookup))
      .sort((a: Photo, b: Photo) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
  
  private parse_camera = (data: any): Camera => {
    const config = data.config || {};
    const status = data.status || {};
    const last_update = status.lastUpdate || new Date().toISOString();
    
    // Camera is online if updated within last 24 hours
    const now = new Date();
    const update_time = new Date(last_update);
    const is_online = (now.getTime() - update_time.getTime()) < 86400000;
    
    const coordinates = this.parse_coordinates(status.coordinates);
    
    return {
      id: data.id,
      name: config.name || 'Unknown Camera',
      model: status.model || 'Unknown Model',
      last_update,
      is_online,
      coordinates
    };
  };
  
  private parse_coordinates(coordinates_data: any): Coordinates | undefined {
    if (!coordinates_data || !Array.isArray(coordinates_data) || coordinates_data.length === 0) {
      return undefined;
    }
    
    const coord_item = coordinates_data[0];
    if (!coord_item || typeof coord_item !== 'object') {
      return undefined;
    }
    
    const position = coord_item.position || {};
    if (position.type !== 'Point') {
      return undefined;
    }
    
    const coords = position.coordinates || [];
    if (!Array.isArray(coords) || coords.length !== 2) {
      return undefined;
    }
    
    // GeoJSON format: [longitude, latitude]
    const [longitude, latitude] = coords;
    return {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };
  }
  
  private parse_photo = (data: any, camera_lookup: Map<string, Camera>): Photo => {
    const camera = camera_lookup.get(data.camera);
    
    return {
      id: data.id,
      camera_id: data.camera,
      timestamp: data.date,
      tags: data.tag || [],
      filename: data.originName || `photo_${data.id}.jpg`,
      url_small: this.build_url(data.small || {}),
      url_medium: this.build_url(data.medium || {}),
      url_large: this.build_url(data.large || {}),
      camera_name: camera?.name,
      camera_coordinates: camera?.coordinates
    };
  };
  
  private build_url(size_data: any): string {
    const host = size_data.host || '';
    const path = size_data.path || '';
    
    if (!host || !path) {
      return '';
    }
    
    return `https://${host}/${path}`;
  }
}