//// 1 GLOBAL VARIABLES ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// 2 EVENT LISTNERS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// 3 AJAX CALLS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// 4 UTIL FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////// 1 GLOBAL VARIABLES ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Consider implementing Pie Charts in next version: http://bl.ocks.org/gisminister/10001728

//Bugs
// Center map stops working if used over a dead space.

const earthquakeIcon = L.ExtraMarkers.icon({
    icon: 'fa-house-damage',
    markerColor: 'black',
    shape: 'penta',
    prefix: 'fa'
  });

const capitalIcon = L.ExtraMarkers.icon({
    icon: 'fa-city',
    markerColor: 'blue-dark',
    shape: 'circle',
    prefix: 'fa'
  });

const travelIcon = L.ExtraMarkers.icon({
    icon: 'fa-plane',
    markerColor: 'orange',
    shape: 'square',
    prefix: 'fa'
  });

const natureIcon = L.ExtraMarkers.icon({
    icon: 'fa-leaf',
    markerColor: 'green-dark',
    shape: 'circle',
    prefix: 'fa'
  });

  const societyIcon = L.ExtraMarkers.icon({
    icon: 'fa-building',
    markerColor: 'yellow',
    shape: 'circle',
    prefix: 'fa'
  });

const otherIcon = L.ExtraMarkers.icon({
    icon: 'fa-question',
    markerColor: 'white',
    shape: 'circle',
    prefix: 'fa'
  });

let countryData = [];
let homeFlagSet = false;
let $homeLat;
let $homeLng;
let borderData;
let countryPolylines;
let viewHistory = [];
let historySize = 0;
let historyIndex = -1;

//Icons
let capitalCityIcons = [];
let earthquakeIcons = [];
let socialIcons = [];
let travelIcons = [];
let natureIcons = [];
let otherIcons = [];

//Clusters
//This uses an extension script, layer support, to allow marker clusters to be stored as a control layer.
//https://github.com/ghybs/Leaflet.MarkerCluster.LayerSupport
//https://stackoverflow.com/questions/35788139/how-to-apply-leaflet-marker-cluster-using-layers
let iconsLayerSupport = L.markerClusterGroup.layerSupport({showCoverageOnHover: false});

//Layer Creation and Control.
const streetView = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '<span class="attribution">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors</span>'
});
const satelliteView = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: '<span class="attribution"> Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community</span>'
});
const terrainView = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}', {
    attribution: '<span class="attribution"> Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors</span>',
	subdomains: 'abcd',
	ext: 'png'
});
const baseLayers = {
    "<span style='color: gray'>Street</span>": streetView,
    "<span style='color: gray'>Terrain</span>": terrainView,
    "<span style='color: gray'>Satellite</span>": satelliteView,
};
let capitalCityLayer = L.layerGroup();//An icon layer.
let earthquakesLayer = L.layerGroup();//An icon layer.
let socialLayer = L.layerGroup();//An icon layer.
let travelLayer = L.layerGroup();//An icon layer.
let natureLayer = L.layerGroup();//An icon layer.
let otherLayer = L.layerGroup();//An icon layer.
let overlayLayers = {};//This will consist of the icon layers.
let layerControl = L.control.layers(baseLayers, overlayLayers);

//Map Variable
const mymap = L.map('map', {
    minZoom: 3,
    maxZoom: 14,
    maxNativeZoom: 14,
    zoomControl: false,
    //layers: [streetView, terrainVie, satelliteView] // This adds all layers to the map, not the control as expected.
});

//Buttons a buttonBars
const zoomIn = L.easyButton({
    states: [{
        stateName: 'zoomIn',
        icon: 'fa-plus',
        title: "Zoom In",
        onClick: function(btn) {
            mymap.zoomIn();
        }
    }]
});

const zoomOut = L.easyButton({
    states: [{
        stateName: 'zoomOut',
        icon: 'fa-minus',
        title: "Zoom Out",
        onClick: function(btn) {
            mymap.zoomOut();
        }
    }]
});

