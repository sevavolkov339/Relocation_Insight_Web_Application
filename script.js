
document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const searchInput = document.getElementById('search-input');
    fetchAreaDetails(searchInput)
});

async function fetchAreaDetails(query) {
    try {
        //coordinates for the search
        const coordinatesResponse = await fetch(`http://localhost:3000/api/coordinates?address=${encodeURIComponent(query)}`);
        const coordinates = await coordinatesResponse.json();
        
        if (!coordinates.lat || !coordinates.lon) {
            throw new Error('Could not find coordinates for the specified location');
        }

        const areaDetails = {
            name: query,
            description: '',
            generalInfo: '',
            transport: [
                { station: 'Bus Stop', time: "No bus station in range", logo: 'Bus_Icon.png' },
                { station: 'U-Bahn Station', time: "No U-Bahn station in range", logo: 'Subway_Icon.png' },
                { station: 'Tram Station', time: "No tram station in range", logo: 'Tram_Icon.png' }
            ],
            supermarkets: [],
            ecoFriendly: {
                description: '',
                parks: [],
                parking: 'Limited parking available'
            }
        };

        try {
            const stationsResponse = await fetch(`http://localhost:3000/api/nearby-stations?lat=${coordinates.lat}&lon=${coordinates.lon}`);
            const stationsData = await stationsResponse.json();
            
            if (stationsData[0]) {
                areaDetails.transport[0].time = `${stationsData[0].sources_to_targets[0][0].distance} meters`;
                areaDetails.transport[0].station = `Bus Stop ${stationsData[0].stationName}`;
            }
            if (stationsData[1]) {
                areaDetails.transport[1].time = `${stationsData[1].sources_to_targets[0][0].distance} meters`;
                areaDetails.transport[1].station = `U-Bahn Station ${stationsData[1].stationName}`;
            }
            if (stationsData[2]) {
                areaDetails.transport[2].time = `${stationsData[2].sources_to_targets[0][0].distance} meters`;
                areaDetails.transport[2].station = `Tram Station ${stationsData[2].stationName}`;
            }
        } catch (error) {
            console.error('Error fetching nearby stations:', error);
        }
    } catch (error) {
        console.error('Error fetching area details:', error);
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>Failed to fetch information about ${query}. Please try again later.</p>
                <p class="error-details">${error.message}</p>
            </div>
        `;
        return null;
    }
}

function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    //results is array
    const resultsArray = Array.isArray(results) ? results : [results];

    resultsArray.forEach(result => {
        const resultElement = document.createElement('div');
        resultElement.className = 'result-item';
        resultElement.innerHTML = `
            <h2>«${result.name}»</h2>
            <p>${result.description}</p>

            <h3>General Info</h3>
            <p>${result.generalInfo}</p>

            <h3>Transport</h3>
            <ul>
                ${result.transport.map(t => `
                    <li>
                        <div class="transport-header">
                            <img src="ICONS/${t.logo}" alt="Transport Logo"> 
                            ${t.station} (${t.time})
                            <span class="arrow arrow-down">&#9660;</span> <!-- Down arrow by default -->
                        </div>
                        <div class="transport-details" style="display: none;"> <!-- Hidden by default -->
                            <p>Info about routes of ${t.station}.</p>
                        </div>
                    </li>
                `).join('')}
            </ul>

            <h3>Close Supermarkets</h3>
            <ul>
                ${result.supermarkets.map(s => `
                    <li>
                        <span class="supermarket-name">${s.name}</span> (${s.time} by foot)
                    </li>
                `).join('')}
            </ul>

            <h3><img src="ICONS/Eco_Icon.png" alt="Eco Icon"> Eco-Friendliness</h3>
            <p>${result.ecoFriendly.description}</p>

            <h3><img src="ICONS/Park_Icon.png" alt="Park Icon"> Nearby Parks</h3>
            <ul>
                ${result.ecoFriendly.parks.map(p => `
                    <li><span class="park-name">${p.name}</span></li>
                `).join('')}
            </ul>
        `;
        resultsContainer.appendChild(resultElement);
    });
}

