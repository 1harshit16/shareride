
const STORAGE_KEY = "shareRideRides";
const CAR_CO2_KG_PER_KM = 0.14413;

const findForm = document.getElementById("find-form");
const offerForm = document.getElementById("offer-form");
const results = document.getElementById("ride-results");

const findDate = document.getElementById("find-date");
const findTime = document.getElementById("find-time");
const offerDate = document.getElementById("offer-date");
const offerTime = document.getElementById("offer-time");

// Return a date in YYYY-MM-DD format.
function getDateAfter(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Prepare sample rides so the website can be tested.
function createSampleRides() {
    const tomorrow = getDateAfter(1);

    return [
        {
            id: "demo-1",
            name: "Alex (Demo)",
            origin: "Whitefield",
            destination: "Electronic City",
            date: tomorrow,
            time: "08:30",
            seats: 2,
            sample: true
        },
        {
            id: "demo-2",
            name: "Sam (Demo)",
            origin: "Koramangala",
            destination: "Manyata Tech Park",
            date: tomorrow,
            time: "09:00",
            seats: 1,
            sample: true
        },
        {
            id: "demo-3",
            name: "Riya (Demo)",
            origin: "Indiranagar",
            destination: "MG Road",
            date: tomorrow,
            time: "08:45",
            seats: 3,
            sample: true
        }
    ];
}

// Load rides saved in this browser.
function loadRides() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === null) {
        const samples = createSampleRides();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
        return samples;
    }

    try {
        const rides = JSON.parse(saved);
        return Array.isArray(rides) ? rides : [];
    } catch (error) {
        console.error("Could not load saved rides:", error);
        return [];
    }
}

// Save rides in this browser.
function saveRides(rides) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rides));
}

// Make location comparisons case-insensitive.
function normalizeLocation(location) {
    return location.trim().toLowerCase();
}

function locationMatches(listedLocation, requestedLocation) {
    const listed = normalizeLocation(listedLocation);
    const requested = normalizeLocation(requestedLocation);

    if (!listed || !requested) {
        return false;
    }

    // Exact match
    if (listed === requested) {
        return true;
    }

    // Allow longer location names containing the searched location.
    // The four-character minimum avoids overly broad short matches.
    if (listed.length < 4 || requested.length < 4) {
        return false;
    }

    return listed.includes(requested) ||
           requested.includes(listed);
}


// Convert HH:MM into minutes after midnight.
function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

// Show matching rides on the page.

function displayResults(matches) {
    results.replaceChildren();

    if (matches.length === 0) {
        const message = document.createElement("p");
        message.textContent =
            "No matching rides found. Try another route, date, or time.";
        results.appendChild(message);
        return;
    }

    matches.forEach(function (ride) {
        const card = document.createElement("article");
        card.className = "feature-card";

        const heading = document.createElement("h3");
        heading.textContent =
            `${ride.origin} → ${ride.destination}`;

        const driver = document.createElement("p");
        driver.textContent = `Driver: ${ride.name}`;

        const timing = document.createElement("p");
        timing.textContent =
            `Date: ${ride.date} | Departure: ${ride.time}`;

        const seats = document.createElement("p");

        const distanceInfo = document.createElement("p");
        const distanceKm = Number(ride.distanceKm);

        if (Number.isFinite(distanceKm) && distanceKm > 0) {
            distanceInfo.textContent =
                `Approximate one-way distance: ${distanceKm} km`;
        } else {
            distanceInfo.textContent =
                "Approximate distance: Not provided";
        }

        const emissionInfo = document.createElement("p");

        if (ride.sample) {
            emissionInfo.textContent =
                "Environmental estimate unavailable for sample rides.";
        } else if (Number.isFinite(distanceKm) && distanceKm > 0) {
            const estimatedCO2 = distanceKm * CAR_CO2_KG_PER_KM;

            emissionInfo.textContent =
                `Illustrative potential CO2 avoided: ` +
                `${estimatedCO2.toFixed(2)} kg, if this trip replaces ` +
                `a separate car journey.`;
        } else {
            emissionInfo.textContent =
                "Add a valid distance to estimate potential impact.";
        }

        seats.textContent = `Available seats: ${ride.seats}`;

        const note = document.createElement("p");
        note.textContent = ride.sample
            ? "Sample demo ride — not a real booking."
            : "Prototype listing — booking is not enabled yet.";

        const requestButton = document.createElement("button");
        requestButton.type = "button";
        requestButton.className = "btn btn-primary";
        requestButton.textContent =
            Number(ride.seats) > 0
                ? "Request a Seat"
                : "No Seats Available";
        requestButton.disabled = Number(ride.seats) <= 0;

        requestButton.addEventListener("click", function () {
            const currentRides = loadRides();

            const currentRide = currentRides.find(function (item) {
                return item.id === ride.id;
            });

            if (!currentRide || Number(currentRide.seats) <= 0) {
                note.textContent = "Sorry, no seats are available.";
                requestButton.textContent = "No Seats Available";
                requestButton.disabled = true;
                return;
            }

            currentRide.seats = Number(currentRide.seats) - 1;
            saveRides(currentRides);
            updateDashboard();

            seats.textContent =
                `Available seats: ${currentRide.seats}`;

            note.textContent =
                "Demo request recorded locally. No real booking " +
                "or driver notification has occurred.";

            requestButton.textContent = "Request Recorded";
            requestButton.disabled = true;
        });


        card.append(
            heading,
            driver,
            timing,
            distanceInfo,
            emissionInfo,
            seats,
            note,
            requestButton
        );


        results.appendChild(card);
    });
}


