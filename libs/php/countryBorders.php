<?php

    $executionStartTime_countryBorders = microtime(true);

    $countryData = json_decode(file_get_contents("../json/countryBordersGeo.json", false), true);

    $borders = "Unknown";

    foreach($countryData["features"] as $countryISO) {
        if($countryISO["properties"]["iso_a2"] == $isoA2) {
            $borders = $countryISO;
        }
    }

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "mission saved";
    $output['status']['returnedIn'] = (microtime(true) - $executionStartTime_countryBorders) * 1000 . " ms";
    $output['data'] = $borders;

    //header('Content-Type: application/json; charset=UTF-8');

    echo json_encode($output); 

?>