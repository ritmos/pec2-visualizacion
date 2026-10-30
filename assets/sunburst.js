(function () {
  "use strict";
  if(document.body.dataset.page!=="sunburst")return;
  var A=window.Atlas, islands=A.SUN.islands.slice().sort(function(a,b){return b.total-a.total;});
  var chosen="all", select=document.getElementById("island-select");
  var colors={residentes:"#d7953e",extranjeros:"#246e68"};
  select.innerHTML='<option value="all">Todas las islas</option>'+islands.map(function(i){return '<option value="'+i.id+'">'+A.esc(i.name)+'</option>';}).join("");
  if(islands.some(function(i){return i.id===A.query.get("island");}))chosen=A.query.get("island");
  function change(id){chosen=id;select.value=id;render();A.announce(id==="all"?"Sunburst completo de Canarias.":"Ampliación de "+islands.find(function(i){return i.id===id;}).name+". Los porcentajes se refieren a esta isla.");}
  select.addEventListener("change",function(){change(select.value);});
  document.getElementById("sunburst-reset").addEventListener("click",function(){change("all");});
  function render(){
    select.value=chosen;A.setQuery({island:chosen});
    var island=chosen==="all"?null:islands.find(function(i){return i.id===chosen;});
    var scope=island?[island]:islands, total=island?island.total:A.SUN.total;
    function children(i){return ["extranjeros","residentes"].map(function(r){return {name:A.resNames[r],residence:r,islandId:i.id,value:i.values[r]};});}
    var tree=island?{name:island.name,id:island.id,children:children(island)}:
      {name:"Canarias",id:"all",children:islands.map(function(i){return {name:i.name,id:i.id,children:children(i)};})};
    var root=d3.hierarchy(tree).sum(function(d){return d.children?0:d.value;});
    d3.partition().size([Math.PI*2,1])(root);
    var s=A.svg("sunburst-chart","sunburst-svg",640,650,
      (island?island.name:"Canarias")+", Pernoctaciones hoteleras, 2025",
      "Sunburst. En la vista general el primer anillo representa islas y el exterior residencia. El ángulo es proporcional. Vista actual: "+tree.name+". Total "+A.number(total)+" noches.","Tabla 82074");
    s.append("text").attr("x",18).attr("y",44).attr("font-size",11).attr("fill","#555").text(island?"Detalle de residencia, porcentaje del total de "+island.name:"Ángulo = pernoctaciones, primer anillo: isla, segundo anillo: residencia");
    var g=s.append("g").attr("transform","translate(320,325)");
    var arc=d3.arc().startAngle(function(d){return d.x0;}).endAngle(function(d){return d.x1;})
      .padAngle(function(d){return Math.min(.003,(d.x1-d.x0)/10);}).padRadius(160)
      .innerRadius(function(d){return island?119:d.depth===1?85:163;})
      .outerRadius(function(d){return island?262:d.depth===1?159:262;});
    var nodes=root.descendants().slice(1);
    var paths=g.selectAll(".sun-sector").data(nodes).join("path").attr("class","sun-sector").attr("d",arc)
      .attr("data-island",function(d){return d.data.islandId||d.data.id;}).attr("data-value",function(d){return d.value;})
      .attr("data-depth",function(d){return d.depth;}).attr("fill",function(d){return d.data.residence?colors[d.data.residence]:"#bacbbd";})
      .attr("stroke","#fff").attr("stroke-width",.7);
    function info(d){
      var id=d.data.islandId||d.data.id, original=islands.find(function(i){return i.id===id;});
      var rows=[["Pernoctaciones",A.number(d.value)],["% de "+tree.name,A.pct(100*d.value/total,2)]];
      if(d.data.residence && !island)rows.push(["% de "+original.name,A.pct(100*d.value/original.total,2)]);
      return {title:(d.data.residence?original.name+", ":"")+d.data.name,rows:rows,note:!island?"Selecciona para ampliar "+original.name+".":"El radio indica el nivel jerárquico; el ángulo representa noches."};
    }
    A.wire(paths,info,!island?function(d){change(d.data.islandId||d.data.id);}:null);
    if(!island){
      root.children.forEach(function(d){
        if(d.x1-d.x0<.19)return;
        var mid=(d.x0+d.x1)/2, deg=mid*180/Math.PI-90;
        g.append("text").attr("transform","rotate("+deg+") translate(123,0) rotate("+(mid>Math.PI?180:0)+")")
          .attr("text-anchor","middle").attr("dy",".32em").attr("font-size",12).attr("font-weight",650)
          .attr("fill","#252525").attr("pointer-events","none").text(d.data.name);
      });
    }else{
      root.children.forEach(function(d){
        var point=arc.centroid(d);
        var label=g.append("text").attr("transform","translate("+point+")").attr("text-anchor","middle").attr("fill",d.data.residence==="residentes"?"#252525":"white").attr("pointer-events","none");
        label.append("tspan").attr("x",0).attr("dy","-.2em").attr("font-size",12).text(d.data.residence==="residentes"?"En España":"Fuera de España");
        label.append("tspan").attr("x",0).attr("dy","1.45em").attr("font-size",20).attr("font-weight",650).text(A.pct(100*d.value/total));
      });
    }
    g.append("text").attr("text-anchor","middle").attr("y",-20).attr("font-size",island?20:16).attr("fill","#252525").text(tree.name);
    g.append("text").attr("text-anchor","middle").attr("y",15).attr("font-size",island?27:25).attr("font-weight",650).attr("fill","#252525").text(A.compact(total));
    g.append("text").attr("text-anchor","middle").attr("y",35).attr("font-size",10).attr("fill","#555").text("pernoctaciones, 2025");
    A.text("sunburst-breadcrumb",island?"Canarias: "+island.name+", residencia":"Islas y residencia");
    A.text("sunburst-list-title","% de cada isla en Canarias");
    var list=document.getElementById("island-list");list.innerHTML="";
    islands.forEach(function(i){
      var b=document.createElement("button");b.className="island-button";b.dataset.island=i.id;b.setAttribute("aria-pressed",String(chosen===i.id));
      b.innerHTML="<span>"+A.esc(i.name)+'</span><span class="small">'+A.pct(100*i.total/A.SUN.total,2)+"</span>";
      b.addEventListener("click",function(){change(i.id);});list.append(b);
    });
    var resident=d3.sum(scope,function(i){return i.values.residentes;}), outside=d3.sum(scope,function(i){return i.values.extranjeros;});
    document.getElementById("sunburst-info").innerHTML="<strong>"+A.number(total)+" noches</strong><p>"+A.pct(100*resident/total)+" de residentes en España<br>"+A.pct(100*outside/total)+" de residentes fuera de España</p>"+
      (island?"<p>Esta isla reúne el "+A.pct(100*total/A.SUN.total,2)+" de Canarias. El círculo ampliado representa exclusivamente sus noches.</p>":"<p>Los dos anillos muestran el mismo total.</p>");
    if(island){
      A.text("sunburst-insight","En "+island.name+", el "+A.pct(100*resident/total)+" de las noches corresponde a residentes en España. La isla representa el "+A.pct(100*total/A.SUN.total,2)+" de Canarias: el porcentaje de residencia se calcula dentro de la isla.");
    }else{
      A.text("sunburst-insight","Tenerife y Gran Canaria concentran el "+A.pct(100*(islands.find(function(i){return i.name==="Tenerife";}).total+islands.find(function(i){return i.name==="Gran Canaria";}).total)/A.SUN.total)+" de las noches.");
    }
    var rows=[];
    scope.forEach(function(i){["residentes","extranjeros"].forEach(function(r){rows.push([i.name,A.resNames[r],A.number(i.values[r]),A.pct(100*i.values[r]/i.total,2),A.pct(100*i.values[r]/A.SUN.total,2)]);});});
    A.table(["Isla","Residencia","Pernoctaciones","% de la isla","% de Canarias"],rows);
    window.atlasState={page:"sunburst",island:chosen,total:total,leaves:root.leaves().length};
  }
  render();
}());
