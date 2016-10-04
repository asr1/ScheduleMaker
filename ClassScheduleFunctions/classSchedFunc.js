//Hopefully you're ready for a completely "hacky" plugin - seriously don't judge ヽ（´ー｀）┌

//The main functionality of this part of the Access++ extension is to add the Rate My Professor functionality, but it will also get the needed information
//for the google calendar exportation, such as: class name, beginning and end date, dates, ect... The information will be saved in classInfo objects, which will
//be stored in an array. When a class contains multiple meeting times at different times, such as: Math M,W @ 10:00 and T,R @8:00; independed classInfo objects will
//be created. ClassInfo1: name: Math, meetingDays: M, W; Meeting Times: 10:00 A, Meeting End Time: 11:00A, startendDate: : 01/15/2014-05/25/2014
//be created. ClassInfo2: name: Math, meetingDays: T, R; Meeting Times: 8:00 A, Meeting End Time: 9:00A, startendDate: : 01/15/2014-05/25/2014

var url =  window.location.href;
var accessPlus = "https://accessplus.iastate.edu/servlet/adp.A_Plus"; //possible url for access plus after first access
var accessPlus1 = "https://accessplus.iastate.edu/servlet/adp.A_Plus?A_Plus_action=/R480/R480.jsp&SYSTEM=R480&SUBSYS=006&SYSCODE=CS&MenuOption=7"; //possible url for access plus

//var test = "file:///home/flavia/Download/Class%20Schedule.html";

var img = document.createElement("img");
img.src = "https://i.imgur.com/dSvcdl.gif"; //I regret nothing

var clicked = false;

var element = $('#long'); //where we're going to append our RMP div to
var Name; //keeps track of the name of the current prof being read
var idStart = 2; //2 should be a pretty good place to start searching
var tdId; //keeps track of the current tdId being read

var profs = []; //will store the prof's names here

var numRMPEntries = 0; //counter for the number of RMP entries -- mostly used for CSS

 //Classes can have multiple meeting times at different places, if this happens then the
								 //arrays containing the class information will have varying length. As such we should keep track
								 //of the amount of times we get multiple consecutive meeting dates. When several meeting dates are found,
								 //we should duplicate the class name and start/end date, allowing for the creation of a new Calendar object.
var lastClassName = "";
var lastStartEnd = "";

//All of these arrays are temporary, they will be used to generate classInfo objects later on
var classNames = []; //will store all of the student's class' names
var meetingD = []; //will store all of the student's class' meeting days
var meetingsT = []; //will store all of the student's class' meeting times (start)
var meetingeT = []; //will store all of the student's class' meeting times (end)
var startEndDate = []; //will store all of the student's class' start/end dates
var locations = []; //will store the class' locations

var classInfoArr = []; //will store objects which contain (hopefully) all of the necessary information for google Calendar

//whether a calendar was created successfully or not
var convSuccess = false;

var toPrint = ""; //Used for testing purposes -- concatenates information to be printed

//ClassInfo object, each object will contain all needed information for the calendar exportation
//name - class name
//mDays - meeting days, all days of the week where the class meets
//mTimesS - meeting times (start)
//mTimesE - meeting times (end)
//mDates - the dates of when the class ends and starts in a semester
//loc - class location
//After each object is created, they will be saved in an array
//access their parameters by, for example calling, classInfo.name to retrieve the name
function classInfo(name, mDays, mTimesS, mTimesE, mDates, loc){
		this.name = name;
		this.mDays = mDays;
		this.mTimesS = mTimesS;
		this.mTimesE = mTimesE;
		this.mDates = mDates;
		this.loc = loc;
}

//AccessPlus is a website which was most definetly not created with plans for future development.
//No. Whoever developed this ancient tome decided to write this masterpeace as if we were still stuck in the 80s,
//where friggin ids were mythical beings who should never be disturbed for fear of divine retribution.
//So how on earth are we supposed to find the ridiculous amount of data that we need in order to get this plugin to work??
//I decided to wholeheartedly embrace hacky code
//In other words: lets inject an id for each table and use them to search for the required info. IN YOUR FACE ACCESS PLUS
//-----------------------------------------------------------------------------

//Keeps track of the current row id
function tdID(){
	tdId = 'tr' + idStart;
	idStart++;
}

//Gives ids to every table data and table row that includes class information
function updateIDs() {
	$("#long").children().children().children().each(function (i) { // (╯°□°）╯︵ ┻━┻
		$(this).attr('id', 'tr' + i);
	});

	tdID();

	while ($('#' + tdId).length){
		$('#' + tdId).children().each(function (i) {
			$(this).attr('id', tdId + 'td' +i);
			checkName($(this).attr('id'));
			checkDates($(this).attr('id'));
			checkClassName($(this).attr('id'));
			checkMeetingDays($(this).attr('id'));
		});
		tdID();
	}
}

