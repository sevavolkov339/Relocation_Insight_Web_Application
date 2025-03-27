const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

async function getCoordinates(address) {
    try {
        const encodedAddress = encodeURIComponent(address + ', Berlin, Germany');
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}`);
        const data = await response.json();
        
        if (data && data[0]) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }
        throw new Error('Location not found');
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

function calculateWalkingTime(distance) {
    const walkingSpeed = 5;
    const timeInHours = distance / walkingSpeed;
    return Math.round(timeInHours * 60);
}

app.post('/api/nearby-parks', async (req, res) => {
    try {
        const { query } = req.body;
        const coordinates = await getCoordinates(query);
        const { lat, lon } = coordinates;

        const overpassQuery = `
            [out:json][timeout:25];
            (
              node["leisure"="park"](around:2000,${lat},${lon});
              way["leisure"="park"](around:2000,${lat},${lon});
              relation["leisure"="park"](around:2000,${lat},${lon});
            );
            out body;
            >;
            out skel qt;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: overpassQuery
        });

        const data = await response.json();
        
        const parks = data.elements
            .filter(element => element.tags && element.tags.name)
            .map(element => {
                const distance = Math.sqrt(
                    Math.pow(element.lat - lat, 2) + 
                    Math.pow(element.lon - lon, 2)
                ) * 111.32;
                
                return {
                    name: element.tags.name,
                    distance: Math.round(distance * 1000),
                    walkingTime: calculateWalkingTime(distance)
                };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);

        res.json(parks);
    } catch (error) {
        console.error('Error fetching nearby parks:', error);
        res.status(500).json({ 
            error: 'Failed to fetch nearby parks',
            details: error.message
        });
    }
});

