let map;
let autocomplete;
let markers = [];
let polylines = [];

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 0, lng: 0 },
    zoom: 4,
    mapTypeId: "roadmap",
    tilt: 0,
    minZoom: 2,
  });

  autocomplete = new google.maps.places.Autocomplete(document.getElementById("autocomplete"), {
    types: ["locality"],
  });

  autocomplete.bindTo("bounds", map);
}

function addPin() {
  const place = autocomplete.getPlace();

  if (!place.geometry) {
    alert("No details available for input: " + document.getElementById("autocomplete").value);
    return;
  }

  const marker = new google.maps.Marker({
    position: place.geometry.location,
    map: map,
    title: place.name,
    animation: google.maps.Animation.DROP,
    label: getCountryCode(place),
  });

  map.setCenter(marker.getPosition());
  markers.push(marker);

  const country = getAddressComponent(place, "country");
  const city = getAddressComponent(place, "locality");
  const listItemText = country && city ? `${country} - ${city}` : place.name;

  // Add pin to the list
  const pinList = document.querySelector(".pinList");
  const li = document.createElement("li");
  li.className = "text-black mb-2 rounded-md flex justify-between items-center ";
  li.textContent = listItemText;

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "X"; //trash icon maybe?
  deleteButton.className =
    "ml-2 px-2 py-1 text-white rounded-full hover:bg-red-500 deletePin-btn w-6 h-6 flex justify-center items-center";
  deleteButton.addEventListener("click", () => {
    removePin(marker, li);
  });
  li.appendChild(deleteButton);

  pinList.appendChild(li);

  document.getElementById("autocomplete").value = "";

  drawPolylines();
}

function getAddressComponent(result, component) {
  const addressComponents = result.address_components;
  for (let i = 0; i < addressComponents.length; i++) {
    const types = addressComponents[i].types;
    if (types.indexOf(component) !== -1) {
      return addressComponents[i].long_name;
    }
  }
  return "";
}

function getCountryCode(place) {
  const countryComponent = getAddressComponent(place, "country");
  const countryCode = place.address_components.find((component) => component.types.includes("country"))?.short_name;
  return countryCode || countryComponent || "";
}

//Function to draw lines between places
function drawPolylines() {
  polylines.forEach((polyline) => {
    polyline.setMap(null);
  });

  if (markers.length < 2) {
    return;
  }

  for (let i = 0; i < markers.length - 1; i++) {
    const path = [markers[i].getPosition(), markers[i + 1].getPosition()];

    const lineSymbol = {
      path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
      scale: 4,
      strokeColor: "#808080",
    };

    const flightPath = new google.maps.Polyline({
      path: path,
      icons: [
        {
          icon: lineSymbol,
          offset: "100%",
        },
      ],
      map: map,
      strokeColor: "#808080",
    });

    polylines.push(flightPath);
  }
}

//remove pin from map and list
function removePin(marker, item) {
  marker.setMap(null);
  const markerIndex = markers.indexOf(marker);
  if (markerIndex !== -1) {
    markers.splice(markerIndex, 1);
  }
  removePolyline(markerIndex);

  item.remove();

  drawPolylines();
}

function removePolyline(markerIndex) {
  if (markers.length < 2) {
    return;
  }

  if (polylines[markerIndex]) {
    polylines[markerIndex].setMap(null);
  }

  polylines.splice(markerIndex, 1);
}