//----------------------------</idUpdate>----------------------------------------


//--------------------- Related to Rate my Prof ---------------------------------

//As the same teacher can be found multiple times, we have to make sure not to
//repeat the name while linking to the teacher's RMP page
//This method also gets rid of blank spots - when a professor is not yet defined for a class
//@param - arr- given array with teacher names
function remRepeats(arr){
 	var el;
	var result = [];

	$.each(arr, function(i, e) {
       if ($.inArray(e, result) === -1) result.push(e);
   });

   //Search for spots that do not have letters or that are blank
   for (i = 0; i < result.length; i++){
       if (!/[a-zA-Z]/.test(result[i]) || /%20/g.test(result[i])) {
           result.splice(i,1); //remove a single item at pos i
       }
   }
//    if (!/[a-zA-Z]/.test(result[0]) || /%20/g.test(result[0])) {
//           result.shift(); //removes the first element if it is blank
//    }
    return result;
}

//Parses the given name to separate the first name from the last name
//includes a ',' to the last name
//@param name - teachers name
function parseName(name){
	var splited = name.split(',');
	splited[0] + ',';
	return splited;
}

//Checks whether the row associated with the given id includes a 'mailto:' string,
//if so we assume that the teacher's name will soon follow
//@param id - id of the given row
function checkName(id){
	var tr = '#' + id;

	if ($(tr).html().indexOf('mailto:') !== -1){
		var prof = $('#' + id).html().split('>');
		Name = prof[1].split('<');
		profs.push(Name[0]);
		//i++;
	}
}

//----------------------------- </Related to Rate my Prof>------------------------


//------------------------ Calendar ----------------------------------------------

function cleanDates(id){
    var tr = '#' + id;
    var text = $(tr).html();

    for (i = 0; i < text.length; i++){
        if (text.charAt(i) == " ") text = text.replace(" ", "");
        if (text.charAt(i) == "&") text = text.replace("&nbsp;", "");
    }
    text = text.replace("&nbsp;", "");
    text = text.replace(" ", "");
    return text;

}

function contDays(text){
    if (text.indexOf('M') !== -1 || text.indexOf('T') !== -1 || text.indexOf('W') !== -1 || text.indexOf('R') !== -1 || text.indexOf('F') !== -1 || text.indexOf('S') !== -1 || text.indexOf('MTWRF') !== -1){
        return true;
    }
}

//Checks to see whether the given row contains any "Days of the Week", such as M for Monday, T for Tuesday, ect...
function containsDW(id){
	var tr = '#' + id;
    var text = $(tr).html();

    if ($(tr).html().indexOf("&nbsp;&nbsp;&nbsp;") != -1 && text.indexOf("<b>") == -1 && contDays(text)){
        text = cleanDates(id);
        if (contDays(text)){ //im paranoid. making sure we have the expected days even after cleaning up the text field
            return true;
        }
    }
}

//Will increment the given id by the given amount
function incrementID (id, n){
	var num = id.substr(id.length - 2); //limited to double digit numbers
	var sliced = id.slice(0, id.length - 1);
	var ID = '#' + sliced;
	var intRegex = /^\d+$/;

	if (intRegex.test(num.charAt(0))){
		ID += (parseInt(num) + n).toString(); //both elements are numbers
	}
	else {
		ID += (parseInt(num.charAt(1)) + n).toString(); //only the last element is a number
	}

	return ID;
}

//Will update the meeting times arrays
//This function has to be called in the 'main' method since not all table ids have been
//fully created by the time checkDates is called -> startTime and endTime have a higher id number than the one
//associated with class dates
//start - array containing all start time table ids
//end - array containing all end time table ids
function getStartEndTime(start, end){
	var startTime = "";
	var endTime = "";

	if (start.length != end.length) return null;

	for (i = 0; i < start.length; i++){ //start and end have to have the same length
		startTime = $(start[i]).html();
		endTime = $(end[i]).html();
		meetingsT[i] = startTime;
		meetingeT[i] = endTime;
	}
}

//Will update the locations array
//This function has to be called in the 'main' method since not all table ids have been
//fully created by the time checkDates is called -> startTime and endTime have a higher id number than the one
//associated with class dates
//loc - array containing all of the location ids
function getLocations(loc){
	var place = "";

	for (i = 0; i < loc.length; i++){
		place = $(loc[i]).html();
		locations[i] = place;
	}
}

