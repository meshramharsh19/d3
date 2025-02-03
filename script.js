// latlong.js and script.js merged

// LatLong.js Code

const fileInput = document.getElementById('fileInput');

// Function to convert UTM to Lat/Lng (using the provided logic)
function utmToLatLng(zone, easting, northing, northernHemisphere) {
    if (!northernHemisphere) {
        northing = 10000000 - northing;
    }

    var a = 6378137;
    var e = 0.081819191;
    var e1sq = 0.006739497;
    var k0 = 0.9996;

    var arc = northing / k0;
    var mu = arc / (a * (1 - Math.pow(e, 2) / 4.0 - 3 * Math.pow(e, 4) / 64.0 - 5 * Math.pow(e, 6) / 256.0));

    var ei = (1 - Math.pow((1 - e * e), (1 / 2.0))) / (1 + Math.pow((1 - e * e), (1 / 2.0)));
    var ca = 3 * ei / 2 - 27 * Math.pow(ei, 3) / 32.0;
    var cb = 21 * Math.pow(ei, 2) / 16 - 55 * Math.pow(ei, 4) / 32;
    var cc = 151 * Math.pow(ei, 3) / 96;
    var cd = 1097 * Math.pow(ei, 4) / 512;

    var phi1 = mu + ca * Math.sin(2 * mu) + cb * Math.sin(4 * mu) + cc * Math.sin(6 * mu) + cd * Math.sin(8 * mu);

    var n0 = a / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (1 / 2.0));
    var r0 = a * (1 - e * e) / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (3 / 2.0));

    var fact1 = n0 * Math.tan(phi1) / r0;
    var _a1 = 500000 - easting;
    var dd0 = _a1 / (n0 * k0);

    var fact2 = dd0 * dd0 / 2;
    var t0 = Math.pow(Math.tan(phi1), 2);
    var Q0 = e1sq * Math.pow(Math.cos(phi1), 2);

    var fact3 = (5 + 3 * t0 + 10 * Q0 - 4 * Q0 * Q0 - 9 * e1sq) * Math.pow(dd0, 4) / 24;
    var fact4 = (61 + 90 * t0 + 298 * Q0 + 45 * t0 * t0 - 252 * e1sq - 3 * Q0 * Q0) * Math.pow(dd0, 6) / 720;

    var lof1 = _a1 / (n0 * k0);
    var lof2 = (1 + 2 * t0 + Q0) * Math.pow(dd0, 3) / 6.0;
    var lof3 = (5 - 2 * Q0 + 28 * t0 - 3 * Math.pow(Q0, 2) + 8 * e1sq + 24 * Math.pow(t0, 2)) * Math.pow(dd0, 5) / 120;

    var _a2 = (lof1 - lof2 + lof3) / Math.cos(phi1);
    var _a3 = _a2 * 180 / Math.PI;

    var latitude = 180 * (phi1 - fact1 * (fact2 + fact3 + fact4)) / Math.PI;

    if (!northernHemisphere) {
        latitude = -latitude;
    }

    var longitude = ((zone > 0) && (6 * zone - 183.0) || 3.0) - _a3;

    return {
        latitude: latitude,
        longitude: longitude
    };
}

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileContent = e.target.result;
            const dataArray = fileContent.split(/\s+/);

            const zone = parseInt(dataArray[2], 10);
            const easting = parseFloat(dataArray[3]);
            const northing = parseFloat(dataArray[4]);
            const northernHemisphere = true;

            const latLng = utmToLatLng(zone, easting, northing, northernHemisphere);

            // Post message to script.js
            window.postMessage({
                type: "latlongData",
                latitude: latLng.latitude,
                longitude: latLng.longitude
            }, "*");
        };

        reader.readAsText(file);
    } else {
        alert('Please upload a valid text file.');
    }
});

// script.js Code

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ZjI2M2I5YS04YTVkLTRhOWYtYmFiMi0yMzRmOGIyNTE2OTkiLCJpZCI6MjY2MDc4LCJpYXQiOjE3MzY1MDQ0Nzl9.ST6Sriro-NE-NjBF1Gu_yRfyzQEqacBx1HR6zsnJYcM';

const viewer = new Cesium.Viewer('cesiumContainer', {
    imageryProvider: new Cesium.UrlTemplateImageryProvider({
        url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
    }),
    terrainProvider: Cesium.createWorldTerrain()
});

let modelEntity = null;