app.post('/api/nearby-supermarkets', async (req, res) => {
    try {
        const { query } = req.body;
        const coordinates = await getCoordinates(query);
        const { lat, lon } = coordinates;

        const overpassQuery = `
            [out:json][timeout:25];
            (
              node["shop"="supermarket"](around:2000,${lat},${lon});
              way["shop"="supermarket"](around:2000,${lat},${lon});
              relation["shop"="supermarket"](around:2000,${lat},${lon});
            );
            out body;
            >;
            out skel qt;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: overpassQuery
        });

        const data = await response.json();
        
        const supermarkets = data.elements
            .filter(element => element.tags && element.tags.name)
            .map(element => {
                const distance = Math.sqrt(
                    Math.pow(element.lat - lat, 2) + 
                    Math.pow(element.lon - lon, 2)
                ) * 111.32;
                
                return {
                    name: element.tags.name,
                    distance: Math.round(distance * 1000),
                    walkingTime: calculateWalkingTime(distance)
                };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);

        res.json(supermarkets);
    } catch (error) {
        console.error('Error fetching nearby supermarkets:', error);
        res.status(500).json({ 
            error: 'Failed to fetch nearby supermarkets',
            details: error.message
        });
    }
});

app.get('/api/coordinates', async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        const coordinates = await getCoordinates(address);
        res.json(coordinates);
    } catch (error) {
        console.error('Error getting coordinates:', error);
        res.status(500).json({ error: 'Failed to get coordinates' });
    }
});

app.get("/api/nearby-stations", async (req, res) => {
    const apiKeyGoogle = "AIzaSyD64dAKosxe-8p8oG720oH_GKGr_LMUpgY";
    const apiKeyGeoapify = "d4fe2d4e7c31411fa322b315cbde3e0a";
    const googlePlacesApiUrl = 'https://places.googleapis.com/v1/places:searchNearby';
    const radius = 10000;

    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    try {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const [busResponse, trainResponse, tramResponse] = await Promise.all([
            fetch(googlePlacesApiUrl, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "X-Goog-Api-Key": apiKeyGoogle,
                    "X-Goog-FieldMask": "places.location,places.displayName"
                },
                body: JSON.stringify({
                    "includedTypes": ["bus_stop"],
                    "maxResultCount": 1,
                    "locationRestriction": {
                        "circle": {
                            "center": { "latitude": lat, "longitude": lon },
                            "radius": radius
                        }
                    },
                    "rankPreference": "DISTANCE",
                })
            }),
            fetch(googlePlacesApiUrl, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "X-Goog-Api-Key": apiKeyGoogle,
                    "X-Goog-FieldMask": "places.location,places.displayName"
                },
                body: JSON.stringify({
                    "includedTypes": ["train_station"],
                    "maxResultCount": 1,
                    "locationRestriction": {
                        "circle": {
                            "center": { "latitude": lat, "longitude": lon },
                            "radius": radius
                        }
                    },
                    "rankPreference": "DISTANCE",
                })
            }),
            fetch(googlePlacesApiUrl, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "X-Goog-Api-Key": apiKeyGoogle,
                    "X-Goog-FieldMask": "places.location,places.displayName"
                },
                body: JSON.stringify({
                    "includedTypes": ["transit_station"],
                    "maxResultCount": 1,
                    "locationRestriction": {
                        "circle": {
                            "center": { "latitude": lat, "longitude": lon },
                            "radius": radius
                        }
                    },
                    "rankPreference": "DISTANCE",
                })
            })
        ]);

        const [busData, trainData, tramData] = await Promise.all([
            busResponse.json(),
            trainResponse.json(),
            tramResponse.json()
        ]);

        const routes = [];

        if (busData.places?.length > 0) {
            const nearestBusStation = busData.places[0];
            const busRouteResponse = await fetch(`https://api.geoapify.com/v1/routematrix?apiKey=${apiKeyGeoapify}`, {
                method: 'POST',
                headers: myHeaders,
                body: JSON.stringify({
                    "mode": "walk",
                    "sources": [{"location": [lat, lon]}],
                    "targets": [{"location": [nearestBusStation.location.latitude, nearestBusStation.location.longitude]}]
                })
            });
            const busRoute = await busRouteResponse.json();
            busRoute.stationName = nearestBusStation.displayName?.text || 'Unknown Bus Stop';
            routes.push(busRoute);
        }

        if (trainData.places?.length > 0) {
            const nearestTrainStation = trainData.places[0];
            const trainRouteResponse = await fetch(`https://api.geoapify.com/v1/routematrix?apiKey=${apiKeyGeoapify}`, {
                method: 'POST',
                headers: myHeaders,
                body: JSON.stringify({
                    "mode": "walk",
                    "sources": [{"location": [lat, lon]}],
                    "targets": [{"location": [nearestTrainStation.location.latitude, nearestTrainStation.location.longitude]}]
                })
            });
            const trainRoute = await trainRouteResponse.json();
            trainRoute.stationName = nearestTrainStation.displayName?.text || 'Unknown U-Bahn Station';
            routes.push(trainRoute);
        }

        if (tramData.places?.length > 0) {
            const nearestTramStation = tramData.places[0];
            const tramRouteResponse = await fetch(`https://api.geoapify.com/v1/routematrix?apiKey=${apiKeyGeoapify}`, {
                method: 'POST',
                headers: myHeaders,
                body: JSON.stringify({
                    "mode": "walk",
                    "sources": [{"location": [lat, lon]}],
                    "targets": [{"location": [nearestTramStation.location.latitude, nearestTramStation.location.longitude]}]
                })
            });
            const tramRoute = await tramRouteResponse.json();
            tramRoute.stationName = nearestTramStation.displayName?.text || 'Unknown Tram Station';
            routes.push(tramRoute);
        }

        res.json(routes);
    } catch (error) {
        console.error('Error calling maps API:', error);
        res.status(500).json({ error: 'Failed to fetch nearby stations' });
    }
});

app.post('/api/area-info', async (req, res) => {
    try {
        const { query } = req.body;
        const apiKey = 'bb7668364ba444cfb64c9ebaa433270b';
        const apiUrl = 'https://api.aimlapi.com/v1/chat/completions';
        const model = 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo';

        const prompt = `Write a complete, well-structured description of the area located at ${query} in Berlin. Include information about its character, notable features, and what makes it unique. The description should be approximately 100 words and must be a complete paragraph with proper punctuation. Do not cut off mid-sentence.`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch area info',
            details: error.message
        });
    }
});

app.post('/api/eco-info', async (req, res) => {
    try {
        const { query } = req.body;
        const apiKey = 'bb7668364ba444cfb64c9ebaa433270b';
        const apiUrl = 'https://api.aimlapi.com/v1/chat/completions';
        const model = 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo';

        const prompt = `Write a complete, well-structured description of the eco-friendliness of the area located at ${query} in Berlin. Focus on green spaces, sustainability initiatives, and environmental features. The description should be approximately 100 words and must be a complete paragraph with proper punctuation. Do not cut off mid-sentence.`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch eco info',
            details: error.message
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        details: err.message
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 