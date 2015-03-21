var w = 800,
h = 400,
rx = w / 2,
ry = h / 2,
m0,
rotate = 0;

var splines = [];

var cluster = d3.layout.cluster()
.size([360, ry*0.6])
.sort(function(a, b) { return d3.ascending(a.key, b.key); });

var bundle = d3.layout.bundle();

var line = d3.svg.line.radial()
.interpolate("bundle")
.tension(.85)
.radius(function(d) { return d.y; })
.angle(function(d) { return d.x / 180 * Math.PI; });

var colorScale = d3.scale.linear().domain([-1,0,1]).range(['#000080', '#98FB98', '#B0171F']);

// Chrome 15 bug: <http://code.google.com/p/chromium/issues/detail?id=98951>
var div = d3.select("body").insert("div")
.style("top", "20px")
.style("left", "350px")
.style("width", w + "px")
.style("height", w+ "px")
.style("position", "absolute")
.style("-webkit-backface-visibility", "hidden");

var svg = div.append("svg:svg")
.attr("width", w)
.attr("height", w)
.append("svg:g")
.attr("transform", "translate(" + rx + "," + ry + ")");

svg.append("svg:path")
.attr("class", "arc")
.attr("d", d3.svg.arc().outerRadius(ry*.5).innerRadius(0).startAngle(0).endAngle(2 * Math.PI))
.on("mousedown", mousedown);

d3.json("brain_network.json", function(classes) {
	var nodes = cluster.nodes(packages.root(classes)),
	links = packages.imports(nodes),
	splines = bundle(links),
	max_degree = d3.max(nodes, function(d){return d.degree;}),
	max_w = d3.max(nodes, function(d){return d.degree;});

	d3.select("#degreeInput").attr("max",max_degree).attr("value",max_degree);
	d3.select("#degree").attr("value",max_degree);

	colorScale.domain([-max_w,0,max_w]);

	var path = svg.selectAll("path.link")
	.data(links)
	.enter().append("svg:path")
	.attr("class", function(d) { return "link source-" + d.source.key + " target-" + d.target.key; })
	.attr("d", function(d, i) { return line(splines[i]); });

	svg.selectAll("g.node")
	.data(nodes.filter(function(n) { return !n.children; }))
	.enter().append("svg:g")
	.attr("class", "node")
	.attr("id", function(d) { return "node-" + d.key; })
	.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
	.append("svg:text")
	.attr("stroke-opacity",0)
	.attr("x", function(d) { return d.x < 180 ? d.degree: -d.degree; })
	.attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
	.attr("dy", ".31em")
	.attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
	.attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
	.text(function(d) { return d.key; })
	.on("click", click)
	.on("mouseover", mouseover)
	.on("mouseout", mouseout);

	svg.selectAll("g.node")
	.append("svg:rect")
	.attr("x",0)
	.attr("y",-3)
	.attr("width",30)
	.attr("height",7)
	.attr("width",function(d) { return d.degree})
	.attr("fill",function(d) { return colorScale(d.degree)} );  
		
	d3.select("#tensionInput").on("change", function() {
		line.tension(this.value / 100);
		path.attr("d", function(d, i) { return line(splines[i]); });
	});
  
	d3.select("#degreeInput").on("change", function() {
		allNodes = svg.selectAll('g.node');
		thresh = this.value * 1.00;
		hub = allNodes.filter(function(n){return n.degree>= thresh;});
		hub.classed("hub",true);
		others = allNodes.filter(function(n){return n.degree< thresh;});
		others.classed("hub",false);

	});
   
});

d3.select(window)
.on("mousemove", mousemove)
.on("mouseup", mouseup);

function mouse(e) {
	return [e.pageX - rx, e.pageY - ry];
}

function mousedown() {
	m0 = mouse(d3.event);
	d3.event.preventDefault();
}

