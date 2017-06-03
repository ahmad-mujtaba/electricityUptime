$(document).ready(function(){
        
    IS_LIVE = true;
    $.ajax("getData.php", {
        type            : "GET",
        success         : getDataCallback,        
        error           : function(a, b, c) {
            console.log("Ajax error : "+a+" / "+b+" / "+c);
            IS_LIVE = false;        
            getDataCallback(DUMMYDATA);
        },
        dataType        : "html"
        
    });
    //$.get("getData.php", getDataCallback, "html");
    
});

var TIME_FORMAT = "DD-MM-YYYY h:mm:ssA";


function getDataCallback(htmlData) {
    
    $("#rawData").html(htmlData);
    checkPowerStatus();
    processData();
    
    
}

function checkPowerStatus() {
    var THRESHOLD_IN_MS = 90000;    // 1.5min
    var thisMoment = moment();
    var lastReportedStr = $("#rawData table tbody tr:nth-child(2) td:nth-child(4)").text()+" "+$("#rawData table tbody tr:nth-child(2) td:nth-child(5)").text();
    console.log(lastReportedStr);
    var lastReported = moment(lastReportedStr, TIME_FORMAT);
    var diff = thisMoment.diff(lastReported);
    var status = "<strong>Power OFF</strong><br> <em>since "+niceDuration(diff, false)+"</em>";
    if(diff <= THRESHOLD_IN_MS) {
        status = "<strong>Power ON</strong>";
        $("body").addClass("powerOn");
    }
    $("#powerStatus").html(status);
}

