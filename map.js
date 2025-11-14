import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1IjoidGl5ZXIiLCJhIjoiY21oeHhjbmNiMDYwYjJqcHV3YzZzcjdxdSJ9.NfHaJFLVUPK5zfvEVW-U-A';

const map = new mapboxgl.Map({
  container: 'map', 
  style: 'mapbox://styles/mapbox/streets-v12', 
  center: [-71.09415, 42.36027], 
  zoom: 12, 
  minZoom: 5, 
  maxZoom: 18, 
});


function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
  const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);
  return stations.map(station => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips
    : trips.filter(trip => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
}

let stationsRaw = [];
let tripsAll = [];
let circles;

const svg = d3.select('#map').select('svg');

let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);


map.on('load', async () => {
  const lineStyle = {
    'line-color': 'green',
    'line-width': 3,
    'line-opacity': 0.4,
  };
  map.addSource('boston_route', {
    type: 'geojson',
    data:
      'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });
  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: lineStyle,
  });
  map.addSource('cambridge_route', {
    type: 'geojson',
    data:
      'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });
  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: lineStyle,
  });

  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const trafficUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
    const jsonData = await d3.json(jsonurl);
    stationsRaw = jsonData.data.stations; 
    
    tripsAll = await d3.csv(
      trafficUrl,
      trip => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
        return trip;
      }
    );

    const initialStations = computeStationTraffic(stationsRaw, tripsAll);

    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(initialStations, d => d.totalTraffic)])
      .range([0, 25]);

    circles = svg
      .selectAll('circle')
      .data(initialStations, d => d.short_name)
      .enter()
      .append('circle')
      .attr('r', d => radiusScale(d.totalTraffic))
      .attr('fill', 'steelblue')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6)
      .append('title') 
      .text(d => 
        `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
      )
      .select(function() { return this.parentNode; })
      .style('--departure-ratio', (d) => stationFlow(d.departures / d.totalTraffic),
    );

    function updatePositions() {
      circles
        .attr('cx', d => getCoords(d).cx)
        .attr('cy', d => getCoords(d).cy);
    }

    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    function updateScatterPlot(newTimeFilter) {
      const filteredTrips = filterTripsbyTime(tripsAll, newTimeFilter);
      const filteredStations = computeStationTraffic(stationsRaw, filteredTrips); 
      
      newTimeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

      circles = svg
        .selectAll('circle')
        .data(filteredStations, d => d.short_name) 
        .join('circle')
        .attr('r', d => radiusScale(d.totalTraffic))
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6)
        .style('--departure-ratio', d => stationFlow(
            d.totalTraffic > 0 ? d.departures / d.totalTraffic : 0))

        
      
      circles.select('title')
        .text(d => 
          `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
        );

      updatePositions(); 
      
    }

    function updateTimeDisplay() {
      const timeFilter = Number(timeSlider.value);
      if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
      } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
      }
      updateScatterPlot(timeFilter);
    }
    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();

    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);
    updatePositions();
  } catch (error) {
    console.error('Error loading data:', error);
  }
});