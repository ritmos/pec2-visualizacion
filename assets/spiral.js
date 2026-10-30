(function(){
  "use strict";
  if(document.body.dataset.page!=="spiral")return;
  var A=window.Atlas, I=A.INE;
  var state={a:"C05",b:"C04",res:"total",mode:"share",encoding:"color",from:2015,to:2025,compare:true};
  ["a","b"].forEach(function(k){if(A.geos.has(A.query.get(k)))state[k]=A.query.get(k);});
  if(["total","residentes","extranjeros"].includes(A.query.get("res")))state.res=A.query.get("res");
  if(["share","absolute"].includes(A.query.get("mode")))state.mode=A.query.get("mode");
  if(["color","height"].includes(A.query.get("encoding")))state.encoding=A.query.get("encoding");
  ["from","to"].forEach(function(k){var v=Number(A.query.get(k));if(I.years.includes(v))state[k]=v;});
  if(state.from>state.to){var swap=state.to;state.to=state.from;state.from=swap;}
  if(A.query.has("compare"))state.compare=A.query.get("compare")==="1";
  var ids={a:"geo-a",b:"geo-b",res:"residence",mode:"measure",encoding:"encoding",from:"start-year",to:"end-year",compare:"compare"};
  ["a","b"].forEach(function(k){A.territoryOptions(document.getElementById(ids[k]));});
  ["from","to"].forEach(function(k){document.getElementById(ids[k]).innerHTML=I.years.map(function(y){return '<option value="'+y+'">'+y+"</option>";}).join("");});
  Object.entries(ids).forEach(function(entry){
    var k=entry[0], e=document.getElementById(entry[1]);
    e.addEventListener("change",function(){
      state[k]=k==="compare"?e.checked:(k==="from"||k==="to"?Number(e.value):e.value);
      if(state.from>state.to){if(k==="from")state.to=state.from;else state.from=state.to;}
      render();
    });
  });
  document.getElementById("preset-islands").addEventListener("click",function(){state={a:"C05",b:"C04",res:"total",mode:"share",encoding:state.encoding,from:2015,to:2025,compare:true};render();});
  document.getElementById("preset-spain").addEventListener("click",function(){state={a:"ES",b:"C04",res:"total",mode:"absolute",encoding:state.encoding,from:2015,to:2025,compare:false};render();});
  function syncControls(){
    Object.entries(ids).forEach(function(entry){var e=document.getElementById(entry[1]);if(entry[0]==="compare")e.checked=state.compare;else e.value=state[entry[0]];});
    document.getElementById("control-b").hidden=!state.compare;
    document.getElementById("panel-b").hidden=!state.compare;
    document.getElementById("spiral-layout").classList.toggle("single",!state.compare);
  }
  function observations(id){
    var values=I.series[id][state.res], annual={};
    I.years.forEach(function(y){
      var a=values.slice((y-2015)*12,(y-2015+1)*12);
      annual[y]=a.some(function(v){return v===null;})?null:d3.sum(a);
    });
    return I.periods.map(function(p,i){
      var y=Number(p.slice(0,4)), m=Number(p.slice(5)), raw=values[i], denominator=annual[y];
      var share=raw!==null && denominator!==null && denominator>0?100*raw/denominator:null;
      return {geo:id,period:p,year:y,month:m,value:raw,share:share,total:denominator,
        metricValue:state.mode==="share"?share:raw,
        note:raw===null?"Mes sin dato publicado.":denominator===null?"El año tiene meses sin dato: el porcentaje anual no es calculable.":denominator===0?"El total anual es cero: el porcentaje no está definido.":null};
    }).filter(function(d){return d.year>=state.from && d.year<=state.to;});
  }
  var shareColors=["#44336a","#366f8d","#25958b","#75bd6b","#c8df56","#f5e760"];
  var shareColor=d3.scaleThreshold([4,8,12,16,20],shareColors);
  var currentA=[],currentB=[],maxValue=1,heightMaxValue=0,hasMetric=false,color,geometry;
  var barColor="#47738f";
  function stroke(d){return state.encoding==="height"?(d.metricValue===0?"#555":"#35566c"):"#fff";}
  function strokeWidth(d){return state.encoding==="height"&&d.metricValue===0?.9:.35;}
  function barHeight(d){
    if(d.metricValue===null)return null;
    return heightMaxValue>0?geometry.maxHeight*d.metricValue/heightMaxValue:0;
  }
  function info(d){
    return {title:A.geos.get(d.geo).name+", "+A.months[d.month-1]+" de "+d.year,
      rows:[["Pernoctaciones",A.number(d.value)],["% de su año",A.pct(d.share,2)],["Residencia",A.resNames[state.res]]],
      note:d.note||(state.mode==="share"?"El porcentaje usa el total de este año, territorio y residencia.":"La misma escala absoluta se aplica a ambos territorios.")};
  }
  function highlight(d){
    d3.selectAll(".month-cell").attr("stroke",function(x){return x.period===d.period?"#111":stroke(x);})
      .attr("stroke-width",function(x){return x.period===d.period?1.8:strokeWidth(x);});
    var results=[currentA].concat(state.compare?[currentB]:[]).map(function(set){
      var x=set.find(function(v){return v.period===d.period;});
      return A.geos.get(x.geo).name+": "+A.number(x.value)+" noches, "+A.pct(x.share);
    });
    A.text("spiral-readout",A.months[d.month-1]+" de "+d.year+". "+results.join(". "));
  }
  function legend(){
    var el=document.getElementById("spiral-legend");
    if(state.encoding==="height"){
      var scaleText=!hasMetric?"No hay valores calculables.":heightMaxValue===0?"Todos los valores son cero.":
        "Escala común: de 0 a "+(state.mode==="share"?A.pct(heightMaxValue,2):A.number(heightMaxValue)+" pernoctaciones")+".";
      el.innerHTML='<span class="legend-label">Altura desde la curva</span><span class="legend-item"><i class="legend-swatch" style="background:'+barColor+'"></i>'+scaleText+'</span><span class="legend-item"><i class="swatch missing"></i>Sin dato o no calculable</span>';
    }else if(state.mode==="share"){
      el.innerHTML='<span class="legend-label">Porcentaje de las noches de cada año</span><div class="legend-items">'+
        ["0-4 %","4-8 %","8-12 %","12-16 %","16-20 %","≥20 %"].map(function(label,i){return '<span class="legend-item"><i class="legend-swatch" style="background:'+shareColors[i]+'"></i>'+label+"</span>";}).join("")+
        '<span class="legend-item"><i class="swatch missing"></i>No calculable / sin dato</span></div>';
    }else{
      el.innerHTML='<span class="legend-label">Pernoctaciones, escala lineal compartida</span><div><div class="gradient"></div><div class="gradient-labels"><span>0</span><span>'+A.compact(maxValue/2)+'</span><span>'+A.compact(maxValue)+'</span></div></div><span class="legend-item"><i class="swatch missing"></i>Sin dato</span>';
    }
  }
  function draw(host,data){
    var geo=A.geos.get(data[0].geo), id=host+"-svg", W=640,H=688,cx=320,cy=341,years=state.to-state.from+1;
    var heightView=state.encoding==="height";
    var measureLabel=state.mode==="share"?"porcentaje del total anual":"pernoctaciones mensuales";
    var description="Una vuelta por año y un sector por mes. "+A.resNames[state.res]+". "+measureLabel+". "+
      (heightView?"La altura se mide desde la curva, con una escala lineal compartida que empieza en cero.":
       "El valor se representa por el color. El radio de la curva representa el tiempo.")+
      " Los meses sin dato conservan su posición.";
    var s=A.svg(host,id,W,H,geo.name+", "+state.from+"-"+state.to,description,"Tabla 2074");
    var meta=JSON.parse(s.select("metadata").text());
    meta.encoding=state.encoding;meta.measure=state.mode;
    meta.scale=heightView?{type:"linear",domain:[0,heightMaxValue],maxHeight:geometry.maxHeight}:
      state.mode==="share"?{type:"threshold",thresholds:[4,8,12,16,20]}:{type:"linear",domain:[0,maxValue]};
    s.select("metadata").text(JSON.stringify(meta));
    s.append("text").attr("x",18).attr("y",45).attr("font-size",11).attr("fill","#555")
      .text(A.resNames[state.res]+". "+(state.mode==="share"?"% anual":"Pernoctaciones")+". "+(heightView?"Altura":"Color")+".");
    var defs=s.append("defs");
    var pattern=defs.append("pattern").attr("id",id+"-missing").attr("width",5).attr("height",5)
      .attr("patternUnits","userSpaceOnUse").attr("patternTransform","rotate(45)");
    pattern.append("rect").attr("width",5).attr("height",5).attr("fill","#fff");
    pattern.append("line").attr("x1",0).attr("y1",0).attr("x2",0).attr("y2",5).attr("stroke","#aaa").attr("stroke-width",2);
    var g=s.append("g").attr("transform","translate("+cx+","+cy+")");
    function point(t,offset){
      var theta=t/12*2*Math.PI-Math.PI/2, r=geometry.r0+geometry.pitch*t/12+offset;
      return [r*Math.cos(theta),r*Math.sin(theta)];
    }
    function segment(d,index){
      var points=[],start=index+.025,end=index+.975;
      var inner=heightView?0:-geometry.half;
      var outer=heightView?(d.metricValue===null?geometry.maxHeight:barHeight(d)):geometry.half;
      for(var k=0;k<=12;k++)points.push(point(start+(end-start)*k/12,outer));
      for(var j=12;j>=0;j--)points.push(point(start+(end-start)*j/12,inner));
      return "M"+points.map(function(p){return p[0].toFixed(3)+","+p[1].toFixed(3);}).join("L")+"Z";
    }
    var backbone=d3.range(0,data.length+.01,.05).map(function(t){return point(t,0);});
    g.append("path").attr("class","spiral-baseline").attr("d",d3.line()(backbone))
      .attr("fill","none").attr("stroke",heightView?"#777":"#ddd").attr("stroke-width",.7).attr("aria-hidden","true");
    var cells=g.selectAll(".month-cell").data(data).join("path").attr("class","month-cell").attr("d",segment)
      .attr("data-period",function(d){return d.period;}).attr("data-geo",geo.id).attr("data-encoding",state.encoding)
      .attr("data-value",function(d){return d.value===null?"null":d.value;})
      .attr("data-share",function(d){return d.share===null?"null":d.share;})
      .attr("data-bar-height",function(d){return heightView?(barHeight(d)===null?"null":barHeight(d)):null;})
      .attr("fill",function(d){return d.metricValue===null?"url(#"+id+"-missing)":heightView?barColor:color(d.metricValue);})
      .attr("stroke",stroke).attr("stroke-width",strokeWidth);
    A.wire(cells,info,null,highlight,12);
    A.shortMonths.forEach(function(m,i){
      var theta=(i+.5)/12*2*Math.PI-Math.PI/2,x=266*Math.cos(theta),y=266*Math.sin(theta);
      g.append("text").attr("x",x).attr("y",y).attr("dy",".35em").attr("text-anchor","middle")
        .attr("font-size",11).attr("font-weight",600).attr("fill","#555").text(m);
    });
    for(var y=0;y<years;y++){
      g.append("text").attr("x",-5).attr("y",-geometry.r0-y*geometry.pitch+3).attr("text-anchor","end")
        .attr("font-size",9).attr("fill","#444").attr("stroke","#fff").attr("stroke-width",3)
        .attr("paint-order","stroke").attr("aria-hidden","true").text(state.from+y);
    }
    g.append("text").attr("text-anchor","middle").attr("y",-3).attr("font-size",15).attr("fill","#252525").text(state.from);
    g.append("text").attr("text-anchor","middle").attr("y",14).attr("font-size",9).attr("fill","#555").text("inicio");
    if(heightView){
      var label=!hasMetric?"No hay valores calculables.":heightMaxValue===0?"Todos los valores son cero.":
        "Altura desde la curva: de 0 a "+(state.mode==="share"?A.pct(heightMaxValue,2):A.number(heightMaxValue)+" noches")+".";
      s.append("rect").attr("x",40).attr("y",625).attr("width",16).attr("height",10).attr("fill",barColor);
      s.append("text").attr("x",63).attr("y",635).attr("font-size",11).attr("fill","#444").text(label);
    }else if(state.mode==="share"){
      ["0-4","4-8","8-12","12-16","16-20","20 % o más"].forEach(function(label,i){
        s.append("rect").attr("x",30+i*94).attr("y",628).attr("width",18).attr("height",9).attr("fill",shareColors[i]);
        s.append("text").attr("x",53+i*94).attr("y",637).attr("font-size",9).attr("fill","#555").text(label);
      });
    }else{
      var grad=defs.append("linearGradient").attr("id",id+"-scale");
      d3.range(0,1.01,.1).forEach(function(t){grad.append("stop").attr("offset",t*100+"%").attr("stop-color",color(maxValue*t));});
      s.append("rect").attr("x",190).attr("y",624).attr("width",260).attr("height",9).attr("fill","url(#"+id+"-scale)");
      s.append("text").attr("x",184).attr("y",633).attr("text-anchor","end").attr("font-size",9).attr("fill","#555").text("0");
      s.append("text").attr("x",458).attr("y",633).attr("font-size",9).attr("fill","#555").text(A.compact(maxValue));
    }
    s.append("rect").attr("x",160).attr("y",649).attr("width",14).attr("height",10).attr("fill","url(#"+id+"-missing)");
    s.append("text").attr("x",181).attr("y",658).attr("font-size",9).attr("fill","#555")
      .text(state.mode==="share"?"Porcentaje no calculable o dato ausente":"Sin dato publicado");
  }
  function render(){
    A.hideTip();syncControls();
    A.setQuery({a:state.a,b:state.b,res:state.res,mode:state.mode,encoding:state.encoding,from:state.from,to:state.to,compare:state.compare?"1":"0"});
    currentA=observations(state.a);currentB=state.compare?observations(state.b):[];
    maxValue=d3.max(currentA.concat(currentB),function(d){return d.value;})||1;
    color=state.mode==="share"?shareColor:d3.scaleSequential(d3.interpolateViridis).domain([0,maxValue]);
    var metrics=currentA.concat(currentB).map(function(d){return d.metricValue;}).filter(function(v){return v!==null;});
    hasMetric=metrics.length>0;heightMaxValue=d3.max(metrics)||0;
    var years=state.to-state.from+1,r0=48,span=182;
    if(state.encoding==="height"){
      var pitch=span/(years+.82);
      geometry={r0:r0,pitch:pitch,maxHeight:.82*pitch,half:0};
    }else{
      var half=Math.min(18,.38*span/(years+.38));
      geometry={r0:r0,pitch:(span-half)/years,maxHeight:0,half:half};
    }
    legend();
    A.text("spiral-a-title","A, "+A.geos.get(state.a).name);draw("spiral-a",currentA);
    if(state.compare){A.text("spiral-b-title","B, "+A.geos.get(state.b).name);draw("spiral-b",currentB);}
    else d3.select("#spiral-b").selectAll("*").remove();
    var sets=currentA.concat(currentB), missing=sets.filter(function(d){return d.value===null;}).length;
    var notComputable=sets.filter(function(d){return d.metricValue===null;}).length;
    A.text("spiral-readout","Señala un mes para consultar "+(state.compare?"el mismo periodo en ambos territorios.":"su valor exacto. Tab y las flechas permiten recorrer los meses."));
    var explanation=state.encoding==="height"?
      "La altura se mide desde la curva, no desde el centro. Las dos vistas usan la misma escala lineal. Con pocos años se ven mejor las barras.":
      state.mode==="share"?"Los colores muestran tramos de porcentaje; el último incluye el 20 % o más.":
      "Las dos vistas usan la misma escala de color, de 0 a "+A.number(maxValue)+" noches.";
    A.text("spiral-note",explanation+" "+
      (state.mode==="share"?"Cada porcentaje se calcula sobre las noches de su propio año. ":"")+
      currentA.length+" meses por territorio. "+
      (missing?missing+" datos mensuales ausentes. ":"")+
      (state.mode==="share"&&notComputable?notComputable+" porcentajes no calculables. ":"")+
      "Los meses tienen distinta duración.");
    var endA=currentA.filter(function(d){return d.year===state.to;}), peakA=endA.filter(function(d){return d.value!==null;}).sort(function(a,b){return b.value-a.value;})[0];
    var description;
    if(state.compare){
      var endB=currentB.filter(function(d){return d.year===state.to;}), peakB=endB.filter(function(d){return d.value!==null;}).sort(function(a,b){return b.value-a.value;})[0];
      description="En "+state.to+", el máximo mensual de "+A.geos.get(state.a).name+" es "+A.months[peakA.month-1].toLowerCase()+" ("+A.number(peakA.value)+" noches; "+A.pct(peakA.share)+"). En "+A.geos.get(state.b).name+" es "+A.months[peakB.month-1].toLowerCase()+" ("+A.number(peakB.value)+"; "+A.pct(peakB.share)+").";
    }else{
      description="En "+state.to+", "+A.months[peakA.month-1].toLowerCase()+" registra el máximo mensual de "+A.geos.get(state.a).name+": "+A.number(peakA.value)+" noches ("+A.pct(peakA.share)+" del año).";
    }
    if(state.a==="C05"&&state.b==="C04"&&state.compare&&state.res==="total"&&state.to===2025)description="En 2025, enero reúne el "+A.pct(endA[0].share)+" de las noches de Canarias y el "+A.pct(endB[0].share)+" de Baleares. En agosto son el "+A.pct(endA[7].share)+" y el "+A.pct(endB[7].share)+", respectivamente. Canarias mantiene actividad durante todo el año; Baleares concentra muchas más noches en verano.";
    A.text("spiral-insight",description);
    A.table(["Territorio","Periodo","Residencia","Pernoctaciones","% de su año","Observación"],sets.map(function(d){return [A.geos.get(d.geo).name,A.months[d.month-1]+" "+d.year,A.resNames[state.res],A.number(d.value),A.pct(d.share,2),d.note||""];}));
    window.atlasState=Object.assign({page:"spiral",countA:currentA.length,countB:currentB.length,maxValue:maxValue,heightMaxValue:heightMaxValue,geometry:geometry,missing:missing,notComputable:notComputable},state);
    A.announce("Espiral actualizada: "+A.geos.get(state.a).name+(state.compare?" y "+A.geos.get(state.b).name:"")+", "+state.from+" a "+state.to+". "+(state.mode==="share"?"Porcentaje anual.":"Pernoctaciones absolutas.")+" Representación por "+(state.encoding==="height"?"altura.":"color."));
  }
  render();
}());