//Will update the meeting dates array
//This function has to be called in the 'main' method since not all table ids have been
//fully created by the time checkMeetingDates is called -> meetingDate has a higher id number than the one
//associated with class dates
//dates - array containing all meeting dates table ids
function getMeetingDates(dates){
	var meetingDate = "";

	for (i = 0; i < dates.length; i++){
		meetingDate = $(dates[i]).html();
		if (typeof(meetingDate) != "undefined"){
				startEndDate[i] = meetingDate;
				lastStartEnd = meetingDate;
		}

	}
}

//Checks whether the row associated with the given id has any association with the class dates,
//if so, it'll save the class days and its start/end time
//@param id - id of the given row
function checkDates(id){
	var tr = '#' + id;

	if ($(tr).html().indexOf('&nbsp;') != -1 && containsDW(id) || $(tr).html().indexOf('ARR.') != -1 || $(tr).html().indexOf('Required') != -1){
		var date = $(tr).html().split(';');

		if (date[3].indexOf('section') == -1){ // This test will guarantee its a valid date as A+ code will some time generate false positives
			meetingD.push(date[3]);
			if(classNames[meetingD.length - 1] == null){
				classNames.push(lastClassName);
			}
			if(startEndDate[meetingD.length - 1] == null) startEndDate.push(lastStartEnd);
			var startTime = incrementID(id, 1);
			var endTime = incrementID(id, 2);
			meetingsT.push(startTime);
			meetingeT.push(endTime);
			var location = incrementID(id, 3);
			locations.push(location);
		}
	}
}

//Checks whether the row associated with the given id contains the class' name,
//if so, it'll save the class name
//@param id - id of the given row
function checkClassName(id){
	var tr = '#' + id;
	if($(tr).html().indexOf('<!-- %=') != -1){
		var names = $(tr).html().split('nd()">');
        if (names[1] == undefined){ //friggin experimental classes
            names = $(tr).html().split('/exp/">');
        }
		var Names = names[1].split('</a>'); //names[1] contains the class name, but it also includes a ton of stuff after it that we do not care about
		classNames.push(Names[0]);
		lastClassName = Names[0];
	}
}

//Checks whether the row associated with the given id contains the class' meeting dates,
//if so, it'll save the class name
//@param id - id of the given row
function checkMeetingDays(id){
	var tr = '#' + id;

	if ($(tr).html().indexOf('Meeting Dates:') != -1){
		var meetId = incrementID(id, 1); //the meeting days are in the following table
		startEndDate.push(meetId);
	}
}

//Returns an array of classInfo objects
//Also deals with retrieving the class meeting times
//arrCN - an array containing the class names
//arrMD - an array containing meeting days
//arrMTS - an array containing meeting times (start)
//arrMTE - an array containing meeting times (end)
//arrST - an array containing the class' start date
//arrFT - an array containing the class' end date
function createClassInfo(arrCN, arrMD, arrMTS, arrMTE, arrDates, arrLoc){
	var obj;

	for (i = 0; i < arrCN.length; i++){
		obj = new classInfo(arrCN[i], arrMD[i], arrMTS[i], arrMTE[i], arrDates[i], arrLoc[i]);
		if(arrMD[i].indexOf('ARR.') != -1 )
		{
			continue;
		}
		classInfoArr.push(obj);
	}

}

//THis function will get rid of the pesky elements that make zero sense and managed to get through my parser
//AccessPlus.. WHY CAN'T YOU FOLLOW YOUR OWN CODING RULES???
function cleanClassInfo(){
    for (i = 0; i < classInfoArr.length; i++){
        if (classInfoArr[i].mDays.indexOf("SYSCODE") != -1)
            classInfoArr.splice(i, 1);
    }
}

//Class location names usually have a stupid amount of spaces in them
//This function will limit that to a single space
function cleanNameSpacing(){
    var letters = ""; //part of the string that contains letters
    var num = ""; //part of the string that contains numbers
    var res = ""; //resultant string
    var intRegex = /^\d+$/;
    var alphaRegex = /[a-zA-Z]+/;

    for (i = 0; i < classInfoArr.length; i++){
        for (j = 0; j < classInfoArr[i].loc.length; j++){
            if (alphaRegex.test(classInfoArr[i].loc.charAt(j))){
                letters += classInfoArr[i].loc.charAt(j);
            }
            else if (intRegex.test(classInfoArr[i].loc.charAt(j))){
                num += classInfoArr[i].loc.charAt(j);
            }
        }

        res += (letters + " " + num);
        classInfoArr[i].loc = res;
        res = "";
        letters = "";
        num = "";
    }
}