function mousemove() {
	if (m0) {
		var m1 = mouse(d3.event),
		dm = Math.atan2(cross(m0, m1), dot(m0, m1)) * 180 / Math.PI;
		div.style("-webkit-transform", "translateY(" + (ry - rx) + "px)rotateZ(" + dm + "deg)translateY(" + (rx - ry) + "px)");
	}
}

function mouseup() {
	if (m0) {
		var m1 = mouse(d3.event),
		dm = Math.atan2(cross(m0, m1), dot(m0, m1)) * 180 / Math.PI;

		rotate += dm;
		if (rotate > 360) rotate -= 360;
		else if (rotate < 0) rotate += 360;
		m0 = null;

		div.style("-webkit-transform", null);

		svg
		.attr("transform", "translate(" + rx + "," + ry + ")rotate(" + rotate + ")")
		.selectAll("g.node text")
		.attr("dx", function(d) { return (d.x + rotate) % 360 < 180 ? 8 : -8; })
		.attr("text-anchor", function(d) { return (d.x + rotate) % 360 < 180 ? "start" : "end"; })
		.attr("transform", function(d) { return (d.x + rotate) % 360 < 180 ? null : "rotate(180)"; })
		.attr("x", function(d) { return (d.x + rotate) % 360 < 180 ? d.degree: -d.degree; });
	}
}

var brain_views = {};
brain_views["LAmygVol"] = [90, 400, 90];
brain_views["LThalVol"] = [190, 430, 910];

// added integration with xtk
function click() {
	// get clicked element
	var element_label = d3.select(this)[0][0].innerHTML;
	console.log(element_label);
	r.camera.position = brain_views[element_label];
	// alter r
	// r.camera.position = [90, 400, 90];
}


function mouseover(d) {

	svg.selectAll("path.link")
	.style("stroke-opacity",0);

	svg.selectAll("g.node")
	.style("opacity",0.1);

	svg.select("#node-" + d.key).style("opacity", 1);

	svg.selectAll("path.link.target-" + d.key)
	.classed("target", true)
	.style("stroke-opacity",1)
	.each(updateNodes("source", true));

	svg.selectAll("path.link.source-" + d.key)
	.classed("source", true)
	.style("stroke-opacity",1)
	.each(updateNodes("target", true));

}

function mouseout(d) {
	svg.selectAll("path.link.source-" + d.key)
	.classed("source", false)
	.each(updateNodes("target", false));

	svg.selectAll("path.link.target-" + d.key)
	.classed("target", false)
	.each(updateNodes("source", false));
	
	svg.selectAll("path.link")
	.style("stroke-opacity",0.1);

	svg.selectAll("g.node")
	.style("opacity",1);

}

function updateNodes(name, value) {
	return function(d) {
		if (value) { 
			this.parentNode.appendChild(this);
			svg.select("#node-" + d[name].key).style("opacity", 1);
		}
		svg.select("#node-" + d[name].key).classed(name, value);
	};
}

function cross(a, b) {
	return a[0] * b[1] - a[1] * b[0];
}

function dot(a, b) {
	return a[0] * b[0] + a[1] * b[1];
}


var packages = {

	// Lazily construct the package hierarchy from class names.
	root: function(classes) {
		var map = {};

		function find(name, data) {
			var node = map[name], i;
			if (!node) {
				node = map[name] = data || {name: name, children: []};
				if (name.length) {
					node.parent = find(name.substring(0, i = name.lastIndexOf(".")));
					node.parent.children.push(node);
					node.key = name.substring(i + 1);
				}
			}
			return node;
		}

		classes.forEach(function(d) {
			find(d.name, d);
		});

		return map[""];
	},

	// Return a list of imports for the given array of nodes.
	imports: function(nodes) {
		var map = {},
		imports = [];

		// Compute a map from name to node.
		nodes.forEach(function(d) {
			map[d.name] = d;
		});

		// For each import, construct a link from the source to target node.
		nodes.forEach(function(d) {
			if (d.imports) d.imports.forEach(function(i) {
				imports.push({source: map[d.name], target: map[i]});
			});
		});

		return imports;
	}
};
