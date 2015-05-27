//Hopefully you're ready for a completely "hacky" plugin - seriously don't judge ヽ（´ー｀）┌
//Ignore the random portuguese var names, I ran out of names in english

//The main functionality of this part of the Access++ extension is to add the Rate My Professor functionality, but it will also get the needed information
//for the google calendar exportation, such as: class name, beginning and end date, dates, ect... The information will be saved in classInfo objects, which will
//be stored in an array. When a class contains multiple meeting times at different times, such as: Math M,W @ 10:00 and T,R @8:00; independed classInfo objects will 
//be created. ClassInfo1: name: Math, meetingDays: M, W; Meeting Times: 10:00 A, Meeting End Time: 11:00A, startendDate: : 01/15/2014-05/25/2014
//be created. ClassInfo2: name: Math, meetingDays: T, R; Meeting Times: 8:00 A, Meeting End Time: 9:00A, startendDate: : 01/15/2014-05/25/2014

var url =  window.location.href;  
var accessPlus = "https://accessplus.iastate.edu/servlet/adp.A_Plus"; //possible url for access plus after first access
var accessPlus1 = "https://accessplus.iastate.edu/servlet/adp.A_Plus?A_Plus_action=/R480/R480.jsp&SYSTEM=R480&SUBSYS=006&SYSCODE=CS&MenuOption=7"; //possible url for access plus 
var bootstrap =  ' <script src="http://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js"></script>';

var img = document.createElement("img"); 
img.src = "https://imgflip.com/s/meme/Jackie-Chan-WTF.jpg"; //I regret nothing

var clicked = false;

var element = $('#Grid').next(); //where we're going to append our RMP div to 
var Name; //keeps track of the name of the current prof being read
var idStart = 2; //2 should be a pretty good place to start searching
var tdId; //keeps track of the current tdId being read

var profs = []; //will store the prof's names here

var datesCnt = 0; //Classes can have multiple meeting times at different places, if this happens then the 
								 //arrays containing the class information will have varying length. As such we should keep track 
								 //of the amount of times we get multiple consecutive meeting dates. When several meeting dates are found,
								 //we should duplicate the class name and start end date, allowing for the creation of a new Calendar object.
var lastClassName = "";
var lastStartEnd = "";
								 
//All of these arrays are temporary, they will be used to generate classInfo objects later on
var classNames = []; //will store all of the student's class' names
var meetingD = []; //will store all of the student's class' meeting days
var meetingsT = []; //will store all of the student's class' meeting times (start)
var meetingeT = []; //will store all of the student's class' meeting times (end)
var startEndDate = []; //will store all of the student's class' start/end dates

var classInfoArr = []; //will store objects which contain (hopefully) all of the necessary information for google Calendar


//ClassInfo object, each object will contain all needed information for the calendar exportation
//nome - class name
//mDays - meeting days, all days of the week where the class meets
//mTimes - meeting times
//sDate - start date
//eDate - end date 
//After each object is created, they will be saved in an array
//access their parameters by, for example calling, classInfo.nome to retrieve the name
function classInfo(nome, mDays, mTimesS, mTimesE, mDates){
		this.nome = nome;
		this.mDays = mDays;
		this.mTimesS = mTimesS;
		this.mTimesE = mTimesE;
		this.mDates = mDates;
}

//AccessPlus sucks, so to make our lives easier, lets give each table an id, and use these to search for the required info
//-----------------------------------------------------------------------------

//Keeps track of the current row id
function tdID(){
	tdId = 'tr' + idStart;
	idStart++;
}

