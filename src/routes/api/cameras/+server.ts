import { json } from '@sveltejs/kit';
import { SpypointClient } from '$lib/spypoint';
import { SPYPOINT_USERNAME, SPYPOINT_PASSWORD } from '$env/static/private';
import type { RequestHandler } from './$types';

// Cache cameras for 5 minutes to reduce API calls
let camera_cache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const GET: RequestHandler = async () => {
  try {
    // Check cache
    if (camera_cache && Date.now() - camera_cache.timestamp < CACHE_DURATION) {
      return json(camera_cache.data);
    }

    const client = new SpypointClient(SPYPOINT_USERNAME, SPYPOINT_PASSWORD);
    await client.authenticate();
    const cameras = await client.get_cameras();
    
    // Update cache
    camera_cache = { data: cameras, timestamp: Date.now() };
    
    return json(cameras);
  } catch (error) {
    console.error('Camera fetch error:', error);
    return json({ error: 'Failed to fetch cameras' }, { status: 500 });
  }
};