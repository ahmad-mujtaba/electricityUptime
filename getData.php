<?php

include('inc/simple_html_dom.php');
include('inc/credentials.php');

header("Access-Control-Allow-Origin: *");



    date_default_timezone_set("Asia/Kolkata");
    
    $currentDateTime = date("d/m/Y h:i:s A");
        
    $startTime = microtime(true);
    $useragent = 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.5; en-US; rv:1.9.2.3) Gecko/20100401 Firefox/3.6.3';
    $cookie = 'cookie.txt';
    $data = [];
    $loginUrl = 'http://myaccount.gazonindia.com/loginpage.aspx';
    $detailsUrl = 'http://myaccount.gazonindia.com/Masters/usagedetail.aspx';
    $credentials = array(
        'txtUserName' => USERNAME,
        'txtlogPassword' => PASSWORD,
        'btnSubmit' => 'Submit'
    );
    $usageFormParams = array(
        
        'ctl00_ToolkitScriptManager1_HiddenField' => '', 
        'ctl00$ContentPlaceHolder1$txtStDt' => '26/05/2017 06:06:06 PM', 
        'ctl00$ContentPlaceHolder1$ValidatorCalloutExtender1_ClientState' => '', 
        'ctl00$ContentPlaceHolder1$txtEDt' => $currentDateTime, 
        'ctl00$ContentPlaceHolder1$ValidatorCalloutExtender2_ClientState' => '', 
        'ctl00$ContentPlaceHolder1$btnSearch' => 'Search'                             
    );
    
    
    $hiddenFields = array("__EVENTTARGET", "__EVENTARGUMENT", "__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION");
    $hiddenFields2 = array("__EVENTTARGET", "__EVENTARGUMENT", "__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION","__PREVIOUSPAGE");
    $elementDataMap = array(
        "table[id=ctl00_ContentPlaceHolder1_gvUsage]"       => "table"
    );
    $data["mock"] = false;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    //curl_setopt($ch, CURLOPT_PROXY, 'http://brproxy.persistent.co.in:8080');
    //curl_setopt($ch, CURLOPT_PROXYUSERPWD, 'mujtaba_ahmad@persistent.co.in:@gallardo91B');
    curl_setopt($ch, CURLOPT_FAILONERROR, true);
    curl_setopt($ch, CURLOPT_COOKIESESSION, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_COOKIEFILE, $cookie);
    curl_setopt($ch, CURLOPT_COOKIEJAR, $cookie);
    curl_setopt($ch, CURLOPT_USERAGENT, $useragent);
    curl_setopt($ch, CURLINFO_HEADER_OUT, true);
    
    
    // GET  visit login page and setup form params
    curl_setopt($ch, CURLOPT_URL, $loginUrl);    // Setting URL to GET
    curl_setopt($ch, CURLOPT_POST, false);   // Setting method as GET
    $result = curl_exec($ch);    
    
    $dom = str_get_html($result);
    
    foreach($hiddenFields as $field) {
        $hiddenInputs = $dom->find('input[name='.$field.']');
        foreach($hiddenInputs as $e) {        
            $credentials[$field] = $e->getAttribute("value");
            break;
        }
    }
    
    // POST login to the system
    curl_setopt($ch, CURLOPT_URL, $loginUrl);    // Setting URL to POST to
    curl_setopt($ch, CURLOPT_POST, true);   // Setting method as POST
    curl_setopt($ch, CURLOPT_POSTFIELDS, $credentials);  // Setting POST fields as array
    curl_exec($ch);
    
    // GET visit usageDetails page and setup form params
    curl_setopt($ch, CURLOPT_URL, $detailsUrl);    // Setting URL to GET
    curl_setopt($ch, CURLOPT_POST, false);   // Setting method as GET
    $result = curl_exec($ch);
    
    $dom = str_get_html($result);
    
    foreach($hiddenFields2 as $field) {
        $hiddenInputs = $dom->find('input[name='.$field.']');
        foreach($hiddenInputs as $e) {        
            $usageFormParams[$field] = $e->getAttribute("value");
            break;
        }
    }
    
    //print_r($usageFormParams);
    
    $headers = [        
        'Content-Type: application/x-www-form-urlencoded',        
    ];

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    
    // POST submit usage form and get data
    curl_setopt($ch, CURLOPT_URL, $detailsUrl);    // Setting URL to POST to
    curl_setopt($ch, CURLOPT_POST, true);   // Setting method as POST
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($usageFormParams));  // Setting POST fields as array
    $result = curl_exec($ch);
    //echo $result;
    
    
    //print_r(curl_getinfo($ch));
    
    
    
    // Check for errors and display the error message
    if($errno = curl_errno($ch)) {
        $error_message = curl_strerror($errno);
        echo "cURL error ({$errno}):\n {$error_message}";
    }
    
    //echo "<h1>".curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    
    
    $dom = str_get_html($result);
    
    foreach($elementDataMap as $key => $val) {
        foreach($dom->find($key) as $e) {
            $data[$val] = $e->outertext;
            break;
        }
    }
    
    $data["timestamp"] = time();
    $data["timeTaken"] = microtime(true) - $startTime;
    
    $output = "OK".$data["table"]."<div id=\"serverTime\">".round($data["timeTaken"], 2)."s</div>";

    $fp = fopen("js/cached.js", "w+");
    fwrite($fp, "CACHED_DATA='".$output."';");
    fclose($fp);
    
    echo $output;


?>