const fit = L.easyButton({
    states: [{
        stateName: 'fit',
        icon: 'far fa-square',
        title: "Fit Country to Screen",
        onClick: function(btn) {
            mymap.fitBounds(L.featureGroup([countryPolylines]).getBounds());
        }
    }]
});

const navBar = L.easyBar([
    zoomIn,
    zoomOut,
    fit,
]).addTo(mymap);

const home = L.easyButton({    
    states: [{
        stateName: 'home',
        icon: 'fa-home',
        title: "My Country",
        onClick: function(btn) {
            $("#selectCountry").val(0);
            ajaxDetermineCountry($homeLat, $homeLng);
            historyIndex = 0
            leftArrow.disable();
            if(historySize > 1) {
                rightArrow.enable();
            }
        }
    }]
});

const target = L.easyButton({
    states: [{
        stateName: 'target',
        icon: 'fa-crosshairs',
        title: "Select Centered Country",
        onClick: function(btn) {
            let id = $('#selectCountry').children(":selected").attr("id");
            ajaxDetermineCountry(mymap.getCenter()["lat"], mymap.getCenter()["lng"]);
            if(id != $('#selectCountry').children(":selected").attr("id")) {
                if(document.getElementById(id).value == -1) {
                    document.getElementById(id).value = historySize;
                    historyIndex = historySize;
                    historySize++;
                    if(historyIndex > 0) {leftArrow.enable();}
                } else {
                    historyIndex = document.getElementById(id).value;
                }
            }
        }
    }]
});

const leftArrow = L.easyButton("<span class='backwardsHistoryButton'></span>", {
    states: [{
        stateName: 'priorHistory',
        icon: 'fa-arrow-left',
        title: "Previous History",
        onClick: function(btn) {
            if(historyIndex > 0) {
                historyIndex--;        
                $("#selectCountry").val(historyIndex);
                ajaxCountryInformation();
                if(historyIndex == 0) {leftArrow.disable();}
                rightArrow.enable();
            }
        }
    }] //window.buttonWithHomeState.state('home');  // go a specific state by name
    //Need to follow this up and understand.
    //Case 1 below works as expected. the select box updates. Case 2 Does not work as expected.
    //There is almost not obvious difference between each case. both the types and value are exact of test1 and test2.
    // - Case 1; Works
    // let test1 = "SE"; //The ISO code of Sweden.
    // $("#selectCountry option[id='"+ test1 + "']").attr("selected", "selected");
    // - Case 2; Does not work
    // let historyLog = ["GB", "SE"]
    // let logIndex = 1;
    // let test2 = historyLog[logIndex - 1];
    // $("#selectCountry option[id='" + test2 + "']").attr("selected", "selected");
});

const rightArrow = L.easyButton('<img src="./libs/img/buttons/ArrowRight.png">', {
    states: [{
        stateName: "forwardHistory",
        icon: 'fa-arrow-right',
        title: "Forward History",
        onClick: function(btn) {
            if(historyIndex < historySize -1) {
                historyIndex++;        
                $("#selectCountry").val(historyIndex);
                ajaxCountryInformation();
                if(historyIndex == historySize - 1) {rightArrow.disable();}
                leftArrow.enable();
            }
        }
    }]
});

leftArrow.disable();
rightArrow.disable();

const selectionBar = L.easyBar([
    home,
    target,
    leftArrow,
    rightArrow,
]).addTo(mymap);

const geoInfo = L.easyButton({
    states: [{
        stateName: "infoGeo",
        icon: 'far fa-flag',
        title: "Country Information",
        onClick: function(btn, map) {
            $("#geoInfo").modal("show");
        }
    }]
})

const weatherInfo = L.easyButton({
    states: [{
        stateName: "infoWeather",
        icon: 'fa-cloud-sun-rain',
        title: "Weather",
        onClick: function(btn, map) {
            $("#weatherInfo").modal("show");
        }
    }]
})

