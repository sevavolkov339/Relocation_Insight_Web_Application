document.getElementById('search-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const searchInput = document.getElementById('search-input').value;
    fetchAreaDetails(searchInput);
});

function fetchAreaDetails(query) {
    // Simulate API call to fetch area details
    const results = [
        {
            name: 'Berlin Mitte',
            description: 'A central area in Berlin with rich history and culture.',
            generalInfo: 'This area is known for its vibrant culture and historical landmarks.',
            transport: [
                { station: 'Bus Stop A', time: '3 minutes', logo: 'Bus_Icon.png' },
                { station: 'U-Bahn Station B', time: '7 minutes', logo: 'Subway_Icon.png' },
                { station: 'Tram Station C', time: '10 minutes', logo: 'Tram_Icon.png' }
            ],
            supermarkets: [
                { time: '5 minutes', logo: 'rewe.png' },
                { time: '3 minutes', logo: 'dm.png' },
                { time: '7 minutes', logo: 'edeka.png' }
            ],
            ecoFriendly: {
                description: 'Highly eco-friendly with multiple green spaces.',
                parks: [
                    { name: 'Tiergarten', distance: '1 km', time: '12 minutes' },
                    { name: 'Monbijou Park', distance: '0.5 km', time: '6 minutes' }
                ],
                parking: 'Limited parking available'
            }
        }
    ];

    displayResults(results);
}

function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    results.forEach(result => {
        const resultElement = document.createElement('div');
        resultElement.className = 'result-item';
        resultElement.innerHTML = `
            <h2>${result.name}</h2>
            <p>${result.description}</p>

            <!-- General Info -->
            <h3>General Info</h3>
            <p>${result.generalInfo}</p>

            <!-- Transport -->
            <h3>Transport</h3>
            <ul>
                ${result.transport.map(t => `
                    <li>
                        <img src="ICONS/${t.logo}" alt="Transport Logo"> 
                        ${t.station} (${t.time})
                    </li>
                `).join('')}
            </ul>

            <!-- Close Supermarkets -->
            <h3>Close Supermarkets</h3>
            <ul>
                ${result.supermarkets.map(s => `
                    <li>
                        <img src="ICONS/${s.logo}" alt="Supermarket Logo"> 
                        ${s.time} by foot
                    </li>
                `).join('')}
            </ul>

            <!-- Eco-Friendliness -->
            <h3><img src="ICONS/Eco_Icon.png" alt="Eco Icon"> Eco-Friendliness</h3>
            <p>${result.ecoFriendly.description}</p>

            <!-- Nearby Parks -->
            <h3><img src="ICONS/Park_Icon.png" alt="Park Icon"> Nearby Parks</h3>
            <ul>
                ${result.ecoFriendly.parks.map(p => `
                    <li>${p.name}: ${p.distance} (${p.time} by walking)</li>
                `).join('')}
            </ul>
        `;
        resultsContainer.appendChild(resultElement);
    });
}