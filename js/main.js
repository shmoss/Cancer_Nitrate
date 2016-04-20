(function(){


//set our global variables
var attrArray = ["nit_long", "cancer_num"]; //list of attributes

var expressed = attrArray[1]; //initial attribute

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
	var width = 960, //dimensions
        height = 460; //dimensions

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on Chicago, Illinois
    var projection = d3.geo.albers()
        .center([0, 44.2]) //set coordinates
        //set rotation 
        .rotate([87.2, 0, 0])
        //these are our standard parallels
        .parallels([40, 42])
        //let's make sure we can see Chicago
        .scale(4000)
        .translate([width / 2, height / 2]);
        
   //this is our path generator function
   var path = d3.geo.path()
       .projection(projection);

    //queue.js for data loading
    var q = d3_queue.queue();
    q		
		//get data from these files
		.defer(d3.csv, "data/cancer_tracts_ID_final.csv") //load attributes from csv
		.defer(d3.json, "data/cancer_tracts_ID_final.topojson") //load choropleth spatial data
		.await(callback);

    //once data loaded, callback function
    //takes 4 parameters (including the above three data sources) 
	function callback(error, csvData, tracts){				
		

		var wisconsinTracts = topojson.feature(tracts, tracts.objects.cancer_tracts_ID_final).features;
		
		
		//add community regions to map
        // var tract = map.selectAll(".tract")
            // .data(wisconsinTracts)
            // .enter()
            // .append("path")
            // .attr("class", function(d){
            	// //console.log(d)
                // return "tract " + d.properties.NAME10_1;
            // })
            // .attr("d", path);


		//join csv data to GeoJSON enumeration units
		wisconsinTracts = joinData(wisconsinTracts, csvData); 
		//console.log(wisconsinTracts)			
		//create the color scale
		var colorScale = makeColorScale(csvData);
		
		//add enumeration units to the map
		setEnumerationUnits(wisconsinTracts, map, path, colorScale);  		
 		
		//create dropdown for attribute selection
		createDropdown(csvData);

      
    };
    
};
     
// //create initial community area choropleth
function setEnumerationUnits(wisconsinTracts, map, path, colorScale){	
	//console.log(wisconsinTracts)	
	//add communities to map
	
	var tract = map.selectAll(".tract")
    		.data(wisconsinTracts)
            .enter()
            .append("path")
            .attr("class", function(d){
            	
                return "tract " + d.properties.ID;
            })
			.attr("d", path)
			.style("fill", function(d){
				return choropleth(d.properties, colorScale);
			})
		//mousing over will call highlight function
		.on("mouseover", function(d){
        	highlight(d.properties);     	
		})
		//mousing off will call dehighlight function
		 // .on("mouseout", function(d){
            // dehighlight(d.properties);

       	// mousing over will also call moveLabel function
		//.on("mousemove", moveLabel)
	// var desc = community.append("desc")
		// .text('{"stroke": "#3f3f3f", "stroke-width": "1px"}');
// 		
};  

function joinData(wisconsinTracts, csvData){
	//loop through csv to assign each set of csv attribute values to geojson community
	for (var i=0; i<csvData.length; i++){
		var csvTract = csvData[i]; //the current community
		//console.log(csvTract)
		var csvKey = csvTract.ID; //the CSV key
		//console.log(csvKey)
		//loop through geojson regions to find correct community in order to match
		for (var a=0; a<wisconsinTracts.length; a++){
			var geojsonProps = wisconsinTracts[a].properties; //the current community geojson properties
			var geojsonKey = geojsonProps.ID; //the geojson primary key
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
        var val = parseFloat(data[i][expressed]);
        
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
    console.log(domainArray)
    console.log(expressed)
	console.log("color scale") 
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
		return "white";
	};
};

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Variable");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    
    //recreate the color scale
    var colorScale = makeColorScale(csvData);
	
    //recolor enumeration units
    var tract = d3.selectAll(".tract")   
    	.transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)            
        });
       
};

function highlight(props){
	
	//change stroke
	var selected = d3.selectAll(".tract"+props.ID)
		.style({
			"stroke": "black",
			"stroke-width": "2"
		});
	
	//setLabel(props);
};

function setLabel(props){
    //label content
    
    var labelAttribute = "<h3>" + props.tract +
        "</h3><b>" + props[expressed] + " " + expressed + "</b>" + "<br>" 
        
    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr({
            "class": "infolabel",
            "id": props.tract + "_label"
        })
        .html(labelAttribute);

    var tractName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
      
};

// //function to move info label with mouse
function moveLabel(){
	//get width of label
	var labelWidth = d3.select(".infolabel")
		.node()
		.getBoundingClientRect()
		.width;
// 
	// //use coordinates of mousemove event to set label coordinates
	var x1 = d3.event.clientX + 10,
		y1 = d3.event.clientY - 50,
		x2 = d3.event.clientX - labelWidth - 10,
		y2 = d3.event.clientY + 25;
// 
	// //horizontal label coordinate, testing for overflow
	var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
	//vertical label coordinate, testing for overflow
	var y = d3.event.clientY < 75 ? y2 : y1;

	d3.select(".infolabel")
		.style({
			"left": x + "px",
			"top": y + "px"
		});
};


})();


//function to highlight enumeration units and bars
// function highlight(props){
	// console.log(props)
	// //change stroke
	// var selected = d3.selectAll(".tract_" + props.ID)
		// .style({
			// "stroke": "black",
			// "stroke-width": "2"
		// });
	// console.log(selected)
	// setLabel(props);
// };
// 
// //function to create label
// function setLabel(props){
    // //label content
    // console.log(props.tract)
    // var labelAttribute = "<h3>" + props.tract +
        // "</h3><b>" + props[expressed] + " " + expressed + "</b>" + "<br>" 
//         
    // //create info label div
    // var infolabel = d3.select("body")
        // .append("div")
        // .attr({
            // "class": "infolabel",
            // "id": props.tract + "_label"
        // })
        // .html(labelAttribute);
// 
    // var tractName = infolabel.append("div")
        // .attr("class", "labelname")
        // .html(props.name);
//       
// };
// 
// 
// function dehighlight(props){
	// var selected = d3.selectAll(".tract_" + props.ID)
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
// // //function to move info label with mouse
// function moveLabel(){
	// //get width of label
	// var labelWidth = d3.select(".infolabel")
		// .node()
		// .getBoundingClientRect()
		// .width;
// // 
	// // //use coordinates of mousemove event to set label coordinates
	// var x1 = d3.event.clientX + 10,
		// y1 = d3.event.clientY - 50,
		// x2 = d3.event.clientX - labelWidth - 10,
		// y2 = d3.event.clientY + 25;
// // 
	// // //horizontal label coordinate, testing for overflow
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