//Just used for testing purposes - prints out the values contained in the given array
//@param arr - the given array
//@param isClassInfo - whether the array contains ClassInfo object or not (boolean value)
function checkValues (arr, isClassInfo){
	if (isClassInfo){
		for (i = 0; i < arr.length; i++){
			toPrint += arr[i].name;
            toPrint += " ";
			toPrint += arr[i].mDays;
            toPrint += " ";
			toPrint += arr[i].mTimesS;
            toPrint += " ";
			toPrint += arr[i].mTimesE;
            toPrint += " ";
			toPrint +=arr[i].mDates;
            toPrint += " ";
			toPrint +=arr[i].loc;
            toPrint += " \n\n";
		}
	}
	else{
		for (i = 0; i < arr.length; i++){
            toPrint += " ";
			toPrint +=arr[i];
            toPrint += " \n\n";
		}
	}
    console.log(toPrint);
}

//meetingDate object, will contain the different parts of the meeting date string, such as month, date year
//month - given month, has to be reduced by 1
//day - given day
//year - given year
function meetingDateObj(month, day, year){
		this.month = month;
		this.day = day;
		this.year = year;
}

//decrements the string month by one and updates the year to be in the 21st century
function updMonthYr(obj, month, year){
	var m = parseInt(month);
	var mnt;
	m--;//Necessary to convert from 1-indexed to 0-indexed.
	if (m <= 10) mnt = "0";
	else mnt = "";
	mnt += m.toString();

	var yr = "20";
	yr+=year;

	obj.month = mnt;
	obj.year = yr;

}

//Returns a meeting date string as a readable format for the Calendar
//As the months begin at index 0, the month part has to be reduced by 1
//date - a meeting date string
function splitDates(date){
	var dates = date.split('-');
	var date1 = dates[0];
	var date2 = dates[1];
	var obj;

	var parts1 = date1.split('/');
	var parts2 = date2.split('/');

	var objArr = [];

	obj = new meetingDateObj("", parts1[1], "");
	updMonthYr(obj, parts1[0], parts1[2]);
	objArr.push(obj);

	obj = new meetingDateObj("", parts2[1], "");
	updMonthYr(obj, parts2[0], parts2[2]);
	objArr.push(obj);

	return objArr;
}

var notifier, dialog;
var cal = ics();//Make our new Calendar (globally)
var firstTime = true; //We'll use this to solve an "empty date" problem.
var safetyNet; //Same thing, empty Date saver

function showNotify() {
    var notify;

    if (window.webkitNotifications.checkPermission() == 0) {
        notify = window.webkitNotifications.createNotification(
            "",
            'Notification Test',
            'This is a test of the Chrome Notification System. This is only a test.'
        );
        notify.show();
    } else {
        window.webkitNotifications.requestPermission();
    }
}