const uploadInput = document.getElementById('modelUpload');
uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        if (file.name.endsWith('.obj')) {
            const loader = new THREE.OBJLoader();
            const object = loader.parse(e.target.result); 

            const scene = new THREE.Scene();
            scene.add(object);

            const exporter = new THREE.GLTFExporter();
            exporter.parse(scene, function (gltf) {
                const modelUrl = URL.createObjectURL(new Blob([gltf], { type: 'model/gltf-binary' })); 

                modelEntity = viewer.entities.add({
                    name: file.name,
                    position: Cesium.Cartesian3.fromDegrees(parseFloat(document.getElementById('longitude').value), 
                                                            parseFloat(document.getElementById('latitude').value), 
                                                            parseFloat(document.getElementById('height').value)),
                    orientation: Cesium.Transforms.headingPitchRollQuaternion(
                        Cesium.Cartesian3.fromDegrees(parseFloat(document.getElementById('longitude').value), 
                                                      parseFloat(document.getElementById('latitude').value), 
                                                      parseFloat(document.getElementById('height').value)),
                        new Cesium.HeadingPitchRoll(
                            Cesium.Math.toRadians(parseFloat(document.getElementById('heading').value)),
                            Cesium.Math.toRadians(parseFloat(document.getElementById('pitch').value)), 
                            Cesium.Math.toRadians(parseFloat(document.getElementById('roll').value))
                        )
                    ),
                    model: {
                        uri: modelUrl 
                    }
                });
                viewer.trackedEntity = modelEntity;
            }, { binary: true }); 
        } else { 
            const modelUrl = e.target.result; 

            modelEntity = viewer.entities.add({
                name: file.name,
                position: Cesium.Cartesian3.fromDegrees(parseFloat(document.getElementById('longitude').value), 
                                                        parseFloat(document.getElementById('latitude').value), 
                                                        parseFloat(document.getElementById('height').value)),
                orientation: Cesium.Transforms.headingPitchRollQuaternion(
                    Cesium.Cartesian3.fromDegrees(parseFloat(document.getElementById('longitude').value), 
                                                  parseFloat(document.getElementById('latitude').value), 
                                                  parseFloat(document.getElementById('height').value)),
                    new Cesium.HeadingPitchRoll(
                        Cesium.Math.toRadians(parseFloat(document.getElementById('heading').value)), 
                        Cesium.Math.toRadians(parseFloat(document.getElementById('pitch').value)), 
                        Cesium.Math.toRadians(parseFloat(document.getElementById('roll').value))
                    )
                ),
                model: {
                    uri: modelUrl
                }
            });
            viewer.trackedEntity = modelEntity;
        }
    }

    if (file.name.endsWith('.obj')) {
        reader.readAsText(file);
    } else {
        reader.readAsDataURL(file); 
    }
});

window.addEventListener('message', function(event) {
    if (event.data.type === "latlongData") {
        document.getElementById('latitude').value = event.data.latitude.toFixed(6);
        document.getElementById('longitude').value = event.data.longitude.toFixed(6);
        updateModelPosition();
    }
});

// Event listeners for input fields
document.getElementById('heading').addEventListener('input', updateModelOrientation);
document.getElementById('pitch').addEventListener('input', updateModelOrientation);
document.getElementById('roll').addEventListener('input', updateModelOrientation);

function updateModelOrientation() {
    if (modelEntity) {
        const heading = Cesium.Math.toRadians(parseFloat(document.getElementById('heading').value));
        const pitch = Cesium.Math.toRadians(parseFloat(document.getElementById('pitch').value));
        const roll = Cesium.Math.toRadians(parseFloat(document.getElementById('roll').value));

        const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
        const orientation = Cesium.Transforms.headingPitchRollQuaternion(modelEntity.position.getValue(), hpr);
        modelEntity.orientation = orientation;
    }
}

document.getElementById('longitude').addEventListener('input', updateModelPosition);
document.getElementById('latitude').addEventListener('input', updateModelPosition);
document.getElementById('height').addEventListener('input', updateModelPosition);

function updateModelPosition() {
    if (modelEntity) {
        const longitude = parseFloat(document.getElementById('longitude').value);
        const latitude = parseFloat(document.getElementById('latitude').value);
        const height = parseFloat(document.getElementById('height').value);

        const newPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
        modelEntity.position = newPosition;
        viewer.trackedEntity = modelEntity; 
    }
}

// Appearance controls
const modelColorInput = document.getElementById('modelColor');
modelColorInput.addEventListener('change', updateModelColor);

function updateModelColor() {
    if (modelEntity) {
        const color = Cesium.Color.fromCssColorString(modelColorInput.value);
        modelEntity.model.color = color; 
    }
}

const modelOpacityInput = document.getElementById('modelOpacity');
modelOpacityInput.addEventListener('input', updateModelOpacity);

function updateModelOpacity() {
    if (modelEntity) {
        const opacity = parseFloat(modelOpacityInput.value);
        modelEntity.model.color = new Cesium.Color(modelOpacityInput.value);
    }
}
