<?php
    $executionStartTime_ajaxPopulateOptions = microtime(true);
    //Get all country border data
    $countryData = json_decode(file_get_contents("../json/countryBordersGeo.json", false), true);
    //Prepare an empty array for storing the desired data
    $countryProperties = [];
    //Cycle through each country and push desired data into the countryProperties array
    foreach($countryData["features"] as $feature) {
        //array_push($countryProperties, array($feature["properties"]["name"], $feature["properties"]["isoA2"])); 
        $temp = null;
        $temp['name'] = $feature["properties"]['name'];
        $temp['isoA2'] = $feature["properties"]['iso_a2'];
        array_push($countryProperties, $temp);
    }   // result is $countryProperties = [[country1][iso1], [country2][iso2], ...]
    //Sort data. The result is a sorted array by the 0-index of each sub-array in alhabetical order
    usort($countryProperties, function($element1, $element2) {
        return $element1["name"] <=> $element2["name"];
    });
    //Set return information
    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "mission saved";
    $output['status']['returnedIn'] = (microtime(true) - $executionStartTime_ajaxPopulateOptions) * 1000 . " ms";
    $output['data'] = $countryProperties;
    //Return results
    echo json_encode($output); 

?>