// Search by route, date, and departure time.
findForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const origin = normalizeLocation(
        document.getElementById("find-origin").value
    );

    const destination = normalizeLocation(
        document.getElementById("find-destination").value
    );

    const date = findDate.value;
    const time = findTime.value;

    const rides = loadRides();

        const matches = rides
            .filter(function (ride) {
                const sameOrigin =
                    locationMatches(ride.origin, origin);

                const sameDestination =
                    locationMatches(ride.destination, destination);

                const sameDate = ride.date === date;

                const timeDifference = Math.abs(
                    timeToMinutes(ride.time) -
                    timeToMinutes(time)
                );

                return sameOrigin &&
                    sameDestination &&
                    sameDate &&
                    timeDifference <= 90 &&
                    Number(ride.seats) > 0;
            })
            .sort(function (a, b) {
                const differenceA = Math.abs(
                    timeToMinutes(a.time) -
                    timeToMinutes(time)
                );

                const differenceB = Math.abs(
                    timeToMinutes(b.time) -
                    timeToMinutes(time)
                );

                return differenceA - differenceB;
            });

        displayResults(matches);
});

// Display feedback after a ride is offered.
const offerFeedback = document.createElement("p");
offerFeedback.className = "form-feedback";
offerFeedback.setAttribute("aria-live", "polite");
offerForm.insertAdjacentElement("afterend", offerFeedback);

// Publish a ride offer.
offerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const ride = {
        id: String(Date.now()),
        name: document.getElementById("driver-name").value.trim(),
        origin: document.getElementById("offer-origin").value.trim(),
        destination: document.getElementById("offer-destination").value.trim(),
        date: offerDate.value,
        time: offerTime.value,
        distanceKm: Number(document.getElementById("offer-distance").value),
        seats: Number(document.getElementById("offer-seats").value),
        sample: false
    };




    if (
        !ride.name ||
        !ride.origin ||
        !ride.destination ||
        !ride.date ||
        ride.date < getDateAfter(0) ||
        !ride.time ||
        !Number.isFinite(ride.distanceKm) ||
        ride.distanceKm < 1 ||
        ride.distanceKm > 500 ||
        ride.seats < 1
    ) {
        offerFeedback.textContent =
            "Please complete all fields correctly. Distance must be between 1 and 500 km.";
        return;
    }


    const rides = loadRides();
    rides.push(ride);
    saveRides(rides);
    updateDashboard();

    offerFeedback.textContent =
        "Ride offer saved successfully in this browser's demo.";

    offerForm.reset();
    offerDate.value = getDateAfter(1);
    offerTime.value = "08:00";
});

// Set convenient default travel dates and times.
// Set minimum travel dates and convenient defaults.
const today = getDateAfter(0);

findDate.min = today;
offerDate.min = today;

if (!findDate.value || findDate.value < today) {
    findDate.value = getDateAfter(1);
}

if (!offerDate.value || offerDate.value < today) {
    offerDate.value = getDateAfter(1);
}

findTime.value = "08:00";
offerTime.value = "08:00";


// Keep the impact figures honest: offers are not completed trips.


function updateDashboard() {
    const rides = loadRides();

    // Count all saved ride listings, including demo listings.
    const totalListings = rides.length;

    // Estimate potential CO2 avoided for non-demo rides
    // that have a valid recorded distance.
    const potentialCO2 = rides.reduce(function (total, ride) {
        if (ride.sample) {
            return total;
        }

        const distance = Number(ride.distanceKm);

        if (!Number.isFinite(distance) || distance <= 0) {
            return total;
        }

        return total + distance * CAR_CO2_KG_PER_KM;
    }, 0);

    document.getElementById("shared-count").textContent =
        String(totalListings);

    document.getElementById("emissions-saved").textContent =
        potentialCO2.toFixed(2) + " kg";

    const impactCards = document.querySelectorAll(
        "#environment .feature-card"
    );

    if (impactCards.length >= 2) {
        impactCards[0].querySelector("p").textContent =
            "Ride listings saved in this browser";

        impactCards[1].querySelector("p").textContent =
            "Illustrative potential CO2 avoided";
    }

    document.querySelector(".disclaimer").textContent =
        "Estimated from recorded one-way distances using 0.14413 kg " +
        "CO2 per vehicle-km. Assumes each listed trip is completed " +
        "and replaces a separate conventional-car trip. These are " +
        "potential savings, not verified environmental results.";
}

// Update the dashboard when the page loads.
updateDashboard();

