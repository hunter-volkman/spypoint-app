import { json } from '@sveltejs/kit';
import { SpypointClient } from '$lib/spypoint';
import { SPYPOINT_USERNAME, SPYPOINT_PASSWORD } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];
    
    const client = new SpypointClient(SPYPOINT_USERNAME, SPYPOINT_PASSWORD);
    await client.authenticate();
    
    // Get cameras first to enrich photo data
    const cameras = await client.get_cameras();
    const photos = await client.get_photos(cameras, limit, tags);
    
    return json(photos);
  } catch (error) {
    console.error('Photo fetch error:', error);
    return json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
};