const pandemicInfo = L.easyButton({
    states: [{
        stateName: "infoCOVID",
        icon: 'fa-head-side-mask',
        title: "COVID-19",
        onClick: function(btn, map) {
            $("#pandemicInfo").modal("show");
        }
    }]
})

const infoBar = L.easyBar([
    geoInfo,
    weatherInfo,
    pandemicInfo,
]).addTo(mymap);


function populateData() {
    populateCapital();
    populateEQs();
    populateWiki();
    populateModals();
    updateOverlays();
}

function updateOverlays() {

    layerControl.remove(mymap);
    iconsLayerSupport.addTo(mymap);

    iconsLayerSupport.checkIn(capitalCityLayer);
    iconsLayerSupport.checkIn(socialLayer);
    iconsLayerSupport.checkIn(travelLayer);
    iconsLayerSupport.checkIn(natureLayer);
    iconsLayerSupport.checkIn(earthquakesLayer);
    iconsLayerSupport.checkIn(otherLayer);
    
    overlayLayers = {
        "<span style='color: gray'>Capital City</span>": capitalCityLayer,
        "<span style='color: gray'>Social/Society</span>": socialLayer,
        "<span style='color: gray'>Travel</span>": travelLayer,
        "<span style='color: gray'>Nature</span>": natureLayer,
        "<span style='color: gray'>Earthquakes</span>": earthquakesLayer,
        "<span style='color: gray'>Other</span>": otherLayer,
    };

    layerControl = L.control.layers(baseLayers, overlayLayers);

    layerControl.addTo(mymap)
    streetView.addTo(mymap)

    //There is a strange bug that seems to be related to the script used to manage group layers in the control panel.
    //When removing any layer other than the capitalCityLayer, the tile set is also removed and the screen goes blank.
    // const iconsAddRemove = L.easyButton('<img src="./libs/img/buttons/info.png">', function(btn, map){
    //     if(
    //         mymap.hasLayer(capitalCityLayer) || mymap.hasLayer(socialLayer) || mymap.hasLayer(travelLayer) || 
    //         mymap.hasLayer(natureLayer) || mymap.hasLayer(earthquakesLayer) || mymap.hasLayer(otherLayer)
    //     ) {
    //         mymap.hasLayer(capitalCityLayer) ? mymap.removeLayer(capitalCityLayer) : "";
    //         mymap.hasLayer(socialLayer) ? mymap.remove(socialLayer) : "";
    //         mymap.hasLayer(travelLayer) ? mymap.remove(travelLayer) : "";
    //         mymap.hasLayer(natureLayer) ? mymap.remove(natureLayer) : "";
    //         mymap.hasLayer(earthquakesLayer) ? mymap.remove(earthquakesLayer) : "";
    //         mymap.hasLayer(otherLayer) ? mymap.remove(otherLayer) : "";
    //     } else {
    //         capitalCityLayer.addTo(mymap);
    //         socialLayer.addTo(mymap);
    //         travelLayer.addTo(mymap);
    //         natureLayer.addTo(mymap);
    //         earthquakesLayer.addTo(mymap);
    //         otherLayer.addTo(mymap);
    //     }
    //     initaliseMap();
    // });
}