//Takes in the start and end date and repeat frequency, does some ugly formatting
//And churns out a schedule
//Start is the day the class starts, end is the day it ends. EventStart is the time of day it starts
//EventEnd is the time of day the event ends, Weekdays is the days of week the event should occur on
//(An array of integers is expected)
function CreateSchedule(start, end,  eventTime,  eventTimeEnd,  WeekDays, name, location)
{
	//Forcible typecasty garbage to bypass
	//JS's loosely typed shenanigans -- don't judge, Alex -_-
	var start = new Date(start);
	var exDateStr = "";

	//There's an issue with the library where, irrespective of the RRULE, an event is created on the first day that is sent in. This is meant to circumvent that.
	//Whatever the first day that a class starts on is, move the event to start on that day.'
	//This will grab the FIRST date present in the string.
	if(toRRule(WeekDays).indexOf('MO') !== -1)
	{
		//Do nothing.
	}
	else if(toRRule(WeekDays).indexOf('TU') !== -1)
	{
		start.setDate(start.getDate() + 1);
	}
	else if(toRRule(WeekDays).indexOf('WE') !== -1)
	{
		start.setDate(start.getDate() + 2);
	}
	else if(toRRule(WeekDays).indexOf('TH') !== -1)
	{
		start.setDate(start.getDate() + 3);
	}
	else if(toRRule(WeekDays).indexOf('FR') !== -1)
	{
		start.setDate(start.getDate() + 4);
	}

	var end = new Date(end);
	var eventTime = new Date(eventTime);
	var eventTimeEnd = new Date(eventTimeEnd);

	var eventStart = new Date(start.setHours(eventTime.getHours(), eventTime.getMinutes()));
	var eventEnd = new Date(start.setHours(eventTimeEnd.getHours(),eventTimeEnd.getMinutes()));
	var newDate = start.setDate(start.getDate() + 1);
	start = new Date(newDate);

	//Create the EXDATE property string used to exclude holidays.
	while(start < end)
	{
		if(iSholiday(new Date(start)))
		{
			//We have to set time because Google Calendar only recognizes the Exdate parameter if it's at the same time as the regular event.
			start.setHours(eventTime.getHours(), eventTime.getMinutes());
			exDateStr += formatDate(start, eventTime.getHours(), eventTime.getMinutes()) + ',';

		}
		start = new Date(start.setDate(start.getDate() + 1));
	}
	//Remove the trailing comma and strip punctuation.
	exDateStr = exDateStr.substr(0, exDateStr.length -1);
	exDateStr = exDateStr.replace(/:/g,'');
	exDateStr = exDateStr.replace(/-/g,'');
	exDateStr = exDateStr.replace(/\./g,'');
	exDateStr = exDateStr.replace(/Z/g,'');//Remove trailing Z to convert to local time

	 //BEGIN PHYSICS 221 LAB
	 //If we're taking the physics 221 lab, make it two events that occur fortnightly.
	if(name.indexOf("PHYS") > -1 && name.indexOf("221") > -1  && toRRule(WeekDays).length == 2) //Make sure that it only occurs on one day. For some reason indexOf(PHYS 221) returns -1.
	{
		//Make a new fortnightly RRule
		var biRule = {
		freq: "WEEKLY",
		interval: 2, //Every other week
		until: new Date(end.setHours(1,0)),
	};

		//Add it for week one
		cal.addEvent(name, "Class",location, eventStart, eventEnd, biRule, toRRule(WeekDays),exDateStr);
		eventStart.setDate(eventStart.getDate() + 7);//Skip the first week.
		eventStart.setHours(eventTime.getHours(), eventTime.getMinutes());
		eventEnd.setDate(eventEnd.getDate() + 7);//Skip the first week.
		eventEnd.setHours(eventEnd.getHours(), eventEnd.getMinutes());

		//Add it for week 2.
		cal.addEvent(name, "Class",location, eventStart, eventEnd, biRule, toRRule(WeekDays),exDateStr);

		//Let the user know that there are two separate events.
		alert("Physics 221 lab meets every other week. Delete the entire series of labs that are not on the week you meet.");

		//Skip the weekly event.
		return;
	}

	//END PHYSICS 221


	var rule = {
		freq: "WEEKLY",
		until: new Date(end.setHours(1,0)),
	};

		cal.addEvent(name, "Class",location, new Date(eventStart) ,new Date(eventEnd), rule, toRRule(WeekDays),exDateStr);
}

	//custom format for time. Google calendar hates 24 hour time
	//This emulates the ISO standard, but for central time.
	function formatDate(date, hours, minutes) {
	var d = new Date(date);
	d.setHours(hours, -d.getTimezoneOffset(), 0, 0); //removing the timezone offset.
		d.setMinutes(minutes);
	return d.toISOString(); //2013-04-18T00:00:00.000Z
}

	//Converts weekdays to RRULE stating byrules
	function toRRule(WeekDays)
	{

		var ret = "";
		//Someone has i as a loop in some global scope such that it
		//Can never be used again without breaking things. WHY?
		//(perhaps in create schedule, which would make it my fault?)
		for(x = 0; x < WeekDays.length; x++)
		 {
			switch(WeekDays[x])
			{
				case 8:
					continue;
				case 1:
					ret += "MO,";
					break;
				case 2:
					ret += "TU,"
					break;
				case 3:
					ret += "WE,"
					break;
				case 4:
					ret += "TH,"
					break;
				case 5:
					ret += "FR,"
					break;
				case 6://No need to support weekends, but what the hell.
					ret += "SA,"
					break;
				case 7:
					ret += "SU,"
					break;
			}
		  }
			//return retArr;
			return ret.substring(0,ret.length-1); //Remove the trailing comma.
	}


	//Used for expSched string formatting garbage
	function timeParseHours(time)
	{
		if(time == '  ') //Handle ARRANGED classes.
		{
			return 0;
		}

		var hrs = time.split(':');
		var hrs1 = hrs[0];//Grab just the time
		var hrs2 = hrs[1];//Grab the minutes and an A or P
		var pm = hrs2.split(' ');
		var AorP = pm[1];//Grab the A or the P
		if(AorP == 'P')
		{
			if(parseInt(hrs1) < 12) // it's PM and not noon.
			{
				hrs1 = parseInt(hrs1) + 12; //We're doing military time, boy.
			}
		}
		else
		{
				hrs1 = parseInt(hrs1);
		}
		return hrs1;
	}

	//See comment above, re: garbage.
	function timeParseMinutes(time)
	{
		if(time == '  ') //Handle ARRANGED classes.
		{
			return 0;
		}

		var hrs = time.split(':');
		var hrs2 = hrs[1];//Grab the minutes and an A or P
		var front = hrs2.split(' ');
		var mins = front[0];
		return mins;
	}

	function convertOneDay(day)
	{
		if(day == 'M')
		{
			return 1;
		}
		if(day == 'T')
		{
			return 2;
		}
		if(day == 'W')
		{
			return 3;
		}
		if(day == 'R')
		{
			return 4;
		}
		if(day == 'F')
		{
			return 5;
		}
		if(day == 'S')
		{
			return 6;
		}
		//TODO: How does Access Plus display Sunday?
		return 8; //Invalid, see below for more info.
	}

    //Tests if string contains only spaces
    function isEmptyString(obj)
    {
	    if(obj == null) return true;
            for(var i = 0; i < obj.length; i++)
            {
                if(obj.charAt(i) != ' ')
                {
                    return false;
                }
            }
    return true;

    }

	function convertDays(days)
	{
		var ret = new Array();
        if (days.charAt(0) == 'M' && days.charAt(1) == 'T'){ //No space in between date characters
            for (i = 0; i < 5; i++){
                ret.push(convertOneDay(days.charAt(i)));
            }
        }
        else {

            var tempDays = days.split(' ');
            for(var i = 0; i < tempDays.length; i++)
            {
                ret.push(convertOneDay(tempDays[i]));//This should work?
            }

        }
        return ret;
	}

	//This is just for hacky demo purposes. This can be deleted. This should be deleted. //Nope now it's necessary again.
	function expSched() {
	for(i = 0; i < classInfoArr.length; i++)
	{
		//Sometimes a class has two meetings and they only give a date for the first
		if(firstTime)
		{
			safetyNet = classInfoArr[i].mDates;
			firstTime = false;
		}
		//All classes have the same meeting time, in theory.
		if(isEmptyString(classInfoArr[i].mDates))
		{
			classInfoArr[i].mDates = safetyNet;
		}
		else//This fixed the issue of having the first class be a half semester classes causing a recitation to only appear for half the semester
		{
			safetyNet = classInfoArr[i].mDates;
		}

		//Convert Y/M/D to a date
		var DateArrs = splitDates(classInfoArr[i].mDates);
		var StartDate = new Date(DateArrs[0].year,DateArrs[0].month,DateArrs[0].day);
		var EndDate = new Date(DateArrs[1].year,DateArrs[1].month,DateArrs[1].day);

		EndDate.setDate(EndDate.getDate() -6);//There are no classes during finals week.


		//Change days from M T R to 1 2 4

		if(classInfoArr[i].mDays.indexOf("Canceled") != -1)
		{
			continue;//Skip canceled classes.
		}
		var meetDays = convertDays(classInfoArr[i].mDays);

		if(isEmptyString(classInfoArr[i].loc))
		{

			classInfoArr[i].loc = 'TBA';
		}

		//Create everything
		CreateSchedule(StartDate, EndDate,new Date(StartDate.setHours(timeParseHours(classInfoArr[i].mTimesS), timeParseMinutes(classInfoArr[i].mTimesS))),new Date(EndDate.setHours(timeParseHours(classInfoArr[i].mTimesE), timeParseMinutes(classInfoArr[i].mTimesE))),meetDays,classInfoArr[i].name,classInfoArr[i].loc);

	}
	/*
		//Old version for reference
		//Start wtih  Com Sci 311 Lecture
		var StartDate = new Date(2015,07,24);//Same for every class this semester
		var EndDate = new Date(2015,11,18);
		var StartTime =  new Date(StartDate).setHours(12,39);
		var EndTime = new Date(StartDate).setHours(14,0);
		var WeekDays= new Array(2,4);//Tuesday and Thursday
		CreateSchedule(StartDate, EndDate, StartTime, EndTime , WeekDays, 'Com Sci 311', 'Atanassoff 310');
	*/

		//Display a loading gif if we downloaded successfully.
        document.getElementById("wait").style.display = "block";
        setTimeout(function(){document.getElementById("wait").style.display = "none";}, 1200);
		cal.download(cal); //ICS format

		//cal.download(cal,".csv"); //If we want different extensions
	}

