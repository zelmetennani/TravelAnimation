let map;
let autocomplete;
let markers = [];

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 0, lng: 0 },
    zoom: 4,
    mapTypeId: "roadmap",
    tilt: 0,
    minZoom: 2,
  });

  autocomplete = new google.maps.places.Autocomplete(document.getElementById("autocomplete"), {
    types: ["(cities)"],
    fields: ["place_id", "geometry", "name"],
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
    label: "A", // You can use a static label or customize it based on your requirements
  });

  map.setCenter(marker.getPosition());
  markers.push(marker);

  // Add pin to the list
  const pinList = document.querySelector(".pinList");
  const li = document.createElement("li");
  li.className = "text-black mb-2 rounded-md";
  li.textContent = `${place.name}`;
  pinList.appendChild(li);

  /* const pinList = document.getElementById("pinList");
        const row = pinList.insertRow();
        row.className = "bg-gray-200 text-black";
        const cell1 = row.insertCell(0);
        cell1.className = "px-2 max-w-xs overflow-auto";
        const cell2 = row.insertCell(1);
        cell2.className = "px-2 max-w-xs overflow-auto";
        const cell3 = row.insertCell(2);
        cell3.className = "px-2 max-w-xs overflow-auto";

        cell1.textContent = place.name;
        cell2.textContent = place.geometry.location.lat();
        cell3.textContent = place.geometry.location.lng();
 */
  // Clear the input field

  drawPolylines();
  document.getElementById("autocomplete").value = "";
}

//Function to draw lines between places
function drawPolylines() {
  if (markers.length < 2) {
    return;
  }

  const path = markers.map((marker) => marker.getPosition());

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

  flightPath.setMap(map);
}
