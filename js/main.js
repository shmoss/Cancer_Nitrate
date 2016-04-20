//wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["nit_long", "cancer_num"]; //list of attributes
var expressed = attrArray[1]; //initial attribute

//chart frame dimensions
var chartWidth = window.innerWidth * 0.425,
	chartHeight = 473,
	leftPadding = 25,
	rightPadding = 2,
	topBottomPadding = 5,
	chartInnerWidth = chartWidth - leftPadding - rightPadding,
	chartInnerHeight = chartHeight - topBottomPadding * 2,
	translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scale.linear()
	.range([463, 0])
	.domain([0, 110]);

//begin script when window loads
window.onload = setMap();

//set up choropleth map
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
		.center([0, 43.07]) //set coordinates
        //set rotation 
        .rotate([88.4, 0, 0])
        //these are our standard parallels
        .parallels([40, 42])
        //let's make sure we can see Chicago
        .scale(2500)
        .translate([width / 2, height / 2]);

	var path = d3.geo.path()
		.projection(projection);

	//use queue.js to parallelize asynchronous data loading
	d3_queue.queue()
		.defer(d3.csv, "data/cancer_tracts.csv") //load attributes from csv
		.defer(d3.json, "data/cancer_tracts_final.topojson") //load background spatial data
		.await(callback);

	function callback(error, csvData, tracts){

		//place graticule on the map
		// setGraticule(map, path);

		//translate europe and France TopoJSONs
		var wisconsinTracts = topojson.feature(tracts, tracts.objects.cancer_tracts_final).features;

		//join csv data to GeoJSON enumeration units
		wisconsinTracts = joinData(wisconsinTracts, csvData);

		//create the color scale
		var colorScale = makeColorScale(csvData);

		//add enumeration units to the map
		setEnumerationUnits(wisconsinTracts, map, path, colorScale);

		
	};
}; //end of setMap()

// function setGraticule(map, path){
	// //create graticule generator
	// var graticule = d3.geo.graticule()
		// .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude
// 
	// //create graticule background
	// var gratBackground = map.append("path")
		// .datum(graticule.outline()) //bind graticule background
		// .attr("class", "gratBackground") //assign class for styling
		// .attr("d", path) //project graticule
// 
	// //create graticule lines
	// var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
		// .data(graticule.lines()) //bind graticule lines to each element to be created
	  	// .enter() //create an element for each datum
		// .append("path") //append each element to the svg as a path element
		// .attr("class", "gratLines") //assign class for styling
		// .attr("d", path); //project graticule lines
// };

function joinData(wisconsinTracts, csvData){
	//loop through csv to assign each set of csv attribute values to geojson region
	for (var i=0; i<csvData.length; i++){
		var csvTract = csvData[i]; //the current region
		var csvKey = csvTract.GEOID10; //the CSV primary key

		//loop through geojson regions to find correct region
		for (var a=0; a<wisconsinTracts.length; a++){

			var geojsonProps = wisconsinTracts[a].properties; //the current region geojson properties
			var geojsonKey = geojsonProps.GEOID10; //the geojson primary key

			//where primary keys match, transfer csv data to geojson properties object
			if (geojsonKey == csvKey){

				//assign all attributes and values
				attrArray.forEach(function(attr){
					var val = parseFloat(csvTract[attr]); //get csv attribute value
					geojsonProps[attr] = val; //assign attribute and value to geojson properties
				});
			};
		};
	};

	return wisconsinTracts;
};

function setEnumerationUnits(wisconsinTracts, map, path, colorScale){

	//add France regions to map
	var tracts = map.selectAll(".tracts")
		.data(wisconsinTracts)
		.enter()
		.append("path")
		.attr("class", function(d){
			return "tracts " + d.properties.GEOID10;
		})
		.attr("d", path)
		.style("fill", function(d){
			return choropleth(d.properties, colorScale);
		})
		// .on("mouseover", function(d){
			// highlight(d.properties);
		// })
		// .on("mouseout", function(d){
			// dehighlight(d.properties);
		// })
		// .on("mousemove", moveLabel);

	// //add style descriptor to each path
	// var desc = regions.append("desc")
		// .text('{"stroke": "#000", "stroke-width": "0.5px"}');
};