function populateModals() {
    let $data = countryData["data"];
    //The way that this function operates is not ideal. The code has been minimised where possible, however, it requires significant data checks.
    //Unfortunately, the APIs don't consistently return an array indices if there is no data for the specified parameters, so for some countries 
    //an array index may not exist. In an example, if the weather is not currently raining, then the entire index for total rainfall in mm will
    //not exist. Therefore, a check on each array element before accessing is required to ensure that the app continues to work.

    //Index checks as well as data processing has been abstracted away where to improve readibility. Despite looking heavy, it is quite straight
    //forward once you understand what is happening to a single ajax-id selector.

    //Geographical Information Overlay
    $("#geoTitle").html(!checkIndices($data, 2, "flag") ? "No Available Data" : "<img src=" + $data[2]["flag"] + " class='modalImage'></img>" + "<span class='modalLabel'>  Geo-Social</span>");
    $("#modalFullName").html(!checkIndices($data, 2, "name") ? "No Available Data" : $data[2]["name"]);
    $("#modalRegion").html(!checkIndices($data, 1, "region", "value") ? "No Available Data" : $data[1]["region"]["value"]);
    $("#modalSubRegion").html(!checkIndices($data, 2, "subregion") ? "No Available Data" : $data[2]["subregion"]);
    $("#modalMapLocation").html(!checkIndices($data, 1, "latitude") ? "No Available Data" : 
        decimalPlaces($data[1]["latitude"], 2) + ", " + decimalPlaces($data[1]["longitude"], 2));
    $("#modalNumericCode").html(!checkIndices($data, 2, "numericCode") ? "No Available Data" : $data[2]["numericCode"]);
    $("#modalCoverage").html(!checkIndices($data, 0, "areaInSqKm") ? "No Available Data" : $data[0]["areaInSqKm"] + " Kilometers<sup>2</sup>");
    $("#modalPopulation").html(!checkIndices($data, 0, "population") ? "No Available Data" : 
        decimalPlaces(($data[0]["population"]/100000).toString(), 2) + " million people");
    $("#modalPopulationDensity").html(!checkIndices($data, 0, "population") && !checkIndices($data, 0, "areaInSqKm") ? "No Available Data" : 
        decimalPlaces(($data[0]["population"]/( $data[0]["areaInSqKm"])).toString()));
    $("#modalCapitalCity").html(!checkIndices($data, 2,"capital") ? "No Available Data" : $data[2]["capital"]);
    $("#modalLanguages").html(!checkIndices($data, 2, "languages", 0, "name") ? "No Available Data" : createList($data[2]["languages"], "name"));
    $("#modalIncomeLevel").html(!checkIndices($data, 1, "incomeLevel", "value") ? "No Available Data" : $data[1]["incomeLevel"]["value"]);
    $("#modalCurrencies").html(!checkIndices($data, 2, "currencies", 0 , "name") && !checkIndices($data, 2, "currencies", "symbol") ? "No Available Data" : 
        createList($data[2]["currencies"], "name", "symbol"));
    $("#modalCallingCode").html(!checkIndices($data, 2, "callingCodes", 0) ? "No Available Data" : "+" + $data[2]["callingCodes"][0]);
    $("#modalTopLevelDomain").html(!checkIndices($data, 2, "topLevelDomain") ? "No Available Data" : $data[2]["topLevelDomain"]);

    //Weather Information Overlay
    $("#weatherTitle").html(!checkIndices($data, 2, "flag") ? "No Available Data" : "<img src=" + $data[2]["flag"] + " class='modalImage'></img>" + "<span class='modalLabel'>  Weather</span>");
    $("#modalWeatherStation").html(!checkIndices($data, 2, "name") ? "No Available Data" : $data[5]["name"]);
    $("#modalWeatherDescription").html(!checkIndices($data, 5, "weather", 0, "description") ? "No Available Data" : $data[5]["weather"][0]["description"]);
    $("#modalCloudiness").html(!checkIndices($data, 5, "clouds", "all") ? "No Available Data" : $data[5]["clouds"]["all"] + " %");
    $("#modalRainMM").html(!checkIndices($data, 5, "rain", "1h") ? "No Available Data" : decimalPlaces($data[5]["rain"]["1h"].toString(), 2) + " millimeters");
    $("#modalTemperature").html(!checkIndices($data, 5, "main", "temp") ? "No Available Data" : decimalPlaces(($data[5]["main"]["temp"] - 273.15).toString(), 1) + " °C");
    $("#modalTemperatureHighLow").html(!checkIndices($data, 5, "main", "temp_min") && !checkIndices($data, 5, "main", "temp_max") ? "No Available Data" : 
        decimalPlaces(($data[5]["main"]["temp_min"] - 273.15).toString(), 1) + " / " + 
        decimalPlaces(($data[5]["main"]["temp_max"] - 273.15).toString(), 1) + " °C");
    $("#modalTemperatureFeelsLike").html(!checkIndices($data, 5, "main", "feels_like") ? "No Available Data" : decimalPlaces(($data[5]["main"]["feels_like"] - 273.15).toString(), 1) + " °C");
    $("#modalHumidity").html(!checkIndices($data, 5, "main", "humidity") ? "No Available Data" : $data[5]["main"]["humidity"] + " %");
    $("#modalPressure").html(!checkIndices($data, 5, "main", "pressure") ? "No Available Data" : $data[5]["main"]["pressure"] + " mb");
    $("#modalWindDirection").html(!checkIndices($data, 5, "wind", "deg") ? "No Available Data" : $data[5]["wind"]["deg"] + " °");
    $("#modalWindGust").html(!checkIndices($data, 5, "wind", "gust") ? "No Available Data" : $data[5]["wind"]["gust"] + " meters per second");
    $("#modalWindSpeed").html(!checkIndices($data, 5, "wind", "speed") ? "No Available Data" : $data[5]["wind"]["speed"] + " meters per second");

    //Pandemic Information Overlay
    $("#pandemicTitle").html(!checkIndices($data, 2, "flag") ? "No Available Data" : "<img src=" + $data[2]["flag"] + " class='modalImage'></img>" + "<span class='modalLabel'>  COVID-19</span>");
    $("#modalConfirmed").html(!checkIndices($data, 6, "confirmed") ? "No Available Data" : numberSeperators($data[6]["confirmed"]));
    $("#modalCritical").html(!checkIndices($data, 6, "critical") ? "No Available Data" : $data[6]["critical"]);
    $("#modalRecoveries").html(!checkIndices($data, 6, "recovered") ? "No Available Data" : $data[6]["recovered"]);
    $("#modalDeaths").html(!checkIndices($data, 6, "deaths") ? "No Available Data" : $data[6]["deaths"]);
    $("#modalRecoveryRate").html(!checkIndices($data, 6, "recovered") && !checkIndices($data, 6, "confirmed") ? "No Available Data" : 
        ratioToPrcntg( $data[6]["recovered"] / $data[6]["confirmed"] , 2));
    $("#modalMortalityRate").html(!checkIndices($data, 6, "deaths") && !checkIndices($data, 6, "confirmed") ? "No Available Data" : 
        ratioToPrcntg( $data[6]["deaths"] / $data[6]["confirmed"] , 2));
    $("#modalPendingUnknown").html(!checkIndices($data, 6, "recovered") ? "No Available Data" : 
        ratioToPrcntg(  ($data[6]["confirmed"] - $data[6]["recovered"] - $data[6]["deaths"] ) / $data[6]["confirmed"]) , 2);
}

