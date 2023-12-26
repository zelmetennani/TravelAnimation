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

  const country = getAddressComponent(place, "country");
  const city = getAddressComponent(place, "locality");
  const listItemText = country && city ? `${country} - ${city}` : place.name;

  const formattedTitle = listItemText.toLowerCase();
  const isDuplicate = markers.some((marker) => {
    const markerTitleLowerCase = marker.getTitle().toLowerCase();
    return markerTitleLowerCase === formattedTitle;
  });

  if (isDuplicate) {
    showErrorToast("Duplicated place");
    return;
  }

  const marker = new google.maps.Marker({
    position: place.geometry.location,
    map: map,
    title: listItemText,
    animation: google.maps.Animation.DROP,
    label: getCountryCode(place),
  });

  marker.addListener("click", () => {
    showInfoWindow(marker, getPhotosForMarker(marker.getTitle()));
  });

  map.setCenter(marker.getPosition());
  markers.push(marker);

  // Add pin to the list
  const pinList = document.querySelector(".pinList");
  const li = document.createElement("li");
  const div = document.createElement("div");
  div.className = "flex gap-3 items-center justify-center";

  li.className =
    "px-2 text-black mb-2 rounded-md flex justify-between items-center py-1 hover:bg-gray-200 cursor-pointer";
  li.textContent = listItemText;
  li.classList.add("fadeIn");

  const addPhotoButton = document.createElement("button");
  addPhotoButton.className = "text-gray-400 hover:text-black transition-all duration-300 w-6 h-6";
  addPhotoButton.innerHTML = "<i class='fas fa-camera'></i>";

  const inputPhoto = document.createElement("input");
  inputPhoto.type = "file";
  inputPhoto.style.display = "none";
  inputPhoto.addEventListener("change", (event) => handleFileUpload(event, marker));
  addPhotoButton.appendChild(inputPhoto);

  addPhotoButton.addEventListener("click", () => {
    inputPhoto.click();
  });

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "X";
  deleteButton.className = "text-gray-400 hover:text-black transition-all duration-300 font-bold w-6 h-6";
  deleteButton.addEventListener("click", () => {
    removePin(marker, li);
  });
  div.appendChild(addPhotoButton);
  div.appendChild(deleteButton);
  li.appendChild(div);

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

  removePhotosForMarker(marker.getTitle());

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
    background: "linear-gradient(to right, #ff9999, #ffcc99)",
  }).showToast();
}

function showSuccessToast(message) {
  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top",
    position: "center",
    background: "linear-gradient(to right, #99ff99, #ccff99)",
  }).showToast();
}

function saveMarkersToLocalStorage() {
  const markersData = markers.map((marker) => {
    const markerTitle = marker.getTitle();
    return {
      title: markerTitle,
      position: {
        lat: marker.getPosition().lat(),
        lng: marker.getPosition().lng(),
      },
      label: marker.getLabel(),
      infoWindowContent: getPhotosForMarker(markerTitle),
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

      marker.addListener("click", () => {
        showInfoWindow(marker, getPhotosForMarker(marker.getTitle()));
      });

      markers.push(marker);

      const markerPhotos = loadPhotosForMarker(markerData.title);

      showInfoWindow(marker, markerPhotos);
    });

    drawPolylines();
  }
}
function loadPhotosForMarker(markerTitle) {
  const photosData = JSON.parse(localStorage.getItem("photos")) || [];

  return photosData.filter((photoData) => photoData.markerTitle === markerTitle);
}

function loadPinList() {
  const pinList = document.querySelector(".pinList");
  const markersData = localStorage.getItem("markers");

  if (markersData) {
    const parsedMarkers = JSON.parse(markersData);

    parsedMarkers.forEach((markerData) => {
      const li = document.createElement("li");
      const div = document.createElement("div");
      div.className = "flex gap-3 items-center justify-center";

      li.className =
        "px-2 text-black mb-2 rounded-md flex justify-between items-center py-1 hover:bg-gray-200 cursor-pointer";
      li.textContent = markerData.title;
      li.classList.add("fadeIn");

      const addPhotoButton = document.createElement("button");
      addPhotoButton.className = "text-gray-400 hover:text-black transition-all duration-300 w-6 h-6";
      addPhotoButton.innerHTML = "<i class='fas fa-camera'></i>";

      const inputPhoto = document.createElement("input");
      inputPhoto.type = "file";
      inputPhoto.style.display = "none";

      addPhotoButton.addEventListener(
        "click",
        (function (marker) {
          return function () {
            inputPhoto.click();
          };
        })(markerData)
      );

      inputPhoto.addEventListener("change", (event) => handleFileUpload(event, markerData));

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "X";
      deleteButton.className =
        "px-2 py-1 text-gray-400 hover:text-black transition-all duration-300 rounded-full font-bold w-6 h-6 flex justify-center items-center";
      deleteButton.addEventListener("click", () => {
        const markerToDelete = markers.find((marker) => marker.getTitle() === markerData.title);
        if (markerToDelete) {
          removePin(markerToDelete, li);
        }
      });
      div.appendChild(addPhotoButton);
      div.appendChild(deleteButton);
      li.appendChild(div);
      pinList.appendChild(li);

      makeElementDraggable(li);
    });
  }
}

function handleFileUpload(event, marker) {
  const fileInput = event.target;
  const file = fileInput.files[0];

  if (!file || !file.type.startsWith("image/")) {
    showErrorToast("Invalid file type");
    return;
  }

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      const photoData = {
        markerTitle: marker.title,
        dataURL: e.target.result,
      };

      savePhotoToLocalStorage(photoData);
      showSuccessToast("Photo added successfully");
    };

    reader.readAsDataURL(file);
  }
}

function savePhotoToLocalStorage(photoData) {
  const photosData = JSON.parse(localStorage.getItem("photos")) || [];

  photosData.push(photoData);

  localStorage.setItem("photos", JSON.stringify(photosData));
}

function showInfoWindow(marker, photos) {
  const content = generateInfoWindowContent(photos);

  const infoWindow = new google.maps.InfoWindow({
    content: content,
  });

  infoWindow.open(map, marker);
}

function generateInfoWindowContent(photos) {
  if (photos.length === 0) {
    return "No photos available";
  }

  const content = document.createElement("div");
  content.className = "info-window-content";

  photos.forEach((photo) => {
    const imgContainer = document.createElement("div");
    imgContainer.className = "photo-container";

    const img = document.createElement("img");
    img.src = photo.dataURL;
    img.alt = "Marker Photo";

    imgContainer.appendChild(img);
    content.appendChild(imgContainer);
  });

  return content;
}

function getPhotosForMarker(markerTitle) {
  const photosData = JSON.parse(localStorage.getItem("photos")) || [];
  return photosData.filter((photoData) => photoData.markerTitle === markerTitle);
}

function removePhotosForMarker(markerTitle) {
  const photosData = JSON.parse(localStorage.getItem("photos")) || [];

  const updatedPhotos = photosData.filter((photoData) => photoData.markerTitle !== markerTitle);

  localStorage.setItem("photos", JSON.stringify(updatedPhotos));
}
