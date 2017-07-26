$(document).ready(function(){
    var load = function(){    
        IS_LIVE = true;
        currentOutage = 0;
        var errorCallback = function(a, b, c) {
            console.log("Ajax error : "+a+" / "+b+" / "+c);
            IS_LIVE = false;        
            getDataCallback(CACHED_DATA);
            $("#errorMsg").html("An error occurred. Using cached data").slideDown(600);
        };
        $.ajax("getData.php", {
            type            : "GET",
            beforeSend      : function(){
                $("#content").hide();
                $("#wait").show();
                $("#wait .loaderWrapper").html("<div class='loader' style='width:0'>&nbsp;</div>");
                setTimeout(function() {
                    $("#wait .loader").css("width","100%");    
                },0);
                
                
            },
            success         : function(data){
                if(data.indexOf("OK") > -1) {
                    getDataCallback(data);
                } else {
                    errorCallback();
                }            
            },        
            error           : errorCallback,
            dataType        : "html",
            timeout         : 20000
            
        });
        //$.get("getData.php", getDataCallback, "html");
    };
    
    load();
    
    $("#controls input[type='checkbox']").on("change", function(){
        var colName = $(this).attr("data-column");
        if($(this).is(":checked")){
            $("#result tr > ."+colName).show();
        } else {
            $("#result tr > ."+colName).hide();
        }
    });
    
    $("#tubeLight").on("click", load);
    
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
    var lastReportedStr = $("#rawData table tbody tr:nth-child(2) td:nth-child(5)").text()+" "+$("#rawData table tbody tr:nth-child(2) td:nth-child(6)").text();
    console.log(lastReportedStr);
    var lastReported = moment(lastReportedStr, TIME_FORMAT);
    var diff = thisMoment.diff(lastReported);
    var status = "<strong title='OFF'><i class='fa fa-times'></i> OFF</strong><br> <em><i class='fa fa-clock-o'></i> "+niceDuration(diff, false)+"</i></em>";
    if(diff <= THRESHOLD_IN_MS) {
        status = "<strong title='ON'><i class='fa fa-check'></i> ON</strong>";
        $("body").addClass("powerOn");
    } else {
        $("body").addClass("powerOff");
        currentOutage = diff;
    }
    $("#powerStatus").html(status);
}

function processData() {
    var sessions = [];          
    var MILLIS_IN_A_DAY = 8.64e+7;
        
    var lastRowNum = $("#rawData table tbody tr:last-child").index();
    for(var i=lastRowNum; i>1; --i) {
        $("#rawData table tbody tr:nth-child("+i+")").each(function(){
            
            sessions.push(moment($(this).find("td:nth-child(3)").text()+" "+$(this).find("td:nth-child(4)").text(), TIME_FORMAT));
            sessions.push(moment($(this).find("td:nth-child(5)").text()+" "+$(this).find("td:nth-child(6)").text(), TIME_FORMAT));
        });
    }        
    
    var html ="";
    var maxUptimeMs = 0;
    var outageToday = 0;
    var maxUptimeStr = "";
    for(i = 0; i < sessions.length;) {
        
        var startIndex = i-1;
        var endIndex = i;
        if(i=== 0 || i === sessions.length -2) {
            startIndex = i;
            endIndex = i+1;
        }
        
        var tmpMs = sessions[endIndex].diff(sessions[startIndex]);
        if(tmpMs > maxUptimeMs) {
            maxUptimeMs = tmpMs;
            maxUptimeStr = niceDuration(maxUptimeMs)+" <br><span>"+sessions[startIndex].format("D/MM/YY hh:mm A")+" to <br>"+sessions[endIndex].format("D/MM/YY hh:mm A")+"</span> ";
        }
        
        
        if(i > 0 && i < sessions.length-1) {
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
                    
                    html+="<tr data-day='"+t.format("YYYY-DDDD")+"' data-week='"+t.format("YYYY-WW")+"' data-month='"+t.format("YYYY-MM")+"' data-durationMs='"+ms+"'>";
                    html+="<td>"+t.format("ddd")+"</td>";
                    html+="<td>"+t.format("DD/MM/YY")+"</td>";        
                    html+="<td>"+outageStart+"</td>";
                    html+="<td>"+outageEnd+"</td>";
                    html+="<td>"+niceDuration(ms)+"</td>";
                    html+="</tr>";
                    
                    t = t.add(1, "d");
                }
                
            } else {
                
                var ms = sessions[i+1].diff(sessions[i]);
                html+="<tr data-day='"+sessions[i].format("YYYY-DDDD")+"' data-week='"+sessions[i].format("YYYY-WW")+"' data-month='"+sessions[i].format("YYYY-MM")+"' data-durationMs='"+ms+"'>";
                html+="<td>"+sessions[i].format("ddd")+"</td>";
                html+="<td>"+sessions[i].format("DD/MM/YY")+"</td>";        
                html+="<td>"+sessions[i].format("hh:mm:ss A")+"</td>";
                html+="<td>"+sessions[i+1].format("hh:mm:ss A")+"</td>";        
                html+="<td>"+niceDuration(ms)+"</td>";
                html+="</tr>";    
            }
            ++i;        
        }
        ++i;
    }
    
    $("#result table tbody").html(html);
    
    
    // inserting rows with 100% uptime :
    //
    $("#result table tbody tr").each(function(){
        var thisRowDay = parseInt(moment($(this).attr("data-day"), "YYYY-DDD").format("DDD"));
        var nextRowDay = parseInt(moment($(this).next("tr").attr("data-day"), "YYYY-DDD").format("DDD"));
        if(nextRowDay - thisRowDay > 1) {
            var t = moment($(this).attr("data-day"), "YYYY-DDD");
            var html = "";
            for(var i=0; i < (nextRowDay - thisRowDay -1); ++i) {
                t = t.add(1, "d");
                
                html+="<tr class='uptime100' data-day='"+t.format("YYYY-DDDD")+"' data-week='"+t.format("YYYY-WW")+"' data-month='"+t.format("YYYY-MM")+"' data-durationMs='0'>";
                html+="<td>"+t.format("ddd")+"</td>";
                html+="<td>"+t.format("DD/MM/YY")+"</td>";        
                html+="<td>--</td>";
                html+="<td>--</td>";        
                html+="<td>"+niceDuration(0)+"</td>";
                html+="</tr>"; 
            }
            $(this).after(html);
        }
        
    });
    
    
    var meanOutage = null;
    var totalOutage = 0;
    var meanUptime = null;
    var visitedDays = [];
    var visitedWeeks = [];
    var visitedMonths = [];
    $("#result table tbody tr").each(function(){
    
        var $thisTr = $(this);
        var day = $(this).attr("data-day");
        var week = $(this).attr("data-week");
        var month = $(this).attr("data-month");
        var today = moment().format("YYYY-DDD");
        
        // sigma day
        if(visitedDays.indexOf(day) === -1) {
            var outageSum = 0;
            var numRecords = 0;
            $("#result table tbody tr[data-day='"+day+"']").each(function(){
                var tmpOutage = parseInt($(this).attr("data-durationMs"));
                outageSum += tmpOutage;
                ++numRecords;
                
                if(!$(this).is($thisTr)) {
                    $(this).find("td:nth-child(1), td:nth-child(2)").remove();
                }
                if(day === today) {
                    outageToday+=tmpOutage;
                }
            
            });
            var dayUptime = (100-((outageSum/MILLIS_IN_A_DAY)*100));
            if (meanOutage === null) {
                meanOutage = outageSum;
            } else {
                meanOutage = (meanOutage + outageSum) / 2;
            }
            totalOutage += outageSum;
            if (meanUptime === null) {
                meanUptime = dayUptime;
            } else {
                meanUptime = (meanUptime + dayUptime) / 2;
            }
            $(this).append("<td class='sigma-day' rowspan="+numRecords+">"+niceDuration(outageSum)+" <br> <span class='sum-uptime sum-uptime-day' title='Uptime'><i class='fa fa-bolt'></i> "+dayUptime.toFixed(0)+"%</span></td>");
            //$(this).append("<td rowspan="+numRecords+">"+dayUptime.toFixed(1)+"%</td>");
            
            $(this).find("td:nth-child(1), td:nth-child(2)").attr("rowspan", numRecords);
            
            visitedDays.push(day);
        }
             
        // sigma week   
        if(visitedWeeks.indexOf(week) === -1) {
            var outageSumWeek = 0;
            var numRecordsWeek = 0;
            $("#result table tbody tr[data-week='"+week+"']").each(function(){
                outageSumWeek += parseInt($(this).attr("data-durationMs"));
                ++numRecordsWeek;
            });
            $(this).append("<td class='sigma-week' rowspan="+numRecordsWeek+">"+niceDuration(outageSumWeek)+"</td>");            
            visitedWeeks.push(week);
        }
        
        // Sigma month
        if(visitedMonths.indexOf(month) === -1) {
            var outageSumMonth = 0;
            var numRecordsMonth = 0;
            $("#result table tbody tr[data-month='"+month+"']").each(function(){
                outageSumMonth += parseInt($(this).attr("data-durationMs"));
                ++numRecordsMonth;
            });
            var monthName = moment(month, "YYYY-MM").format("MMM YY");
            
            var tmp = "<td class='sigma-month' rowspan="+numRecordsMonth+"><span class='month-indicator'>"+monthName+"</span><br>"+niceDuration(outageSumMonth)+"</td>";
            $(this).append(tmp);            
            visitedMonths.push(month);
        }
        
    });
    
    
        
    $("#date span.value").html("26/5/17 &mdash; "+moment().format("D/M/YY"));
    $("#total_outage span.value").html(niceDuration(totalOutage));
    $("#avg_outage span.value").html(niceDuration(meanOutage));
    $("#avg_uptime span.value").html(meanUptime.toFixed(1)+"%");
    $("#max_uptime span.value").html(maxUptimeStr);
    $("#today_outage span.value").html(niceDuration(outageToday+currentOutage));
    
    $("#request_time span.value").html($("#rawData #serverTime").html());
    
    $("#wait").hide();
    $("#content").show();
    
    $("#rawData").empty();
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
    return ms === 0 ? "0m":tmp;
}