//Gives ids to every table data and table row that includes class information
function updateIDs() {
	$("#long").children().children().children().each(function (i) { // (╯°□°）╯︵ ┻━┻
		$(this).attr('id', 'tr' +i);
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
//@param - arr- given array with teacher names
function remRepeats(arr){ 
	var el;
	var result = [];
	
	$.each(arr, function(i, e) {
    if ($.inArray(e, result) == -1) result.push(e);
  });
  
	result.splice(1, 1);  //remove the weird empty element
  
  return result;
}

//Parses the given name to separate the first name from the last name
//includes a ',' to the last name 
//@param nome - teachers name
function parseName(nome){
	var splited = nome.split(',');
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

//Checks to see whether the given row contains any "Days of the Week", such as M for Monday, T for Tuesday, ect...
function containsDW(id){
	var tr = '#' + id;
	if ($(tr).html().indexOf(";M ") !== -1  || $(tr).html().indexOf(";T ") !== -1 || $(tr).html().indexOf(";W ") !== -1 || $(tr).html().indexOf(";R ") !== -1 || $(tr).html().indexOf(";F ") !== -1 ||
	$(tr).html().indexOf(" M ") !== -1 || $(tr).html().indexOf(" T ") !== -1 || $(tr).html().indexOf(" W ") !== -1 || $(tr).html().indexOf(" R ") !== -1 || $(tr).html().indexOf(" F ") !== -1){
		return true;	
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
	if ($(tr).html().indexOf('&nbsp;') != -1 && containsDW(id)){
		var date = $(tr).html().split(';');	
		//alert(datesCnt);
			
		meetingD.push(date[3]);
		var startTime = incrementID(id, 1);
		var endTime = incrementID(id, 2);
		meetingsT.push(startTime);
		meetingeT.push(endTime);
	}
}

//Checks whether the row associated with the given id has contains the class' name,
//if so, it'll save the class name
//@param id - id of the given row
function checkClassName(id){
	var tr = '#' + id;
	if($(tr).html().indexOf('<!-- %=') != -1){
		var names = $(tr).html().split('nd()">');
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
function createClassInfo(arrCN, arrMD, arrMTS, arrMTE, arrDates){
	var obj;

	for (i = 0; i < arrCN.length; i++){
		
		obj = new classInfo(arrCN[i], arrMD[i], arrMTS[i], arrMTE[i], arrDates[i]);	
		classInfoArr.push(obj);
		
	}		
		
}

function checkValues (arr, isClassInfo){
	if (isClassInfo){
		for (i = 0; i < arr.length; i++){
			alert(arr[i].nome);	
			alert(arr[i].mDays);
			alert(arr[i].mTimesS);
			alert(arr[i].mTimesE);
			alert(arr[i].mDates);
		}
	}
	else{
		for (i = 0; i < arr.length; i++){
			alert(arr[i]);	
		}
	}

}

//-------------------------------</Calendar>--------------------------------------


//Was attempting to send a request to a website to be able to parse 
//the received page. Apparently cross-domain access is illegal with ajax - bummer
function getPage() { //illegal
	$.ajax({url: 'https://www.ratemyprofessors.com/search.jsp?query=LATHROP+Iowa+State+University'}).
		done(function(pageHtml) {
			alert(pageHtml.html());
	});
}


//Calculates the "ideal" div size according to the number of found teachers
//@param number - number of teachers
function getBoxSize(number){
	var mult;
	if (number === 1) mult = 60; //a single entry
	else mult = number*45 + 1; //+1 for the title line
	return mult + 'px';
}

//The css for each rmp entry. There was no need for repeating this code if there was only small changes
//backGColor - background color for the div
//prof - prof's name
//nome - parsed name
function cssEntry(backGColor, prof, nome){
	
		var txtShadow = 'text-shadow:1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0px 1px 0 #000, 1px 0px 0 #000, 0px -1px 0 #000, -1px 0px 0 #000, 4px 4px 3px #000; font-family:Verdana, Geneva, sans-serif;';
		return '<tr> <td> <div style = "display:table; padding-left: 40px;margin-left: 0px; color:#b5d333;'+ txtShadow+ '">' + '<br>' + prof + ' </td> <td> <br><a style = "padding-left: 100px;text-shadow: none; text-decoration: none; color: white;' + txtShadow + '" href= "http://www.ratemyprofessors.com/search.jsp?query=' + nome + '+Iowa+State+University'+'"> Check me out!</a> <br><br> </td></div></tr>';		
	
}

//Where the magic happens
$(document).ready(function() {
	var updProfs = []; //updated array with the professor information, will not contain any repeated names
	var nome = [];	
	//$(document).append(bootstrap);
	
	if (url == accessPlus || url == accessPlus1){

		updateIDs(); 
		updProfs = remRepeats(profs);
		
		var div = $('<div style = padding-top: 10px;></div>');
		var imgDiv = $('<div style = "margin-left: 150px; ; z-index: 1; padding-top: 5px; position: absolute;"> <img src="http://miietl.mcmaster.ca/site/wp-content/uploads/2014/11/RateMyProfessors.com_Logo.jpg" alt="RMP" style="width:100px;height:50px"> </div>');

		var box = $('<div style = "width:400px; height:' + getBoxSize(updProfs.length) +'; margin-left: 5px; padding-top: 30px;"> </div>');
		var title = $('<div style = "width:400px; height: 23px; -webkit-border-radius: 5px 5px 5px 5px;-moz-border-radius: 5px 5px 5px 5px;border-radius: 5px 5px 5px 5px;background-image: -webkit-linear-gradient(bottom, #FF1111 0%, #9E0101 100%); color: white; font-size: 15px;"> <div style = "padding-left: 5px;  color: white;"></div> </div>');
		
		
		var btn = document.createElement("BUTTON"); 
		btn.onclick=function(){ //^ω^
			if (clicked == false) {
			 	clicked = true;
			 	element.append(img);
			}
			else{
				clicked = false;
				$(img).remove();
			}
		}
		element.append(btn);
		
		var expBut = $('<div style = "margin-left: 115px"><br><br><br> <button style = " color: #FFF; background-color: #900; font-weight: bold;"id="myBtn" onclick="myFunction()">Export My Calendar</button></div>');
		element.append(expBut);
		element.append("<br>");		
		
		$(div).append(imgDiv);
		$(box).append(title);		
		$(div).append(box);		
		$(div).append(expBut);	
			
		for (i = 0; i < updProfs.length; i++){ 
			nome = parseName(updProfs[i]);
			if (!(i%2 == 0)) {
				$(box).append(cssEntry('#E8E8E8', updProfs[i], nome[0]));
			}
			
			else {
				$(box).append(cssEntry('white', updProfs[i], nome[0]));
			}
		}	


		element.append(div);
		element.append("<br><br>");
		

		
		getStartEndTime(meetingsT, meetingeT);
		getMeetingDates(startEndDate);
		createClassInfo(classNames, meetingD, meetingsT, meetingeT, startEndDate);
		//checkValues(classNames, false);
		//alert(classInfoArr[3].mDates);
	}
}); 
