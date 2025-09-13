<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Camera, MapPin, Image, RefreshCw, Activity } from 'lucide-svelte';
  import type { Camera as CameraType, Photo } from '$lib/spypoint';
  
  let cameras: CameraType[] = [];
  let photos: Photo[] = [];
  let loading = true;
  let error: string | null = null;
  let refreshing = false;
  
  async function fetch_data() {
    try {
      refreshing = true;
      const [cameras_res, photos_res] = await Promise.all([
        fetch('/api/cameras'),
        fetch('/api/photos?limit=20')
      ]);
      
      if (!cameras_res.ok || !photos_res.ok) {
        throw new Error('Failed to fetch data');
      }
      
      cameras = await cameras_res.json();
      photos = await photos_res.json();
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data';
    } finally {
      loading = false;
      refreshing = false;
    }
  }
  
  function format_time(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
  
  function get_tag_color(tag: string) {
    const colors: Record<string, string> = {
      'deer': 'bg-amber-500',
      'human': 'bg-red-500',
      'night': 'bg-blue-500',
      'day': 'bg-yellow-500',
      'buck': 'bg-green-500'
    };
    return colors[tag.toLowerCase()] || 'bg-gray-500';
  }
  
  onMount(() => {
    fetch_data();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetch_data, 60000);
    return () => clearInterval(interval);
  });
  
  $: online_cameras = cameras.filter(c => c.is_online);
  $: gps_cameras = cameras.filter(c => c.coordinates);
  $: recent_activity = photos.slice(0, 5);
</script>

<div class="min-h-screen bg-black">
  <!-- Fixed Header -->
  <header class="sticky top-0 z-50 w-full border-b bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
    <div class="container flex h-14 items-center px-4">
      <div class="flex flex-1 items-center justify-between">
        <h1 class="text-lg font-bold text-white">SPYPOINT</h1>
        <Button 
          variant="ghost" 
          size="icon"
          on:click={fetch_data}
          disabled={refreshing}
          class="text-white"
        >
          <RefreshCw class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
        </Button>
      </div>
    </div>
  </header>
  
  {#if loading}
    <div class="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div class="text-center">
        <div class="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto"></div>
        <p class="text-sm text-gray-400">Loading cameras...</p>
      </div>
    </div>
  {:else if error}
    <div class="p-4">
      <Card class="border-red-800 bg-red-900/20">
        <CardHeader>
          <CardTitle class="text-red-400">Error</CardTitle>
          <CardDescription class="text-red-300">{error}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  {:else}
    <div class="container px-4 py-4 space-y-4">
      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-2">
        <Card class="border-green-800 bg-green-900/20">
          <CardContent class="p-4 text-center">
            <div class="text-2xl font-bold text-green-400">{online_cameras.length}</div>
            <p class="text-xs text-gray-400">Online</p>
          </CardContent>
        </Card>
        
        <Card class="border-blue-800 bg-blue-900/20">
          <CardContent class="p-4 text-center">
            <div class="text-2xl font-bold text-blue-400">{cameras.length}</div>
            <p class="text-xs text-gray-400">Cameras</p>
          </CardContent>
        </Card>
        
        <Card class="border-amber-800 bg-amber-900/20">
          <CardContent class="p-4 text-center">
            <div class="text-2xl font-bold text-amber-400">{photos.length}</div>
            <p class="text-xs text-gray-400">Photos</p>
          </CardContent>
        </Card>
      </div>
      
      <!-- Main Content Tabs -->
      <Tabs defaultValue="cameras" class="w-full">
        <TabsList class="grid w-full grid-cols-3 bg-gray-900">
          <TabsTrigger value="cameras" class="data-[state=active]:bg-gray-800">
            <Camera class="h-4 w-4 mr-2" />
            Cameras
          </TabsTrigger>
          <TabsTrigger value="activity" class="data-[state=active]:bg-gray-800">
            <Activity class="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="map" class="data-[state=active]:bg-gray-800">
            <MapPin class="h-4 w-4 mr-2" />
            Map
          </TabsTrigger>
        </TabsList>
        
        <!-- Cameras Tab -->
        <TabsContent value="cameras" class="space-y-2 mt-4">
          {#each cameras as camera}
            <Card class="bg-gray-900 border-gray-800">
              <CardHeader class="pb-3">
                <div class="flex items-start justify-between">
                  <div>
                    <CardTitle class="text-base text-white">
                      {camera.name}
                    </CardTitle>
                    <CardDescription>
                      {camera.model} • Updated {format_time(camera.last_update)}
                    </CardDescription>
                  </div>
                  <div class="flex items-center gap-2">
                    {#if camera.coordinates}
                      <Badge variant="outline" class="border-blue-800 text-blue-400">
                        <MapPin class="h-3 w-3 mr-1" />
                        GPS
                      </Badge>
                    {/if}
                    <div class="h-2 w-2 rounded-full {camera.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}"></div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          {/each}
        </TabsContent>
        
        <!-- Activity Tab -->
        <TabsContent value="activity" class="space-y-2 mt-4">
          {#each recent_activity as photo}
            <Card class="bg-gray-900 border-gray-800">
              <CardHeader class="pb-3">
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <CardTitle class="text-sm text-white">
                      {photo.camera_name || 'Unknown Camera'}
                    </CardTitle>
                    <span class="text-xs text-gray-400">
                      {format_time(photo.timestamp)}
                    </span>
                  </div>
                  {#if photo.tags.length > 0}
                    <div class="flex flex-wrap gap-1">
                      {#each photo.tags as tag}
                        <Badge class="{get_tag_color(tag)} text-white text-xs">
                          {tag}
                        </Badge>
                      {/each}
                    </div>
                  {/if}
                  {#if photo.url_small}
                    <img 
                      src={photo.url_small} 
                      alt={photo.filename}
                      class="w-full rounded-md"
                      loading="lazy"
                    />
                  {/if}
                </div>
              </CardHeader>
            </Card>
          {/each}
        </TabsContent>
        
        <!-- Map Tab -->
        <TabsContent value="map" class="mt-4">
          <Card class="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Trail Camera Map</CardTitle>
              <CardDescription>
                {gps_cameras.length} cameras with GPS coordinates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/map" class="block">
                <Button variant="outline" class="w-full">
                  <MapPin class="h-4 w-4 mr-2" />
                  Open Full Map
                </Button>
              </a>
            </CardContent>
          </Card>
          
          <!-- Camera GPS List -->
          <div class="mt-4 space-y-2">
            {#each gps_cameras as camera}
              <Card class="bg-gray-900 border-gray-800">
                <CardContent class="p-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-medium text-white">{camera.name}</p>
                      {#if camera.coordinates}
                        <p class="text-xs text-gray-400">
                          {camera.coordinates.latitude.toFixed(6)}°, {camera.coordinates.longitude.toFixed(6)}°
                        </p>
                      {/if}
                    </div>
                    <a 
                      href="https://maps.google.com/?q={camera.coordinates?.latitude},{camera.coordinates?.longitude}"
                      target="_blank"
                      rel="noopener"
                    >
                      <Button size="sm" variant="ghost">
                        <MapPin class="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            {/each}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    background-color: black;
    color: white;
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
  }
</style>