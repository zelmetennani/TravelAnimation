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
    types: ["(regions)"],
  });

  autocomplete.bindTo("bounds", map);
}

function addPin() {
  const place = autocomplete.getPlace();

  if (!place.geometry) {
    alert("No details available for input: " + document.getElementById("autocomplete").value);
    return;
  }

  const isDuplicate = markers.some((marker) => marker.getTitle() === place.name);

  if (isDuplicate) {
    showErrorToast("Duplicated place");
    return;
  }

  const country = getAddressComponent(place, "country");
  const city = getAddressComponent(place, "locality");
  const listItemText = country && city ? `${country} - ${city}` : place.name;

  const marker = new google.maps.Marker({
    position: place.geometry.location,
    map: map,
    title: listItemText,
    animation: google.maps.Animation.DROP,
    label: getCountryCode(place),
  });

  //pin tooltip
  const buttonHtml =
    "<button class='text-white cursor-pointer group relative flex gap-1.5 justify-center items-center px-8 py-4 bg-black bg-opacity-80 text-[#f1f1f1] rounded-3xl hover:bg-opacity-70 transition font-semibold shadow-md' onclick=\"console.log('Hello World')\"><i class='fas fa-camera'></i> Add Photo</button>";
  const contentString = `<div>${buttonHtml}</div>`;

  const infoWindow = createInfoWindow(contentString);
  saveInfoWindowToLocalStorage(marker.getTitle(), contentString);
  marker.addListener("click", () => {
    infoWindow.open(map, marker);
  });

  map.setCenter(marker.getPosition());
  markers.push(marker);

  // Add pin to the list
  const pinList = document.querySelector(".pinList");
  const li = document.createElement("li");
  li.className =
    "px-2 text-black mb-2 rounded-md flex justify-between items-center py-1 hover:bg-gray-200 cursor-pointer";
  li.textContent = listItemText;
  li.classList.add("fadeIn");

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "X"; //trash icon maybe?
  deleteButton.className =
    "px-2 py-1 text-white rounded-full hover:bg-red-500 deletePin-btn w-6 h-6 flex justify-center items-center";
  deleteButton.addEventListener("click", () => {
    removePin(marker, li);
  });
  li.appendChild(deleteButton);

  pinList.appendChild(li);

  makeElementDraggable(li);

  document.getElementById("autocomplete").value = "";
  saveMarkersToLocalStorage();
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
      strokeColor: "#505050",
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
      strokeColor: "#505050",
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

  removeInfoWindowFromLocalStorage(marker.getTitle());

  item.remove();
  saveMarkersToLocalStorage();
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

//drag and drop
function makeElementDraggable(element) {
  const pinList = document.querySelector(".pinList");

  new Sortable(pinList, {
    animation: 150,
    onEnd: function (evt) {
      const movedMarker = markers.splice(evt.oldIndex, 1)[0];
      markers.splice(evt.newIndex, 0, movedMarker);

      saveMarkersToLocalStorage();
      drawPolylines();
    },
  });
}

//toast
function showErrorToast(message) {
  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top",
    position: "center",
    backgroundColor: "linear-gradient(to right, #ff9999, #ffcc99)",
  }).showToast();
}

function saveMarkersToLocalStorage() {
  const markersData = markers.map((marker) => {
    return {
      title: marker.getTitle(),
      position: {
        lat: marker.getPosition().lat(),
        lng: marker.getPosition().lng(),
      },
      label: marker.getLabel(),
    };
  });

  localStorage.setItem("markers", JSON.stringify(markersData));
}

function loadMarkersFromLocalStorage() {
  const markersData = localStorage.getItem("markers");

  if (markersData) {
    const parsedMarkers = JSON.parse(markersData);

    parsedMarkers.forEach((markerData) => {
      const marker = new google.maps.Marker({
        position: { lat: markerData.position.lat, lng: markerData.position.lng },
        map: map,
        title: markerData.title,
        animation: google.maps.Animation.DROP,
        label: markerData.label,
      });

      markers.push(marker);
    });

    drawPolylines();
  }
}

function loadPinList() {
  const pinList = document.querySelector(".pinList");
  const markersData = localStorage.getItem("markers");

  if (markersData) {
    const parsedMarkers = JSON.parse(markersData);

    parsedMarkers.forEach((markerData) => {
      const li = document.createElement("li");
      li.className =
        "px-2 text-black mb-2 rounded-md flex justify-between items-center py-1 hover:bg-gray-200 cursor-pointer";
      li.textContent = markerData.title;
      li.classList.add("fadeIn");

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "X"; //trash icon maybe?
      deleteButton.className =
        "px-2 py-1 text-white rounded-full hover:bg-red-500 deletePin-btn w-6 h-6 flex justify-center items-center";
      deleteButton.addEventListener("click", () => {
        const markerToDelete = markers.find((marker) => marker.getTitle() === markerData.title);
        if (markerToDelete) {
          removePin(markerToDelete, li);
        }
      });
      li.appendChild(deleteButton);
      pinList.appendChild(li);

      makeElementDraggable(li);
    });
  }
}

function createInfoWindow(content) {
  return new google.maps.InfoWindow({
    content: content,
  });
}

function saveInfoWindowToLocalStorage(markerTitle, contentString) {
  const infoWindowsData = JSON.parse(localStorage.getItem("infoWindows")) || {};
  infoWindowsData[markerTitle] = contentString;
  localStorage.setItem("infoWindows", JSON.stringify(infoWindowsData));
}

function loadInfoWindowsFromLocalStorage() {
  const infoWindowsData = JSON.parse(localStorage.getItem("infoWindows")) || {};

  Object.entries(infoWindowsData).forEach(([markerTitle, contentString]) => {
    const marker = markers.find((m) => m.getTitle() === markerTitle);

    if (marker) {
      const infoWindow = createInfoWindow(contentString);

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });
    }
  });
}

function removeInfoWindowFromLocalStorage(markerTitle) {
  const infoWindowsData = JSON.parse(localStorage.getItem("infoWindows")) || {};
  delete infoWindowsData[markerTitle];
  localStorage.setItem("infoWindows", JSON.stringify(infoWindowsData));
}