function ratioToPrcntg(ratioAsNumber, decPlaces = 1) {
    const percentage = ratioAsNumber*100;
    const string = percentage.toString();
    return decimalPlaces(string, decPlaces) + " %";
}

function decimalPlaces(dataAsString, decPlaces = 1) {
    const position = dataAsString.indexOf(".");
    return dataAsString.slice(0, position + decPlaces + 1);
}

function createList(dataArray, elementName1, elementName2 = "null") {
    if(dataArray == "null") {
        return "No available data";
    } else {
        let list = dataArray[0][elementName1]
        if(elementName2 != "null") {list += (" (" + dataArray[0][elementName2] + ")")};
        for(let i = 1; i < dataArray.length; i++) {
            list += "; " + dataArray[i][elementName1];
            if(elementName2 != "null") {list += (" (" + dataArray[i][elementName2] + ")")};
        }
        return list;
    }
}

function checkIndices(arrayObject, index1, index2 = -1, index3 = -1, index4 = -1) {
    let numberOfChecks = index4 != -1 ? 4 : index3 != -1 ? 3 : index2 != -1 ? 2 : 1;
    flag = index1 in arrayObject;
    if(numberOfChecks == 1 || !flag) {return flag;}
    flag = index2 in arrayObject[index1];
    if(numberOfChecks == 2 || !flag) {return flag;}
    flag = index3 in arrayObject[index1][index2];
    if(numberOfChecks == 3 || !flag) {return flag;}
    flag = index4 in arrayObject[index1][index2][index3];
    return flag;
}

