document.querySelector('#menu button').onclick = () => searchAndShowWeather(document.querySelector('#menu input').value);
document.querySelector('#menu input').addEventListener(
    'keyup', (e) => {
        if (e.keyCode === 13) {
            searchAndShowWeather(document.querySelector('#menu input').value);
        }
    }
);
document.querySelector('#menu input').addEventListener(
    'input', (e) => {
        let input = document.querySelector('#menu input').value;
        if ((input.length >= 3 && !isPostalCode(input)) || (input.length === 5 && isPostalCode(input))) {
            let type = isPostalCode(input) ? 'codePostal' : 'nom';
            fetch(`https://geo.api.gouv.fr/communes?${type}=${input}&fields=noms,codesPostaux,centre&boost=population&limit=5`)
                .then((response) => response.json()
                    .then((json) => {
                        suggestions = []
                        for (let city of json) {
                            suggestions.push({
                                label: city['nom'] + ': ' + city['codesPostaux'][0],
                                value: city['codesPostaux'][0]
                            });
                        }
                        if (suggestions.length > 0) {
                            $(".autocomplete").autocomplete({
                                source: suggestions,
                                select: (event, ui) => {
                                    searchAndShowWeather(ui.item.value);
                                }
                            });
                        }
                    })
                );
        }
    }
);

function isPostalCode(code) {
    return /\d/.test(code);
}

function error(error) {
    //console.error(error);
    document.querySelector('#spinner').hidden = true;
    document.querySelector('#current_condition').innerHTML = '<br><i>Aucune donnée météo pour ' + document.querySelector('#menu input').value + '</i>';
    document.querySelector('#current_condition').hidden = false;
}

function searchAndShowWeather(input) {
    document.querySelector('#spinner').hidden = false;
    document.querySelector('#forecast').hidden = true;

    if (input.split(',').length > 1) {
        let lat = input.split(',')[0];
        let lng = input.split(',')[1];
        setCenter(lng, lat);
        fetchWeatherApi(`lat=${lat}lng=${lng}`);
    } else if (isPostalCode(input)) {
        fetch(`https://geo.api.gouv.fr/communes?codePostal=${input}&fields=centre`)
        .then(response => response.json().then((json) => {
            setCenter(json[0]['centre']['coordinates'][0], json[0]['centre']['coordinates'][1]);
            fetchWeatherApi(json[0]['nom'])
        }))
        .catch((e) => error(e));
    } else {
        fetch(`https://geo.api.gouv.fr/communes?nom=${input}&fields=centre`)
        .then(response => response.json().then((json) => {
            setCenter(json[0]['centre']['coordinates'][0], json[0]['centre']['coordinates'][1]);
            fetchWeatherApi(json[0]['nom'])
        }))
        .catch((e) => error(e));
    }
}

function fetchWeatherApi(input) {
    fetch(`https://www.prevision-meteo.ch/services/json/${input}`,
        {
            method: 'GET'
        })
    .then(response => response.json().then((json) => {
        try {
            showWeather(json);
        } catch (e) {
            error(e);
        }
    }))
    .catch((e) => error(e));
}

function showWeather(json) {

    // Current condition
    document.querySelector('#current_condition').innerHTML = '';
    document.querySelector('#current_condition').hidden = true;

    // Current condition: icon
    let img = document.createElement('img');
    img.src = json['current_condition']['icon_big']
    let icon = document.createElement('div');
    icon.appendChild(img);

    // Current condition: details
    let details = document.createElement('div');
    details.id = 'details';

    let title = document.createElement('div');
    title.className = 'title';
    title.innerHTML = (
        json['current_condition']['tmp'] + '°C à ' +
        json['city_info']['name'] + ', ' +
        json['city_info']['country']
    );

    let subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.innerHTML = (
        json['current_condition']['condition'] + ', vents ' +
        json['current_condition']['wnd_spd'] + '/' +
        json['current_condition']['wnd_gust']
    );

    details.appendChild(title);
    details.appendChild(subtitle);

    document.querySelector('#current_condition').appendChild(icon);
    document.querySelector('#current_condition').appendChild(details);
    document.querySelector('#current_condition').hidden = false;

    // Forecast
    document.querySelector('#forecast').innerHTML = '';
    document.querySelector('#forecast').hidden = true;
    for (let nb of ['1', '2', '3', '4']) {
        let fcstJson = json['fcst_day_' + nb];

        let fcst = document.createElement('div');
        if (nb === '4') fcst.className = 'last';

        let day = document.createElement('span');
        day.innerHTML = fcstJson['day_long'];

        let img = document.createElement('img');
        img.src = fcstJson['icon'];

        let tmp = document.createElement('span');
        tmp.innerHTML = fcstJson['tmin'] + '°C / ' + fcstJson['tmax'] + '°C'

        fcst.appendChild(day);
        fcst.appendChild(document.createElement('br'));
        fcst.appendChild(img);
        fcst.appendChild(document.createElement('br'));
        fcst.appendChild(tmp);

        document.querySelector('#forecast').appendChild(fcst);
    }
    document.querySelector('#forecast').hidden = false;

    document.querySelector('#spinner').hidden = true;
}

let osm = new ol.layer.Tile({
    source: new ol.source.OSM()
});

let map = new ol.Map({
    layers: [osm],
    target: 'map',
    view: new ol.View({
      center: ol.proj.transform([-1.8118500054456526, 52.4431409750608], 'EPSG:4326', 'EPSG:3857'),
      zoom: 11
    })
});

map.on("click", (e) => {
    let latLon = ol.proj.toLonLat(e.coordinate);
    searchAndShowWeather(latLon[1].toFixed(2) + ',' + latLon[0].toFixed(2));
});

let oldLayer;
function setCenter(lon, lat) {
    map.setView(
        new ol.View({
            center: ol.proj.transform([ lon, lat ], "EPSG:4326", "EPSG:3857"),
            zoom: 11
        })
    );

    if (oldLayer !== undefined) map.removeLayer(oldLayer);
    oldLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [
                new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
                })
            ]
        })
    });
    map.addLayer(oldLayer);
}

setCenter(-0.58, 44.84);