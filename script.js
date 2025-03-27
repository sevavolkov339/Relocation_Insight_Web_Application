const CONFIG = {
    enableAI: true,
    defaultGeneralInfo: 'General information about this area will be displayed here when AI generation is enabled.',
    defaultEcoDescription: 'Eco-friendliness information will be displayed here when AI generation is enabled.'
};

document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const searchInput = document.getElementById('search-input');
    const resultsDiv = document.getElementById('results');
    const loadingSpinner = document.getElementById('loading-spinner');
    

    loadingSpinner.style.display = 'flex';
    resultsDiv.innerHTML = '';
    
    try {
        const areaDetails = await fetchAreaDetails(searchInput.value);
        displayResults(areaDetails);
    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        loadingSpinner.style.display = 'none';
    }
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

        try {
            //info about the area
            areaDetails.generalInfo = CONFIG.enableAI ? 
                await generateAreaInfo(query) : 
                CONFIG.defaultGeneralInfo;
            
            //eco friendliness description
            areaDetails.ecoFriendly.description = CONFIG.enableAI ? 
                await generateEcoDescription(query) : 
                CONFIG.defaultEcoDescription;
            
            //parks
            areaDetails.ecoFriendly.parks = await fetchNearbyParks(query);
            //supermarkets
            areaDetails.supermarkets = await fetchNearbySupermarkets(query);
            
            return areaDetails;
        } catch (error) {
            console.error('Error fetching area details:', error);
            //error message to user
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

async function generateAreaInfo(query) {
    try {
        console.log('Sending area info request for:', query);
        const response = await fetch('/api/area-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error response:', errorData);
            throw new Error(errorData.details || `API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Area info response:', data);

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Invalid response structure:', data);
            throw new Error('Invalid response structure from API');
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error calling API for area info:', error);
        return 'Information about this area is currently unavailable.';
    }
}

async function generateEcoDescription(query) {
    try {
        console.log('Sending eco info request for:', query);
        const response = await fetch('/api/eco-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error response:', errorData);
            throw new Error(errorData.details || `API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Eco info response:', data);

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Invalid response structure:', data);
            throw new Error('Invalid response structure from API');
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error calling API for eco info:', error);
        return 'Eco-friendliness information is currently unavailable.';
    }
}

async function fetchNearbyParks(query) {
    try {
        const response = await fetch('/api/nearby-parks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const parks = await response.json();
        //debug 
        console.log('Received parks data:', parks); 

        return parks.map(park => ({
            name: park.name,
            distance: `${(park.distance / 1000).toFixed(1)} km`,
            time: `${park.walkingTime} minutes`
        }));
    } catch (error) {
        console.error('Error fetching nearby parks:', error);
        return [];
    }
}

async function fetchNearbySupermarkets(query) {
    try {
        const response = await fetch('/api/nearby-supermarkets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const supermarkets = await response.json();
        return supermarkets.map(supermarket => ({
            name: supermarket.name,
            time: `${supermarket.walkingTime} minutes`,
            logo: 'rewe.png' //default logo for now
        }));
    } catch (error) {
        console.error('Error fetching nearby supermarkets:', error);
        return [];
    }
}

async function fetchNearbyStations(){
    
    
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

    const transportHeaders = document.querySelectorAll('.transport-header');
    transportHeaders.forEach(header => {
        header.addEventListener('click', function () {
            //transport details
            const details = this.nextElementSibling;
            details.style.display = details.style.display === 'none' ? 'block' : 'none';

            const arrow = this.querySelector('.arrow');
            arrow.classList.toggle('arrow-down');
            arrow.classList.toggle('arrow-up');
        });
    });
}

//navigation
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    function showSection(sectionId) {
        console.log('Showing section:', sectionId); // Debug log
        
        sections.forEach(section => {
            section.classList.remove('active');
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');
            //debug
            console.log('Section found and activated:', sectionId);
        } else {
            console.error('Section not found:', sectionId); 
        }

        const selectedLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (selectedLink) {
            selectedLink.classList.add('active');
            //debug
            console.log('Nav link activated:', sectionId);
        } else {
            console.error('Nav link not found:', sectionId); 
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            console.log('Nav link clicked:', sectionId); // Debug log
            showSection(sectionId);
        });
    });

    showSection('main');
});