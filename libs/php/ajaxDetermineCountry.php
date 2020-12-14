<?php
    $executionStartTime_ajaxDetermineCountry = microtime(true);
    $latitude = $_REQUEST['latitude'];
    $longitude = $_REQUEST['longitude'];
    //Determine Country ISO A2 code from latitude and longitude co-ordinates
    ob_start();
    include "countryReverseGeocode.php";
    $countryCode = json_decode(ob_get_clean());
    $isoA2 = $countryCode->data;
    //Get Country border data using ISO A2 code
    ob_start();
    include "countryBorders.php";
    $countryBorders = json_decode(ob_get_clean());
    $countryName = $countryBorders->data->properties->name;
    //Get Country Information from APIs, primarily by using ISO A2 code. Also, the country name and latitude / longitude co-ordinates
    ob_start();
    include "countryInformation.php";
    $countryInfo = json_decode(ob_get_clean());
    //Set return information
    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "mission saved";
    $output['status']['returnedIn'] = (microtime(true) - $executionStartTime_ajaxDetermineCountry) * 1000 . " ms";
    $output["code"] = $countryCode;
    $output["border"] = $countryBorders;
    $output["data"] = $countryInfo;
    //Return results
    echo json_encode($output); 
?>