import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1IjoidGl5ZXIiLCJhIjoiY21oeHhjbmNiMDYwYjJqcHV3YzZzcjdxdSJ9.NfHaJFLVUPK5zfvEVW-U-A';

const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});

map.on('load', async () => {
  // Add Boston bike lanes as a source
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  // Add Boston bike lanes as a line layer
  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': 'green',
      'line-width': 3,
      'line-opacity': 0.4,
    }
  });

  // Add Cambridge bike lanes as a source
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  // Add Cambridge bike lanes as a line layer
  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': 'green',
      'line-width': 3,
      'line-opacity': 0.4,
    }
  });

  // Select SVG overlay for markers
  const svg = d3.select('#map').select('svg');
  function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
  }

  try {
    // Load station positions
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    let stations = jsonData.data.stations;
    console.log('Stations Array:', stations);

    // Load trip/traffic data
    const trafficUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
    const trips = await d3.csv(trafficUrl);

    // Calculate arrivals, departures, total traffic
    const departures = d3.rollup(
      trips,
      v => v.length,
      d => d.start_station_id
    );
    const arrivals = d3.rollup(
      trips,
      v => v.length,
      d => d.end_station_id
    );

    stations = stations.map(station => {
      let id = station.short_name;
      station.arrivals = arrivals.get(id) ?? 0;
      station.departures = departures.get(id) ?? 0;
      station.totalTraffic = station.arrivals + station.departures;
      return station;
    });
    console.log('Stations with traffic:', stations);

    // Scale marker radius by total traffic
    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(stations, d => d.totalTraffic)])
      .range([0, 25]);
        
    const circles = svg
        .selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', d => radiusScale(d.totalTraffic))
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6)
        .each(function (d) {
            d3.select(this)
            .append('title')
            .text(
                `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
            );
        });



    function updatePositions() {
      circles
        .attr('cx', d => getCoords(d).cx)
        .attr('cy', d => getCoords(d).cy);
    }
    updatePositions();
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

  } catch (error) {
    console.error('Error loading JSON:', error);
  }
});