//function to create color scale generator
function makeColorScale(data){
	var colorClasses = [
		"#D4B9DA",
		"#C994C7",
		"#DF65B0",
		"#DD1C77",
		"#980043"
	];

	//NATURAL BREAKS SCALE
	//create color scale generator
	var colorScale = d3.scale.threshold()
		.range(colorClasses);

	//build array of all values of the expressed attribute
	var domainArray = [];
	for (var i=0; i<data.length; i++){
		var val = parseFloat(data[i][expressed]);
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

//function to test for data value and return color
function choropleth(props, colorScale){
	//make sure attribute value is a number
	var val = parseFloat(props[expressed]);
	//if attribute value exists, assign a color; otherwise assign gray
	if (val && val != NaN){
		return colorScale(val);
	} else {
		return "#CCC";
	};
};

// //function to create coordinated bar chart
// function setChart(csvData, colorScale){
	// //create a second svg element to hold the bar chart
	// var chart = d3.select("body")
		// .append("svg")
		// .attr("width", chartWidth)
		// .attr("height", chartHeight)
		// .attr("class", "chart");
// 
	// //create a rectangle for chart background fill
	// var chartBackground = chart.append("rect")
		// .attr("class", "chartBackground")
		// .attr("width", chartInnerWidth)
		// .attr("height", chartInnerHeight)
		// .attr("transform", translate);
// 
	// //set bars for each province
	// var bars = chart.selectAll(".bar")
		// .data(csvData)
		// .enter()
		// .append("rect")
		// .sort(function(a, b){
			// return b[expressed]-a[expressed]
		// })
		// .attr("class", function(d){
			// return "bar " + d.adm1_code;
		// })
		// .attr("width", chartInnerWidth / csvData.length - 1)
		// .on("mouseover", highlight)
		// .on("mouseout", dehighlight)
		// .on("mousemove", moveLabel);
// 
	// //add style descriptor to each rect
	// var desc = bars.append("desc")
		// .text('{"stroke": "none", "stroke-width": "0px"}');
// 
	// //create a text element for the chart title
	// var chartTitle = chart.append("text")
		// .attr("x", 40)
		// .attr("y", 40)
		// .attr("class", "chartTitle");
// 
	// //create vertical axis generator
	// var yAxis = d3.svg.axis()
		// .scale(yScale)
		// .orient("left");
// 
	// //place axis
	// var axis = chart.append("g")
		// .attr("class", "axis")
		// .attr("transform", translate)
		// .call(yAxis);
// 
	// //create frame for chart border
	// var chartFrame = chart.append("rect")
		// .attr("class", "chartFrame")
		// .attr("width", chartInnerWidth)
		// .attr("height", chartInnerHeight)
		// .attr("transform", translate);
// 
	// //set bar positions, heights, and colors
	// updateChart(bars, csvData.length, colorScale);
// };
// 
// //function to create a dropdown menu for attribute selection
// function createDropdown(csvData){
	// //add select element
	// var dropdown = d3.select("body")
		// .append("select")
		// .attr("class", "dropdown")
		// .on("change", function(){
			// changeAttribute(this.value, csvData)
		// });
// 
	// //add initial option
	// var titleOption = dropdown.append("option")
		// .attr("class", "titleOption")
		// .attr("disabled", "true")
		// .text("Select Attribute");
// 
	// //add attribute name options
	// var attrOptions = dropdown.selectAll("attrOptions")
		// .data(attrArray)
		// .enter()
		// .append("option")
		// .attr("value", function(d){ return d })
		// .text(function(d){ return d });
// };
// 
// //dropdown change listener handler
// function changeAttribute(attribute, csvData){
	// //change the expressed attribute
	// expressed = attribute;
// 
	// //recreate the color scale
	// var colorScale = makeColorScale(csvData);
// 
	// //recolor enumeration units
	// var regions = d3.selectAll(".regions")
		// .transition()
		// .duration(1000)
		// .style("fill", function(d){
			// return choropleth(d.properties, colorScale)
		// });
// 
	// //re-sort, resize, and recolor bars
	// var bars = d3.selectAll(".bar")
		// //re-sort bars
		// .sort(function(a, b){
			// return b[expressed] - a[expressed];
		// })
		// .transition() //add animation
		// .delay(function(d, i){
			// return i * 20
		// })
		// .duration(500);
// 
	// updateChart(bars, csvData.length, colorScale);
// };
// 
// //function to position, size, and color bars in chart
// function updateChart(bars, n, colorScale){
	// //position bars
	// bars.attr("x", function(d, i){
			// return i * (chartInnerWidth / n) + leftPadding;
		// })
		// //size/resize bars
		// .attr("height", function(d, i){
			// return 463 - yScale(parseFloat(d[expressed]));
		// })
		// .attr("y", function(d, i){
			// return yScale(parseFloat(d[expressed])) + topBottomPadding;
		// })
		// //color/recolor bars
		// .style("fill", function(d){
			// return choropleth(d, colorScale);
		// });
// 
	// //add text to chart title
	// var chartTitle = d3.select(".chartTitle")
		// .text("Number of Variable " + expressed[3] + " in each region");
// };
// 
// //function to highlight enumeration units and bars
// function highlight(props){
	// //change stroke
	// var selected = d3.selectAll("." + props.adm1_code)
		// .style({
			// "stroke": "blue",
			// "stroke-width": "2"
		// });
// 
	// setLabel(props);
// };
// 
// //function to create dynamic label
// function setLabel(props){
	// //label content
	// var labelAttribute = "<h1>" + props[expressed] +
		// "</h1><b>" + expressed + "</b>";
// 
	// //create info label div
	// var infolabel = d3.select("body")
		// .append("div")
		// .attr({
			// "class": "infolabel",
			// "id": props.adm1_code + "_label"
		// })
		// .html(labelAttribute);
// 
	// var regionName = infolabel.append("div")
		// .attr("class", "labelname")
		// .html(props.name);
// };
// 
// //function to reset the element style on mouseout
// function dehighlight(props){
	// var selected = d3.selectAll("." + props.adm1_code)
		// .style({
			// "stroke": function(){
				// return getStyle(this, "stroke")
			// },
			// "stroke-width": function(){
				// return getStyle(this, "stroke-width")
			// }
		// });
// 
	// function getStyle(element, styleName){
		// var styleText = d3.select(element)
			// .select("desc")
			// .text();
// 
		// var styleObject = JSON.parse(styleText);
// 
		// return styleObject[styleName];
	// };
// 
	// //remove info label
	// d3.select(".infolabel")
		// .remove();
// };
// 
// //function to move info label with mouse
// function moveLabel(){
	// //get width of label
	// var labelWidth = d3.select(".infolabel")
		// .node()
		// .getBoundingClientRect()
		// .width;
// 
	// //use coordinates of mousemove event to set label coordinates
	// var x1 = d3.event.clientX + 10,
		// y1 = d3.event.clientY - 75,
		// x2 = d3.event.clientX - labelWidth - 10,
		// y2 = d3.event.clientY + 25;
// 
	// //horizontal label coordinate, testing for overflow
	// var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
	// //vertical label coordinate, testing for overflow
	// var y = d3.event.clientY < 75 ? y2 : y1;
// 
	// d3.select(".infolabel")
		// .style({
			// "left": x + "px",
			// "top": y + "px"
		// });
// };

})();