function numberSeperators(dataAsNumber) {return dataAsNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}

function populateCapital() {
    capitalCityIcons.forEach(element => mymap.removeLayer(element)); // Remove all previous markers from map before emptying the array.
    capitalCityIcons = []; 
    const lat = countryData["data"][1]["latitude"];
    const lng = countryData["data"][1]["longitude"];
    const capital = countryData["data"][1]["capitalCity"];
    capitalCityIcons.push(
        L.marker([lat, lng], {icon: capitalIcon}).bindPopup(
            "<b>Capital City</b><br>" + capital
        )
    );
    capitalCityLayer = L.layerGroup(capitalCityIcons)
}

function populateEQs() {
    earthquakeIcons.forEach(element => mymap.removeLayer(element)); // Remove all previous markers from map before emptying the array.
    earthquakeIcons = []; 
    if(countryData["data"][3].empty == true) {
        //Write code here to implement one green marker with "Perhaps quite fortunately, there is no Earthquake data available for this country"
    } else {
        countryData["data"][3].forEach(element => {
            let $psn = [element["lat"], element["lng"]];
            let eq = L.marker([element["lat"], element["lng"]], {icon: earthquakeIcon}).bindPopup(
                "<b>Earthquake</b><br>" +
                "Magnitude: " + element["magnitude"] + "<br>" +
                "Date: " + element["datetime"]
            );
            earthquakeIcons.push(eq);
        });
    }
    earthquakesLayer = L.layerGroup(earthquakeIcons);
    //earthquakeIcons.forEach(element => earthquakesLayer.addLayer(element));
    //mymap.addLayer(markerClusters)

    //earthquakesLayer = L.layerGroup(earthquakes);
    // earthquakes.forEach(element => {
    //     markerClusters.addLayer(element);
    // })
}

function populateWiki() {//Explains the wiki data types used here: http://www.geonames.org/wikipedia/wikipedia_features.html
    socialIcons.forEach(element => mymap.removeLayer(element)); // Remove all previous markers from map before emptying arrays.
    travelIcons.forEach(element => mymap.removeLayer(element));
    natureIcons.forEach(element => mymap.removeLayer(element));
    otherIcons.forEach(element => mymap.removeLayer(element));
    socialIcons = []; 
    travelIcons = []; 
    natureIcons = []; 
    otherIcons = [];

    let data;
    let element = countryData["data"][4];
    let flattenedCoords = dataPrep(borderData);
    if(element.empty == true) {
        //Write code here to implement one blue marker with "no information"
    } else {
        data = element.filter(function(element) {
            return (
                    element["countryCode"] == $('#selectCountry').children(":selected").attr("id") &&
                    raycast([element["lat"], element["lng"]], flattenedCoords
                )
            );
        });
        //Sometime the APIs return data on other countries, despite it being explicitly filtered in the request.
        //The above ensures the data belongs to the selected country and checks to see if items are within it's borders.
        //By using a ray casting algorithm, data placement looks much "tighter" within the country borders.
        //Ray casting was chosen as a simple bounding box didn't offer enough accuracy.
        //Note: multipolygons will have data between polgygons, as bounds is the outer perimeter of the polygon set.
        //This could be improved by raycasting for each polgyon of a multipolygon set. It was decided however that
        //having data inbetween polygon sets for a country made sense in some cases and was therefore OK.
        data.forEach(element => {
            let infoBind =  "<b>" + element["title"] + "</b><br>" +
            "<img class='iconImage' src='" + element["thumbnailImg"] + "'></src><br>" +
            "<a href=https:&#92&#92" + element["wikipediaUrl"] + " target='_blank'>" + element["wikipediaUrl"] + "</a>";
            if(typeof element["feature"] === 'undefined') {
                otherIcons.push(L.marker([element["lat"], element["lng"]], {icon: otherIcon}).bindPopup(infoBind));
            } else {
                switch(element["feature"]) {
                    case("city" || "edu" || "adm1st" || "adm2nd" || "adm3rd" || "church" || "country" || "event"):
                        socialIcons.push(L.marker([element["lat"], element["lng"]], {icon: societyIcon}).bindPopup(infoBind));
                    break;
                    case("railwaystation" || "airport" || "pass"):
                        travelIcons.push(L.marker([element["lat"], element["lng"]], {icon: travelIcon}).bindPopup(infoBind));
                    break;
                    case("waterbody" || "river" || "glacier" || "isle" || "forest" || "mountain"):
                        natureIcons.push(L.marker([element["lat"], element["lng"]], {icon: natureIcon}).bindPopup(infoBind));
                    break;
                    default:
                        otherIcons.push(L.marker([element["lat"], element["lng"]], {icon: otherIcon}).bindPopup(infoBind));
                    break;
                }
            }
        });
    }
    socialLayer = L.layerGroup(socialIcons);
    travelLayer = L.layerGroup(travelIcon);
    natureLayer = L.layerGroup(natureIcons);
    otherLayer = L.layerGroup(otherIcons);
}

