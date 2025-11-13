// import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// // Check that Mapbox GL JS is loaded
// console.log('Mapbox GL JS Loaded:', mapboxgl);

// mapboxgl.accessToken = 'pk.eyJ1IjoidGl5ZXIiLCJhIjoiY21oeHhjbmNiMDYwYjJqcHV3YzZzcjdxdSJ9.NfHaJFLVUPK5zfvEVW-U-A';

// const map = new mapboxgl.Map({
//   container: 'map',
//   style: 'mapbox://styles/mapbox/streets-v12',
//   center: [-71.09415, 42.36027],
//   zoom: 12,
//   minZoom: 5,
//   maxZoom: 18,
// });


// map.on('load', async () => {
//   // Add Boston bike lanes as a source
//   map.addSource('boston_route', {
//     type: 'geojson',
//     data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
//   });

//   // Add Boston bike lanes as a line layer
//   map.addLayer({
//     id: 'bike-lanes',
//     type: 'line',
//     source: 'boston_route',
//     paint: {
//       'line-color': 'green',
//       'line-width': 3,
//       'line-opacity': 0.4,
//     }
//   });
//     // Add Cambridge bike lanes as a source
//   map.addSource('cambridge_route', {
//     type: 'geojson',
//     data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
//   });

//   // Add Cambridge bike lanes as a line layer
//   map.addLayer({
//     id: 'bike-lanes-cambridge',
//     type: 'line',
//     source: 'cambridge_route',
//     paint: {
//       'line-color': 'green',
//       'line-width': 3,
//       'line-opacity': 0.4,
//     }
//   });

//   const svg = d3.select('#map').select('svg');
//   function getCoords(station) {
//   // Note: Some files use 'lat'/'long', others use 'Lat'/'Long'
//   const point = new mapboxgl.LngLat(+station.Long, +station.Lat);
//   const { x, y } = map.project(point);
//   return { cx: x, cy: y };
// }

// try {
//   const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
//   const jsonData = await d3.json(jsonurl);
//   const stations = jsonData.data.stations;
//   console.log('Stations Array:', stations);

//   // Append circles for each station
//   const circles = svg
//     .selectAll('circle')
//     .data(stations)
//     .enter()
//     .append('circle')
//     .attr('r', 7)
//     .attr('fill', 'steelblue')
//     .attr('stroke', 'white')
//     .attr('stroke-width', 1)
//     .attr('opacity', 0.85);

//   // Function to update positions
//   function updatePositions() {
//     circles
//       .attr('cx', d => getCoords(d).cx)
//       .attr('cy', d => getCoords(d).cy);
//   }

//   // Initial marker placement
//   updatePositions();

//   // Keep markers synced with map movements/zooms
//   map.on('move', updatePositions);
//   map.on('zoom', updatePositions);
//   map.on('resize', updatePositions);
//   map.on('moveend', updatePositions);

// } catch (error) {
//   console.error('Error loading JSON:', error);
// }

// });

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// --- Step 1.3: Initialize Map ---

mapboxgl.accessToken = 'pk.eyJ1IjoidGl5ZXIiLCJhIjoiY21oeHhjbmNiMDYwYjJqcHV3YzZzcjdxdSJ9.NfHaJFLVUPK5zfvEVW-U-A';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027], // Center on Boston area
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

// --- Step 3.3: Define getCoords globally for dynamic updates ---

// Select the SVG element inside the map container globally
const svg = d3.select('#map').select('svg');

// This function needs to be global (outside map.on('load')) to be referenced 
// correctly by the event listeners for move/zoom/etc.
function getCoords(station) {
  // Mapbox LngLat constructor expects (longitude, latitude)
  // The bluebikes data uses 'Long' and 'Lat' (capitalized)
  const point = new mapboxgl.LngLat(+station.Long, +station.Lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}


// --- Step 2 & 3: Add Layers and Data on Map Load ---

map.on('load', async () => {
  // --- Step 2: Add Bike Lanes ---

  const lineStyle = { // Optional: Centralized style object for easier tweaking
    'line-color': 'green',
    'line-width': 3,
    'line-opacity': 0.4,
  };

  // Boston bike lanes
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });
  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: lineStyle,
  });

  // Cambridge bike lanes
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });
  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: lineStyle,
  });


  // --- Step 3: Add Bluebikes Stations (D3/SVG) ---

  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    const stations = jsonData.data.stations;
    console.log('Stations Array:', stations);

    // Append circles for each station
    const circles = svg
      .selectAll('circle')
      .data(stations)
      .enter()
      .append('circle')
      .attr('r', 7) // Radius
      .attr('fill', 'steelblue') 
      .attr('stroke', 'white') 
      .attr('stroke-width', 1) 
      .attr('opacity', 0.85);

    // Function to update positions
    function updatePositions() {
      circles
        .attr('cx', d => getCoords(d).cx)
        .attr('cy', d => getCoords(d).cy);
    }

    // Initial marker placement
    updatePositions();

    // Keep markers synced with map movements/zooms
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

  } catch (error) {
    console.error('Error loading JSON:', error);
  }

});