//meetingDate object, will contain the different parts of the meeting date string, such as month, date year
//month - given month, has to be reduced by 1
//day - given day
//year - given year
function meetingDateObj(month, day, year){
		this.month = month;
		this.day = day;
		this.year = year;
}

//decrements the string month by one and updates the year to be in the 21st century
function updMonthYr(obj, month, year){
	var m = parseInt(month);
	var mnt;
	m--;//Necessary to convert from 1-indexed to 0-indexed.
	if (m <= 10) mnt = "0";
	else mnt = "";
	mnt += m.toString();

	var yr = "20";
	yr+=year;

	obj.month = mnt;
	obj.year = yr;

}

//Returns a meeting date string as a readable format for the Calendar
//As the months begin at index 0, the month part has to be reduced by 1
//date - a meeting date string
function splitDates(date){
	var dates = date.split('-');
	var date1 = dates[0];
	var date2 = dates[1];
	var obj;

	var parts1 = date1.split('/');
	var parts2 = date2.split('/');

	var objArr = [];

	obj = new meetingDateObj("", parts1[1], "");
	updMonthYr(obj, parts1[0], parts1[2]);
	objArr.push(obj);

	obj = new meetingDateObj("", parts2[1], "");
	updMonthYr(obj, parts2[0], parts2[2]);
	objArr.push(obj);

	return objArr;
}