function raycast(point, polygon) {//Ensures all icons are within country borders
    //Algorithm logic: A line is drawn out from the icon position to each boundary co-ordinate. 
    //If: Odd intersection with boundaries then inside, else; even intersection is outside.
    let x = point[0];
    let y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        var xi = polygon[i][0], yi = polygon[i][1];
        var xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if(intersect) inside = !inside;
    }
    return inside;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////// 2 EVENT LISTNERS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
$(window).ready(function ($) {
    //Nested into the nav.geolocator function in favour of waiting for user response to location request.
    // $(window).load(function () { 
    //     $('#prescreen').fadeOut('slow');
    //     $('#preloader').fadeOut('slow');
    // });

    //Temporary as geolocater doesn't work without https
    // $latitude = 51.5;
    // $longitude = -0.126;
    // $homeLat = $latitude;
    // $homeLng = $longitude;
    // initialise($latitude, $longitude);
    navigator.geolocation.getCurrentPosition(
        success = pos => {
            $latitude = pos.coords.latitude;
            $longitude = pos.coords.longitude;
            $homeLat = $latitude;
            $homeLng = $longitude;
            initialise($latitude, $longitude);
            $('#prescreen').fadeOut('slow');
            $('#preloader').fadeOut('slow');
        }, error = err => {
            console.warn(`ERROR(${err.code}): ${err.message}`);
            let $latitude = 51.5;
            let $longitude = -0.126;
            $homeLat = $latitude;
            $homeLng = $longitude;
            initialise($latitude, $longitude);
            $('#prescreen').fadeOut('slow');
            $('#preloader').fadeOut('slow');
        }, option = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 3000,
        }
    );
});

function initialise($latitude, $longitude) {
    streetView.addTo(mymap);
    mymap.setView([45, 10], 1); 
    ajaxPopulateOptions();
    ajaxDetermineCountry($latitude, $longitude);
}

$('#selectCountry').change(function(){
    ajaxCountryInformation();
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////// 3 AJAX CALLS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function ajaxPopulateOptions() {
    $.ajax({
        url: "libs/php/ajaxPopulateOptions.php",
        type: 'POST',
        dataType: 'json',
        data: {},
        success: function(result) {
            if (result.status.name == "ok") {
                $("#selectCountry").empty();
                $("#selectCountry").append("<option disabled selected>&ltSelect Country&gt</option>");
                result['data'].forEach(element => {
                    $("#selectCountry").append("<option id='" + element["isoA2"] + "' class='selectCountryOptions' value=-1>" + element["name"] + "</option>");
                });
            };
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR);
            console.log(textStatus);
            console.log(errorThrown);
        }
    });
}

