<?php

    $executionStartTime_gatherCountryInfo = microtime(true);
    //First gather latitude and longitude for the given country code/country-name.
    //This method is used, as earthquake data needs a "bounding box" so it is faster to get this and then calculcate a center point.

    $url = "http://api.geonames.org/countryInfoJSON?username=mcwilcox&country=" . $isoA2;
    
    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_URL, $url);

    $result = json_decode(curl_exec($curl), true);
    $result = $result["geonames"][0];

    $north = $result["north"];
    $south = $result["south"];
    $east = $result["east"];
    $west = $result["west"];
    $latitude = ($north + $south) / 2;
    $longitude = ($east + $west) / 2;

    curl_close($curl);

    $output['data'][0] = $result;
    $timeA = microtime(true) - $executionStartTime_gatherCountryInfo;
    $output['status']['partAReturnedIn'] = (microtime(true) - $executionStartTime_gatherCountryInfo) * 1000 . " ms";

    //Script now utilises curl_multi to asynchronously run multiple CURL requests.
    //https://www.php.net/manual/en/function.curl-multi-init.php    &    http://rustyrazorblade.com/post/2008/curl_multi_exec/

    $url1 = "http://api.worldbank.org/v2/country/" . $isoA2 . "?format=json";
    $url2 = "https://restcountries.eu/rest/v2/alpha?codes=" . $isoA2;
    $url3 = "http://api.geonames.org/earthquakesJSON?username=mcwilcox&maxRows=50&north=" . $north . "&south=" . $south . "&east=" . $east . "&west=" . $west;
    $url4 = "http://api.geonames.org/wikipediaSearchJSON?username=mcwilcox&maxRows=50&q=" . $isoA2;
    $url5 = "api.openweathermap.org/data/2.5/weather?lat=" . $latitude . "&lon=" . $longitude . "&appid=69b3758aeb8a8840b58597d4638c9c4d";

    $urls = array($url1, $url2, $url3, $url4, $url5);
    $urlCount = count($urls);
    $curls = array();
    $master = curl_multi_init();

    for($i = 0; $i < $urlCount; $i++) {
        $url = $urls[$i];
        $curls[$i] = curl_init($url);
        curl_setopt($curls[$i], CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curls[$i], CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curls[$i], CURLOPT_URL, $url);
        curl_multi_add_handle($master, $curls[$i]);
    }

    $url6 = "https://covid19-api.com/country/code?code=" . $isoA2 . "&format=json";
    $curl6 = curl_init();
    curl_setopt_array($curl6, [
        CURLOPT_URL => $url6,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "GET",
        CURLOPT_HTTPHEADER => [
            "x-rapidapi-host: covid-19-data.p.rapidapi.com",
            "x-rapidapi-key: c541d600d0msh6177ebb9a01a8fcp18e7a6jsn755c713492b1"
        ],
    ]);
    curl_multi_add_handle($master, $curl6);

    do {
        curl_multi_exec($master, $running);
    } while($running > 0);

    $output['data'][1] = json_decode(curl_multi_getcontent($curls[0]), true);
    $output['data'][2] = json_decode(curl_multi_getcontent($curls[1]), true);
    $output['data'][3] = json_decode(curl_multi_getcontent($curls[2]), true);
    $output['data'][4] = [];
    $temp = json_decode(curl_multi_getcontent($curls[3]), true);
    $output['data'][5] = json_decode(curl_multi_getcontent($curls[4]), true);
    $output['data'][6] = json_decode(curl_multi_getcontent($curl6), true);

    //Data clean-up to reduce file-transfer size
    $output['data'][1] = $output['data'][1][1][0];
    $output['data'][2] = $output['data'][2][0];
    $output['data'][3] = $output['data'][3]["earthquakes"];
    $output['data'][6] = $output['data'][6][0];

    unset(
        $output["data"][2]["translations"],
        $output["data"][2]["regionalBlocs"]
    );

    foreach($output['data'][3] as &$element) {
        //$element = $temp[0];
        unset(
            $element["eqid"],
            $element["src"],
            $element["depth"]
        );
        $tempVal = explode(" ", $element["datetime"]);
        $tempVal = explode("-", $tempVal[0]);
        $element["datetime"] = $tempVal[2] . "-" . $tempVal[1] . "-" . $tempVal[0];
    }

    foreach($temp['geonames'] as &$element) {
        //The if statement doesn't work for some unknown reason. The element "countryCode" exists yet it's reads as invalid index.
        //Strangely enough, if "countryCode" is replaced with "elevation", it works. If the element "countryCode" is unset, it works.
        // if($element["countryCode"] == $isoA2) {
            unset(
                    $element["elevation"],
                    $element["geoNameId"],
                    $element["lang"],
                    $element["rank"],
                    $element["summary"]
                );
            array_push($output['data'][4], $element);
        // }
    }

    $output['status']['partBReturnedIn'] = (microtime(true) - $executionStartTime_gatherCountryInfo - $timeA) * 1000 . " ms";

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "mission saved";
    $output['status']['returnedIn'] = (microtime(true) - $executionStartTime_gatherCountryInfo) * 1000 . " ms";

    echo json_encode($output);
?>
