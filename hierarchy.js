const width = 960;
const height = 500;
const padding = 140;
const diameter = 700;

const svg = d3.select("svg#vis");
svg.attr("width", width);
svg.attr("height", height);

let plot = svg.append("g")
  .attr("id", "plot")
  .attr("transform", translate(padding + 100, padding + 100));

let columns = ["City", "Call Type", "Call Type Group", "Neighborhoood"];

d3.csv("data.csv").then(draw);

function draw(csv) {
  console.log("data", csv);

  let nested = d3.nest()
    .key(function(d) {
      return d["City"];
    })
    .key(function(d) {
      return d["Call Type"]
    })
    .key(function(d) {
      return d["Call Type Group"]
    })
    .key(function(d) {
      return d["Neighborhoood"]
    })
    .rollup(function(v) {
      return v.length;
    })
    .entries(csv);

  let data = d3.hierarchy(nested[0], function(d) { return d.values; });

  data.count()
  data.sum(d => d.value);

  data.sort(function(a, b) {
    return b.height - a.height || b.count - a.count;
  });

  let layout = d3.cluster().size([2 * Math.PI, (diameter / 2) - padding]);

  layout(data);

  data.each(function(node) {
    node.theta = node.x;
    node.radial = node.y;
    let point = toCartesian(node.radial, node.theta);
    node.x = point.x;
    node.y = point.y;
  });

  let generator = d3.linkVertical()
    .x(d => d.x)
    .y(d => d.y);

  colorScale = d3.scaleOrdinal(d3.schemeAccent)
    .domain(columns);

  drawLinks(plot.append("g"), data.links(), generator);
  drawNodes(plot.append("g"), data.descendants(), true);

  svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(500, 300)")

  let legend = d3.legendColor()
    .shapeWidth(15)
    .shapeHeight(15)
    .scale(colorScale)

  svg.select(".legend")
    .call(legend);
    svg.append("text").attr("id","legendtitle")
    .attr("x", 510)
    .attr("y", 280)
    .style("font-weight", 500)
    .style("font-size", "16px")
    .text("Category");
}

function drawLinks(g, links, generator) {
  let paths = g.selectAll('path')
    .data(links)
    .enter()
    .append('path')
    .attr('d', generator)
    .attr('class', 'link');
}

function drawNodes(g, nodes, raise) {
  let circles = g.selectAll('circle')
    .data(nodes, node => node.data.key)
    .enter()
    .append('circle')
    .attr('r', 5)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('id', d => d.data.key)
    .text(function(d) { return d.data.key; })
    .attr('class', 'node')
    .style('fill', function(d) { return colorScale(columns[d.depth]); })
    .style('stroke', 'black')

    let empty = circles.filter(d => (d.data.key === "")).remove();
    interactivity(g, circles);
}

function interactivity(g, selection) {

  function showTooltip(g, node) {
    let gbox = g.node().getBBox();
    let nbox = node.node().getBBox();

      let dx = nbox.width / 2;
      let dy = nbox.height / 2;

      let x = nbox.x + dx;
      let y = nbox.y + dy;

      let datum = node.datum();

      let name = datum.data.key;

      numberFormat = d3.format(".2~s");
      let text = `${name} (${numberFormat(datum.value)} cases)`;

      let tooltip = g.append('text')
        .text(text)
        .attr('x', x)
        .attr('y', y)
        .attr('dy', -dy - 4)
        .attr('text-anchor', 'middle')
        .attr('id', 'tooltip');

      let tbox = tooltip.node().getBBox();

      if (tbox.x < gbox.x) {
        tooltip.attr('text-anchor', 'start');
        tooltip.attr('dx', -dx);
      }
      else if ((tbox.x + tbox.width) > (gbox.x + gbox.width)) {
        tooltip.attr('text-anchor', 'end');
        tooltip.attr('dx', dx);
      }

      if (tbox.y < gbox.y) {
        tooltip.attr('dy', dy + tbox.height);
      }
    }

  selection.on('mouseover.highlight', function(d) {

    let path = d3.select(this).datum().path(selection.data()[0]);

    let update = selection.data(path, node => node.data.name);

    update.classed('selected', true);
  });

  selection.on('mouseout.highlight', function(d) {
    let path = d3.select(this).datum().path(selection.data()[0]);
    let update = selection.data(path, node => node.data.name);
    update.classed('selected', false);
  });

  selection.on('mouseover.tooltip', function(d) {
      let selected = d3.select(this);
      showTooltip(g, d3.select(this));
  })

  selection.on('mouseout.tooltip', function(d) {
    g.select("#tooltip").remove();
  });
}


function toCartesian(r, theta) {
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

function translate(x, y) {
  return "translate(" + String(x) + "," + String(y) + ")";
}