//Calculates the "ideal" div size according to the number of found teachers
//@param number - number of teachers
function getBoxSize(number){
	var mult;
	if (number === 1) mult = 60; //a single entry
	else mult = number*45 + 1; //+1 for the title line
	return mult + 'px';
}

//Adds css style to each "check my rating" button
function addStyleRmp(){
    var id = "rmpEntry0";
    for (i = 0; i <= numRMPEntries; i++){
        document.getElementById(id).onmouseover = function(){
            this.style.backgroundColor = "#b8dc29";
        }
        document.getElementById(id).onmouseout = function(){
            this.style.backgroundColor = "#aac628";
        }

        id = id.substr(0, id.length - 1);
        id += i;
    }
}

//The css for each rmp entry.
//backGColor - background color for the div
//prof - prof's name
//name - parsed name
function cssEntry(backGColor, prof, name){
	    var id = "rmpEntry" + numRMPEntries;
        numRMPEntries++;

		return '<div style="background-color:' + backGColor + ';    border-radius: 5px;padding-bottom:10px;display:table; width:320px; height: 20px;">\
                <table style=""><tr><td style="padding-left: 30px; padding-top: 10px;width:150px;"><b>'+prof+'</td>\
                <td style="width:150px"><br>\
                <a id = '+ id +' style = "box-shadow: 2px 2px 2px #888888; border: 1px solid black; padding-left: 100px;text-shadow: none; text-decoration: none; color: white; padding: 5px; background-color: #aac628; border-radius: 5px;" href= "http://www.ratemyprofessors.com/search.jsp?query=' + name + '+Iowa+State+University'+'" target="_blank"> Check my rating!</a>\
                </td></tr></table></div>';

}

//Remove a given value from an array.
//Usage: arr.clean(undefined);
Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

//-------------------------------</Calendar>--------------------------------------

//More Calendar stuff, specifically Add to Google button
//Load Poylmer
// $.getScript('https://www.gstatic.com/external_hosted/polymer/custom.elements.min.js', function()
// {
	// //Laod Google calendar
	// $.getScript('https://www.gstatic.com/ads/ci/addtocalendar/1/addtocalendar_min.js', function()
	// {
		// var addToCalendar = document.createElement('ci-addtocalendar');
	// }
	
    // // script is now loaded and executed.
    // // put your dependent JS here.
// });




//-------------------------------<Display>--------------------------------------

