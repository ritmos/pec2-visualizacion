(function () {
  "use strict";
  if (document.body.dataset.page !== "treemap") return;
  var A=window.Atlas, select=document.getElementById("treemap-region");
  var communities=A.INE.treemap.children, region="ES";
  var palette=["#24736a","#457f87","#b47b3a","#758d6b","#9c6654","#777b9d","#536f8b","#8f8e56"];
  var sorted=communities.slice().sort(function(a,b){return b.official_total-a.official_total;});
  var colors=new Map(sorted.map(function(c,i){return [c.id,palette[i%palette.length]];}));
  select.innerHTML='<option value="ES">Toda España</option>'+communities.slice().sort(function(a,b){return a.name.localeCompare(b.name,"es");}).map(function(c){return '<option value="'+c.id+'">'+A.esc(c.name)+'</option>';}).join("");
  if (A.query.has("region") && ["ES"].concat(communities.map(function(c){return c.id;})).includes(A.query.get("region"))) region=A.query.get("region");
  select.value=region;
  function change(id){region=id;select.value=id;render();A.announce("Treemap: "+A.geos.get(id).name+". Año2025.");}
  select.addEventListener("change",function(){change(select.value);});
  document.getElementById("treemap-reset").addEventListener("click",function(){change("ES");});
  function render(){
    A.setQuery({region:region});
    var data=region==="ES"?A.INE.treemap:communities.find(function(c){return c.id===region;});
    // A city has no provincial subdivision. Wrap it as a single real leaf for the detail view.
    if(!data.children) data={id:region,name:data.name,children:[{id:region,name:data.name,value:data.value}]};
    var root=d3.hierarchy(data).sum(function(d){return d.children?0:(d.value||0);}).sort(function(a,b){return b.value-a.value;});
    var width=innerWidth<700?Math.max(300,document.getElementById("treemap-chart").clientWidth-6):1100, height=620, xpad=16, ypad=58;
    d3.treemap().tile(d3.treemapSquarify).size([width-2*xpad,510]).paddingOuter(2).paddingInner(3)
      .paddingTop(function(d){return d.depth===1 && d.children?27:2;})(root);
    var leaves=root.leaves(), largest=region==="ES"?root.children.slice().sort(function(a,b){return b.value-a.value;})[0]:leaves[0];
    document.getElementById("treemap-metrics").innerHTML=
      '<div class="metric"><small>Total de noches</small><strong>'+A.compact(root.value)+'</strong><span>'+A.number(root.value)+' pernoctaciones</span></div>'+
      '<div class="metric"><small>Mayor peso</small><strong>'+A.esc(largest.data.name)+'</strong><span>'+A.pct(100*largest.value/root.value)+' de esta vista</span></div>'+
      '<div class="metric"><small>Territorios</small><strong>'+leaves.length+' '+(region==="ES"?"unidades":leaves.length===1?"unidad":"provincias")+'</strong><span>'+(region==="ES"?"50 provincias y 2 ciudades autónomas":A.esc(data.name))+'</span></div>';
    var s=A.svg("treemap-chart","treemap-svg",width,height,data.name+(width<700?", 2025":", Pernoctaciones hoteleras, 2025"),
      "Rectángulos anidados con áreas proporcionales. "+A.number(root.value)+" pernoctaciones. Use las flechas para recorrer las unidades y Enter para ampliar su comunidad.","Tabla 2074");
    s.append("text").attr("x",18).attr("y",44).attr("font-size",11).attr("fill","#555").text(width<700?"Pernoctaciones hoteleras, área proporcional":"Área = noches de estancia. Las provincias se agrupan en su comunidad; los colores no indican cantidades.");
    var g=s.append("g").attr("transform","translate("+xpad+","+ypad+")");
    var parents=root.descendants().filter(function(n){return n.depth===1 && n.children;});
    g.selectAll(".tree-parent").data(parents).join("rect").attr("class","tree-parent")
      .attr("x",function(n){return n.x0;}).attr("y",function(n){return n.y0;}).attr("width",function(n){return n.x1-n.x0;}).attr("height",function(n){return n.y1-n.y0;})
      .attr("fill",function(n){return d3.color(colors.get(n.data.id)).darker(.65);}).attr("rx",2);
    function parent(n){return region==="ES"?(n.depth===2?n.parent.data.id:n.data.id):region;}
    var rects=g.selectAll(".tree-leaf").data(leaves).join("rect").attr("class","tree-leaf")
      .attr("data-id",function(n){return n.data.id;}).attr("data-value",function(n){return n.value;})
      .attr("x",function(n){return n.x0;}).attr("y",function(n){return n.y0;})
      .attr("width",function(n){return Math.max(0,n.x1-n.x0);}).attr("height",function(n){return Math.max(0,n.y1-n.y0);})
      .attr("fill",function(n){return d3.interpolateRgb(colors.get(parent(n))||"#24736a","#fff")(.24);}).attr("stroke","#fff").attr("stroke-width",.7).attr("rx",2);
    A.wire(rects,function(n){return {title:n.data.name,rows:[["Pernoctaciones",A.number(n.value)],["% de esta vista",A.pct(100*n.value/root.value)],["Comunidad / ciudad",A.geos.get(parent(n)).name]],note:region==="ES"?"Selecciona para ampliar su comunidad.":null};},
      region==="ES"?function(n){change(parent(n));}:null);
    // Each label is clipped to its actual area. Small leaves remain in the table.
    var defs=s.append("defs");
    leaves.forEach(function(n,i){
      var w=n.x1-n.x0,h=n.y1-n.y0;
      defs.append("clipPath").attr("id","tree-label-"+i).append("rect").attr("x",n.x0+5).attr("y",n.y0+3).attr("width",Math.max(0,w-10)).attr("height",Math.max(0,h-6));
      if(w<68||h<27)return;
      var label=g.append("text").attr("x",n.x0+8).attr("y",n.y0+20).attr("font-size",w>190?15:12).attr("fill","#102c2b").attr("font-weight",650).attr("clip-path","url(#tree-label-"+i+")").attr("pointer-events","none");
      label.text(n.data.name);
      var name=n.data.name;
      while(label.node().getComputedTextLength()>w-16 && name.length>1){name=name.slice(0,-1);label.text(name+"…");}
      if(h>48){
        var valueLabel=g.append("text").attr("x",n.x0+8).attr("y",n.y0+39).attr("font-size",11).attr("fill","#102c2b").attr("clip-path","url(#tree-label-"+i+")").attr("pointer-events","none").text(A.compact(n.value)+", "+A.pct(100*n.value/root.value));
        if(valueLabel.node().getComputedTextLength()>w-16)valueLabel.text(A.compact(n.value));
      }
    });
    parents.forEach(function(n,i){
      defs.append("clipPath").attr("id","tree-parent-label-"+i).append("rect").attr("x",n.x0+4).attr("y",n.y0+2).attr("width",Math.max(0,n.x1-n.x0-8)).attr("height",23);
      if(n.x1-n.x0<50)return;
      var label=g.append("text").attr("class","tree-heading").attr("x",n.x0+7).attr("y",n.y0+18).attr("font-size",11).attr("font-weight",650).attr("fill","#fff").attr("pointer-events","none").attr("clip-path","url(#tree-parent-label-"+i+")").text(n.data.name);
      var name=n.data.name;
      while(label.node().getComputedTextLength()>n.x1-n.x0-14 && name.length>1){name=name.slice(0,-1);label.text(name+"…");}
    });
    if(region==="ES"){
      var top4=root.children.slice().sort(function(a,b){return b.value-a.value;}).slice(0,4);
      A.text("treemap-insight",top4.map(function(n){return n.data.name;}).join(", ")+" reúnen el "+A.pct(100*d3.sum(top4,function(n){return n.value;})/root.value)+" de las pernoctaciones de 2025.");
    }else{
      A.text("treemap-insight",largest.data.name+" representa el "+A.pct(100*largest.value/root.value)+" de las pernoctaciones de esta vista.");
    }
    A.table(["Comunidad / ciudad","Provincia / unidad","Pernoctaciones","% de la vista"],leaves.map(function(n){return [A.geos.get(parent(n)).name,n.data.name,A.number(n.value),A.pct(100*n.value/root.value,2)];}));
    window.atlasState={page:"treemap",region:region,total:root.value,leaves:leaves.length};
  }
  var resizeTimer;
  window.addEventListener("resize",function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(render,120);});
  render();
}());