function processData() {
    var sessions = [];          
    var outages = [];
    var MILLIS_IN_A_DAY = 8.64e+7;
    var MILLIS_IN_A_WEEK = MILLIS_IN_A_DAY * 7;
    
    
    var lastRowNum = $("#rawData table tbody tr:last-child").index();
    for(var i=lastRowNum; i>1; --i) {
        $("#rawData table tbody tr:nth-child("+i+")").each(function(){
            
            sessions.push(moment($(this).find("td:nth-child(2)").text()+" "+$(this).find("td:nth-child(3)").text(), TIME_FORMAT));
            sessions.push(moment($(this).find("td:nth-child(4)").text()+" "+$(this).find("td:nth-child(5)").text(), TIME_FORMAT));
        });
    }        
    
    var html ="";
    for(var i = 1; i < sessions.length-1; i+=2) {
        
        
        if (sessions[i+1].format("YYYY-DDDD") !== sessions[i].format("YYYY-DDDD")) {
            var d  = sessions[i+1].diff(sessions[i], 'days') + 1;
            
            var  t = moment(sessions[i]);
            var startMoment = moment(sessions[i]);
            var endMoment = moment(sessions[i+1]);
            for(var j=0;j <=d;++j) {
                
                var outageStart = startMoment.format("hh:mm:ss A");
                var outageEnd = endMoment.format("hh:mm:ss A");                
                
                console.log(t.format("YYYY-DDDD")+" === "+endMoment.format("YYYY-DDDD"));
                if (t.format("YYYY-DDDD") === startMoment.format("YYYY-DDDD")) {
                    t = t.endOf('day');
                    var ms = t.diff(startMoment);
                    outageEnd = "--";
                } else if (t.format("YYYY-DDDD") === endMoment.format("YYYY-DDDD")) {
                    var ms = endMoment.diff(t.startOf('day'));
                    outageStart = "--";
                } else {
                    outageStart = "--";
                    outageEnd = "--";
                    var ms = MILLIS_IN_A_DAY;
                }
                
                html+="<tr data-day='"+t.format("YYYY-DDDD")+"' data-week='"+t.format("YYYY-WW")+"' data-durationMs='"+ms+"'>";
                html+="<td>"+t.format("ddd")+"</td>";
                html+="<td>"+t.format("DD/MM/YYYY")+"</td>";        
                html+="<td>"+outageStart+"</td>";
                html+="<td>"+outageEnd+"</td>";
                html+="<td>"+niceDuration(ms)+"</td>";
                html+="</tr>";
                
                t = t.add(1, "d");
            }
            
        } else {
            
            var ms = sessions[i+1].diff(sessions[i]);
            html+="<tr data-day='"+sessions[i].format("YYYY-DDDD")+"' data-week='"+sessions[i].format("YYYY-WW")+"' data-durationMs='"+ms+"'>";
            html+="<td>"+sessions[i].format("ddd")+"</td>";
            html+="<td>"+sessions[i].format("DD/MM/YYYY")+"</td>";        
            html+="<td>"+sessions[i].format("hh:mm:ss A")+"</td>";
            html+="<td>"+sessions[i+1].format("hh:mm:ss A")+"</td>";        
            html+="<td>"+niceDuration(ms)+"</td>";
            html+="</tr>";    
        }
    }
    
    $("#result table tbody").html(html);
    
    
    
    var meanOutage = null;
    var meanUptime = null;
    var visitedDays = [];
    var visitedWeeks = [];
    $("#result table tbody tr").each(function(){
    
        var $thisTr = $(this);
        var day = $(this).attr("data-day");
        var week = $(this).attr("data-week");
        
        if(visitedDays.indexOf(day) === -1) {
            var outageSum = 0;
            var numRecords = 0;
            $("#result table tbody tr[data-day='"+day+"']").each(function(){
                outageSum += parseInt($(this).attr("data-durationMs"));
                ++numRecords;
                
                if(!$(this).is($thisTr)) {
                    $(this).find("td:nth-child(1), td:nth-child(2)").remove();
                }
            
            });
            var dayUptime = (100-((outageSum/MILLIS_IN_A_DAY)*100));
            if (meanOutage === null) {
                meanOutage = outageSum;
            } else {
                meanOutage = (meanOutage + outageSum) / 2;
            }
            if (meanUptime === null) {
                meanUptime = dayUptime;
            } else {
                meanUptime = (meanUptime + dayUptime) / 2;
            }
            $(this).append("<td rowspan="+numRecords+">"+niceDuration(outageSum)+"</td>");
            $(this).append("<td rowspan="+numRecords+">"+dayUptime.toFixed(1)+"%</td>");
            
            $(this).find("td:nth-child(1), td:nth-child(2)").attr("rowspan", numRecords);
            
            visitedDays.push(day);
        }
                
        if(visitedWeeks.indexOf(week) === -1) {
            var outageSumWeek = 0;
            var numRecordsWeek = 0;
            $("#result table tbody tr[data-week='"+week+"']").each(function(){
                outageSumWeek += parseInt($(this).attr("data-durationMs"));
                ++numRecordsWeek;
            });
            $(this).append("<td rowspan="+numRecordsWeek+">"+niceDuration(outageSumWeek)+"</td>");
            $(this).append("<td rowspan="+numRecordsWeek+">"+(100-((outageSumWeek/MILLIS_IN_A_WEEK)*100)).toFixed(1)+"%</td>");                    
            visitedWeeks.push(week);
        }
        
        
    });
    
    $("#wait").hide();
    $("#result").show();
    $("#avg_outage").html("Mean Outage<br> <strong>"+niceDuration(meanOutage)+"</strong>");
    $("#avg_uptime").html("Mean Uptime<br> <strong>"+meanUptime.toFixed(1)+"%</strong>");
}

function niceDuration(ms, includeSecond) {
    console.log("ms = "+ms);
    
    var tmp = "";
    var d = moment.duration(ms);
    var hours = Math.floor(d.asHours());
    var minutes = moment.utc(ms).format("mm");
    var seconds =  moment.utc(ms).format("ss");
    
    if(parseInt(hours) > 0) {        
        tmp+=hours+"h ";
    }
    if(parseInt(hours) > 0 || parseInt(minutes) > 0) {
        tmp+=minutes+"m ";
    }
    if (includeSecond !== undefined && includeSecond === true){
        tmp+=seconds+"s";
    }        
    return tmp;
}