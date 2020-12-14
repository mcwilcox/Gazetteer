<?php

    $executionStartTime_reverseGeocode = microtime(true);

    $geonamesKeyAPI = "mcwilcox";

    //This website is much faster than https://opencagedata.com/ (80 ms vs 200-300 ms)
    $url="http://api.geonames.org/findNearbyJSON?username=" . $geonamesKeyAPI . "&lat=" . $latitude . "&lng=" . $longitude;

    $curl = curl_init();
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_URL, $url);

    $result = json_decode(curl_exec($curl), true);

    curl_close($curl);

    $country = $result["geonames"][0]["countryCode"];

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "mission saved";
    $output['status']['returnedIn'] = (microtime(true) - $executionStartTime_reverseGeocode) * 1000 . " ms";
    $output['data'] = $country;

    //header('Content-Type: application/json; charset=UTF-8');

    echo json_encode($output); 

?>