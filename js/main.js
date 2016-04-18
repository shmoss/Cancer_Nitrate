(function(){

console.log("sdf")
//set our global variables
var attrArray = ["TRACTCE10", "GEOID10", "NAME10", "NAMELSAD10", "INTPTLAT10", "INTPTLON10", "nit_long", "COUNTYNS10", "NAME10_1", "NAMELSAD_1", "INTPTLAT_1", "INTPTLON_1", "cancer_num", "CID_sum"]; //list of attributes

var expressed = attrArray[12]; //initial attribute
console.log(expressed)
//chart frame dimensions
var chartWidth = window.innerWidth * 0.425,
	chartHeight = 473,
	leftPadding = 35,
	rightPadding = 2,
	topBottomPadding = 5,
	innerWidth = chartWidth - leftPadding - rightPadding,
	innerHeight = chartHeight - topBottomPadding * 2,
	translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
		
var yScale = d3.scale.linear()
	.range([463, 0])
	.domain([0, 200]);

//begin script when window loads
window.onload = setMap();


//set up the map
function setMap(){
   //map frame dimensions
	var width = window.innerWidth * 0.5,
		height = 460;

	//create new svg container for the map
	var map = d3.select("body")
		.append("svg")
		.attr("class", "map")
		.attr("width", width)
		.attr("height", height);

	//create Albers equal area conic projection centered on France
	var projection = d3.geo.albers()
		.center([0, 46.2])
		.rotate([-2, 0])
		.parallels([43, 62])
		.scale(2500)
		.translate([width / 2, height / 2]);

	var path = d3.geo.path()
		.projection(projection);

    //queue.js for data loading
    var q = d3_queue.queue();
    q		
		//get data from these files
		.defer(d3.csv, "data/cancer_tracts.csv") //load attributes from csv
		.defer(d3.json, "data/cancer_tracts_final.topojson") //load choropleth spatial data
		.await(callback);

    //once data loaded, callback function
    //takes 4 parameters (including the above three data sources) 
	function callback(error, csvData, tracts){				
		console.log("sdfsd")

		var wisconsinTracts = topojson.feature(tracts, tracts.objects.cancer_tracts_final).features;
		

		//join csv data to GeoJSON enumeration units
		wisconsinTracts = joinData(wisconsinTracts, csvData); 
		console.log(wisconsinTracts)			
		//create the color scale
		var colorScale = makeColorScale(csvData);
		
		//add enumeration units to the map
		setEnumerationUnits(wisconsinTracts, map, path, colorScale);  
// 		
		// //create chart
		// setChart(csvData, colorScale, expressed); 
// 		
		// //create dropdown for attribute selection
		// createDropdown(csvData);
		
		//about(); 
		console.log(wisconsinTracts)       
    };
    
//create initial community area choropleth
function setEnumerationUnits(wisconsinTracts, map, path, colorScale){	
	//console.log(wisconsinTracts)	
	//add communities to map
	var tract = map.selectAll(".tract")
		.data(wisconsinTracts)		
		.enter()
		.append("path")
		.attr("class", function(d){ //assign class here
			//this will return the name of each community
			console.log(d.properties.NAME10_1)
			return "tract " + d.properties.NAME10_1;
			
		})
		.attr("d", path)
		.style("fill", function(d){
			//style applied based on choropleth function
			//console.log(d.properties)
			return choropleth(d.properties, colorScale);
		})
		
		//mousing over will call highlight function
		// .on("mouseover", function(d){
        	// highlight(d.properties);     	

		//mousing off will call dehighlight function
		 // .on("mouseout", function(d){
            // dehighlight(d.properties);

       	//mousing over will also call moveLabel function
		// .on("mousemove", moveLabel)
	// var desc = community.append("desc")
		// .text('{"stroke": "#3f3f3f", "stroke-width": "1px"}');
console.log(tract)			
};  

function joinData(wisconsinTracts, csvData){
	//loop through csv to assign each set of csv attribute values to geojson community
	for (var i=0; i<csvData.length; i++){
		var csvTract = csvData[i]; //the current community
		//console.log(csvTract)
		var csvKey = csvTract.GEOID10; //the CSV key
		//console.log(csvKey)
		//loop through geojson regions to find correct community in order to match
		for (var a=0; a<wisconsinTracts.length; a++){
			var geojsonProps = wisconsinTracts[a].properties; //the current community geojson properties
			var geojsonKey = geojsonProps.GEOID10; //the geojson primary key
			//console.log(geojsonKey)
			//where keys match, transfer csv data to geojson properties object
			if (geojsonKey == csvKey){				
				//assign all attributes and values
				attrArray.forEach(function(attr){
					var val = (csvTract[attr]); //get csv attribute value
					//console.log(val)
					geojsonProps[attr] = val; //assign attribute and value to geojson properties
				});
			};
		};
	};
	console.log(wisconsinTracts)
	return wisconsinTracts;
	
}; 

//make colors
function makeColorScale(data){
	//assign color classes for choropleth
	var colorClasses = [
        "#fee5d9",
		"#fcae91",
		"#fb6a4a",
		"#de2d26",
		"#a50f15"
    ];

    //create color scale generator
    var colorScale = d3.scale.threshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    //console.log(data)
    for (var i=0; i<data.length; i++){
    	// use the value of expressed value in array
        var val = (data[i][expressed]);
        console.log(val)
        //console.log(data)
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;	
};
 
 
//function to look for data value and return color
function choropleth(props, colorScale){
	//make sure attribute value is a number
	var val = parseFloat(props[expressed]);
	//if attribute value exists, assign a color; otherwise assign default (will work for when data = 0)
	if (val && val != NaN){
		return colorScale(val);
	} else {
		return "#FFF";
	};
};

};
})();