//The UI part of the application
$(document).ready(function() {
 var updProfs = []; //updated array with the professor information, will not contain any repeated names
 var name = [];

 if (url == accessPlus || url == accessPlus1){

  updateIDs(); //Add ids to each table row
  updProfs = remRepeats(profs); //save a list of professors without any repeats
  var superDiv = $('<div><div>'); //Div that will contain all of the elements of the RMP div. We need a master div to make ordering the elements easier
  var buttonDiv = $('<div style = "height: 15px;"></div>'); //Div that will contain all elements related to the button
  var div = $('<div id = "rmpBox" style = padding-top: 20px;></div>'); //RMP div
  var imgDiv = $('<div style = "margin-left: 170px; ; z-index: 1;  position: absolute;"> <img src="https://www.userlogos.org/files/logos/Karmody/Rate_My_Prof_01.png" alt="RMP" style="width:130px;height:120px"> </div>'); //The RMP image title

  var hatDiv = $('<div style = "margin-left: 340px; ; z-index: 1; padding-top: 9px; position: absolute;"> <img src="https://cdn4.iconfinder.com/data/icons/everyday-objects-1/128/graduation-cap-512.png" style = "-webkit-transform: rotate(15deg); width: 57px; height: 50px;"> </div>'); //The graduation hat div

  var box = $('<div style = "width:400px; height:' + getBoxSize(updProfs.length) +'; margin-left: 60px; padding-top: 30px;"> </div>'); //The div containing the professor list

  var title = $('<div style = "width:320px; height: 23px; border-style: outset;border-color:#A30000; -webkit-border-radius: 5px 5px 5px 5px;background-image: -webkit-linear-gradient(bottom, #FF1111 0%, #9E0101 100%); color: white; font-size: 15px;"> <div style = "padding-left: 5px;  color: white;"></div> </div>'); //The red gradient div for the RMP

  superDiv.append("<br><br><br><br><br><br>");

  //Lets structure our RMP UI

  $(superDiv).append(imgDiv);
  superDiv.append("<br><br><br>");

  $(div).append(hatDiv);
  $(box).append(title);
  $(div).append(box);

  //Appends the professor name and links them to the box div
  //Will alternate background color depending on the entry's index
  for (i = 0; i < updProfs.length; i++){
   name = parseName(updProfs[i]);
   if (!(i%2 == 0)) {
    $(box).append(cssEntry('#E8E8E8', updProfs[i], name[0]));
   }

   else {
    $(box).append(cssEntry('white', updProfs[i], name[0]));
   }
  }

  //Finishing touches to our superDiv
  //We have to use prepend instead of append to force the web page to place our div before the class list
  superDiv.append(div);
  superDiv.append('<br><br><div style = "padding-left: 70px;font-size: 1em; width:320px;"><b>Note:</b> There is no guarantee that a given professor will have a Rate My Professor page.</div><br><br>');


  //Dissapointed no one found my easter egg yet <- your easter egg was causing a jquery error because you decided to give something the id of button!
  //and also is just doesn't work at all...
  //var btn = $('<div> <button id="trl_btn" onclick="trl()" style = "width:2px; height:5px;   background-color:rgba(236, 236, 236, 0.6);  border: none !important;"> </button> </div>');
  //superDiv.append(btn);

  element.prepend(superDiv);

  trl = function func(){ //^ω^
   if (clicked == false) {
     clicked = true;
     superDiv.append(img);
   }
   else{
    clicked = false;
    $(img).remove();
   }
  }

 //Creation of our exportButton div
 //Using divs instead of a straight up button element since I wanted to customize its appearance
 var calIcon = "https://cdn4.iconfinder.com/data/icons/small-n-flat/24/calendar-128.png";
 var expBut = $('<br><div style = "float: left;" ><div title="Generate an .ics Calendar object" style = "position: relative; padding: 15px; padding-bottom: 10px;margin-left: 167px"><button id="exportBut" style = "border-radius: 5px; box-shadow: 1px 1px 1px #888888; padding: 5px;color: #FFF;background-color: #900;"><img src="'+calIcon+'" style="float:left; width:45px;height:45px; margin-right: 5px; "> <img src = "https://cdn0.iconfinder.com/data/icons/large-black-icons/100/Right_arrow_next_play_forward.png" style="width:45px;height:45px; -webkit-filter: invert(100%); filter: invert(100%);"></button></div> <div id = "expCalTitle" style = "display: none; margin-left: 178px;"><span><b>Export My Schedule</b></span></div></div>');
  buttonDiv.append(expBut);
  element.prepend(buttonDiv);
  document.getElementById("exportBut").addEventListener("click", function(){expSched()});
  document.getElementById("exportBut" ).onmouseover = function(){ //On hover functionality -- hovering over the button will update its background and the mouse cursor
    this.style.backgroundColor = "#CC0000";
    this.style.cursor = "pointer";
    document.getElementById("expCalTitle").style.display = 'block';
  }

  //On hover functionality -- moving the mouse away, revert button to original color
  document.getElementById("exportBut" ).onmouseout = function(){
    this.style.backgroundColor = "#900";
    document.getElementById("expCalTitle").style.display = 'none';
  }

  //When button is clicked, display a loading gif -- demonstrates that the button's code is actually being performed
  var waitDiv = $('<div id = "wait" style= "display: none;"><img src="https://www.studentmarket.com/Images/loading.gif" alt="Wheres My Loading Gif?" style="width:25px;height:25px"> </div>');
  buttonDiv.append(waitDiv);

  //Updates the rest of our list -- this part is related to the Calendar Export function
  getStartEndTime(meetingsT, meetingeT);
  getMeetingDates(startEndDate);
  getLocations(locations);

  //REMOVE?
//  locations.clean(undefined);//Remove empty values.
  createClassInfo(classNames, meetingD, meetingsT, meetingeT, startEndDate, locations);
  cleanClassInfo();
  cleanNameSpacing();

  checkValues(classInfoArr, true);

  addStyleRmp(); //add some styling to the rmp buttons
 }

});