function ajaxDetermineCountry($latitude, $longitude) {
    $.ajax({
        url: "libs/php/ajaxDetermineCountry.php",
        type: 'POST',
        dataType: 'json',
        data: {
            latitude: $latitude,
            longitude: $longitude, 
        },
        success: function(result) {
            if (result.status.name == "ok") {
                //Set dropdown list to identified country
                $("#selectCountry option[id=" + result["code"]["data"] + "]").attr('selected', 'selected');
                //Update users history
                updateHistory(result["code"]["data"]);
                //Set out the country borders
                borderData = result["border"]["data"];
                viewCountry(result["border"]["data"]);
                //Process country data into modals and icons
                countryData = result["data"];
                populateData();
            };
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR);
            console.log(textStatus);
            console.log(errorThrown);
        }
    });
}

function ajaxCountryInformation() {
    $countryName = $('#selectCountry').children(":selected").html();
    $isoA2 = $('#selectCountry').children(":selected").attr("id");
    $.ajax({
        url: "libs/php/ajaxCountryInformation.php",
        type: 'POST',
        dataType: 'json',
        data: {
            countryName: $countryName,
            isoA2: $isoA2,
        },
        success: function(result) {
            if (result.status.name == "ok") {
                //Update users history
                updateHistory($isoA2);
                //Set out the country borders
                borderData = result["border"]["data"];
                viewCountry(result["border"]["data"]);
                //Process country data into modals and icons
                countryData = result["data"];
                populateData();
            };
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR);
            console.log(textStatus);
            console.log(errorThrown);
        }
    });
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////// 4 UTIL FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function updateHistory(id) {
    if(document.getElementById(id).value == -1) {
        document.getElementById(id).value = historySize;
        historyIndex = historySize;
        historySize++;
        if(historyIndex > 0) {leftArrow.enable();}
    } else {
        historyIndex = document.getElementById(id).value;
    }
}



function viewCountry(border) {
    if(countryPolylines) {mymap.removeLayer(countryPolylines);} //Removes pre-existing country polylines from map.
    countryPolylines = L.geoJSON(border, {
            color: 'purple',
            weight: 1,
            opacity: 1,
            smoothFactor: 1,
            noClip: true,
            fill: true,
            fillColor: 'purple',
            fillOpacity: 0.05,
        }
    ).addTo(mymap);
    
    const featureGroup = L.featureGroup([countryPolylines]);

    mymap.fitBounds(featureGroup.getBounds());
}

function dataPrep(coordData) {
    let flattenedCoords;
    switch(coordData["geometry"]['type']) {//Should use ternary operator if data only consists of Polygon and Multipolygon
        case "Polygon":
            flattenedCoords = coordData["geometry"]['coordinates'].flat(1);
            break;
        case "MultiPolygon":
            flattenedCoords = coordData["geometry"]['coordinates'].flat(2);
            break;
    } 
    let temp; //lat and lng co-ordiates in source data are reversed and needs correcting before using the leaflet fitbounds method
    flattenedCoords.forEach(element => {
        temp = element[0];
        element[0] = element[1];
        element[1] = temp; 
    });
    return flattenedCoords;
}




// const layer1 = L.tileLayer('https://{s}.tile.jawg.io/jawg-sunny/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
//     id: "mapID",
// 	attribution: '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
// 	minZoom: 3,
//     maxZoom: 22,
//     zoomDelta: 0.1,
// 	subdomains: 'abcd',
// 	accessToken: 'McTMkEqhVfSUHmhIkT09KjZjp3Vqb1blnqSfLG8v7w9jxOKLmmUKrpx7b43p7kph'
// });
