/* Shared, buildless UI utilities. D3 7.9.0 is served locally. */
(function () {
  "use strict";
  var INE = window.TURISMO_INE, SUN = window.TURISMO_SUN;
  var nf = new Intl.NumberFormat("es-ES"), one = new Intl.NumberFormat("es-ES", {maximumFractionDigits: 1, minimumFractionDigits: 1});
  var geos = new Map(INE.geos.map(function (g) { return [g.id, g]; }));
  var months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  var shortMonths = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  var resNames = {total: "Todas las residencias", residentes: "Residentes en España", extranjeros: "Residentes fuera de España"};
  var query = new URLSearchParams(location.search), tableData = {headers: [], rows: []};
  var tip = document.getElementById("tooltip");
  function number(v) { return v === null || v === undefined ? "Sin dato" : nf.format(v); }
  function pct(v, digits) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "No calculable";
    return (digits === 2 ? new Intl.NumberFormat("es-ES", {maximumFractionDigits: 2, minimumFractionDigits: 2}).format(v) : one.format(v)) + " %";
  }
  function compact(v) { return v >= 1e6 ? one.format(v / 1e6) + " M" : number(v); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function text(id, value) { var e = document.getElementById(id); if (e) e.textContent = value; }
  function announce(s) { text("status", s); }
  function setQuery(state) {
    var p = new URLSearchParams();
    Object.entries(state).forEach(function (x) { p.set(x[0], x[1]); });
    try { history.replaceState(null, "", location.pathname + "?" + p.toString()); } catch (_) {}
  }
  function hideTip() { tip.hidden = true; }
  function showTip(event, title, rows, note) {
    tip.innerHTML = "<strong>" + esc(title) + "</strong>" + rows.map(function (r) {
      return '<div class="tip-row"><span>' + esc(r[0]) + "</span><span>" + esc(r[1]) + "</span></div>";
    }).join("") + (note ? '<div class="tip-note">' + esc(note) + "</div>" : "");
    tip.hidden = false;
    var box = event.currentTarget.getBoundingClientRect();
    var x = event.clientX || box.right, y = event.clientY || box.top;
    tip.style.left = Math.max(8, Math.min(x + 16, innerWidth - tip.offsetWidth - 10)) + "px";
    tip.style.top = Math.max(8, Math.min(y + 12, innerHeight - tip.offsetHeight - 10)) + "px";
  }
  function wire(selection, info, action, hover, verticalStep) {
    var nodes = selection.nodes();
    selection.attr("tabindex", function (_, i) { return i ? -1 : 0; })
      .attr("role", action ? "button" : "graphics-symbol")
      .attr("aria-label", function (d) { var f = info(d); return f.title + ". " + f.rows.map(function (r) {return r.join(": ");}).join(". ") + (f.note ? ". " + f.note : ""); })
      .on("pointerenter", function (event, d) { var f = info(d); showTip(event, f.title, f.rows, f.note); if (hover) hover(d); })
      .on("pointermove", function (event, d) { var f = info(d); showTip(event, f.title, f.rows, f.note); })
      .on("pointerleave", hideTip)
      .on("focus", function (event, d) { var f = info(d); showTip(event, f.title, f.rows, f.note); if (hover) hover(d); })
      .on("blur", hideTip)
      .on("click", function (event, d) { if (action) {hideTip(); action(d);} else {var f = info(d);showTip(event,f.title,f.rows,f.note);} })
      .on("keydown", function (event, d) {
        if (action && (event.key === "Enter" || event.key === " ")) {event.preventDefault();hideTip();action(d);return;}
        var delta = {"ArrowRight":1,"ArrowLeft":-1,"ArrowDown":verticalStep || 1,"ArrowUp":-(verticalStep || 1)}[event.key];
        var index = nodes.indexOf(event.currentTarget), next;
        if (delta !== undefined) next = Math.max(0, Math.min(nodes.length - 1, index + delta));
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = nodes.length - 1;
        if (next !== undefined) {event.preventDefault();nodes[index].setAttribute("tabindex","-1");nodes[next].setAttribute("tabindex","0");nodes[next].focus();}
      });
  }
  function svg(host, id, width, height, title, description, source) {
    var target = d3.select("#" + host); target.selectAll("*").remove();
    var s = target.append("svg").attr("id", id).attr("viewBox", "0 0 " + width + " " + height)
      .attr("xmlns", "http://www.w3.org/2000/svg").attr("role", "group")
      .attr("aria-labelledby", id + "-title " + id + "-desc");
    s.append("title").attr("id", id + "-title").text(title);
    s.append("desc").attr("id", id + "-desc").text(description);
    s.append("metadata").text(JSON.stringify({title:title, description:description, author:window.TURISMO_AUTHOR||"", source:source, source_url:source.includes("82074")?SUN.source.url:INE.source.url, unit:"pernoctaciones", attribution:"Elaboración propia con datos del INE"}));
    s.append("rect").attr("width",width).attr("height",height).attr("fill","#fff").attr("aria-hidden","true");
    s.append("text").attr("x",18).attr("y",26).attr("font-size",17).attr("font-weight",650).attr("fill","#252525").text(title);
    if(width<500){
      s.append("text").attr("x",18).attr("y",height-23).attr("font-size",9).attr("fill","#555").text(window.TURISMO_AUTHOR||"Elaboración propia");
      s.append("text").attr("x",18).attr("y",height-10).attr("font-size",9).attr("fill","#555").text("Elaboración propia, INE EOH, "+source);
    }else{
      s.append("text").attr("x",18).attr("y",height-10).attr("font-size",9).attr("fill","#555").text((window.TURISMO_AUTHOR?window.TURISMO_AUTHOR+", ":"")+"Elaboración propia, INE EOH, " + source);
    }
    return s;
  }
  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(function () {URL.revokeObjectURL(url);}, 5000);
  }
  function exportSvg(id) {
    var original = document.getElementById(id); if (!original) return;
    var clone = original.cloneNode(true), vb = original.viewBox.baseVal;
    clone.setAttribute("width",vb.width);clone.setAttribute("height",vb.height);
    clone.querySelectorAll("text").forEach(function (n) { n.setAttribute("font-family","Arial, Helvetica, sans-serif"); });
    clone.querySelectorAll("[tabindex]").forEach(function (n) {n.removeAttribute("tabindex");});
    saveBlob(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone)], {type:"image/svg+xml;charset=utf-8"}), id + ".svg");
  }
  function table(headers, rows, caption) {
    tableData = {headers:headers, rows:rows};
    var target = document.getElementById("data-table"); if (!target) return;
    target.querySelector("thead").innerHTML = "<tr>" + headers.map(function (h) {return '<th scope="col">' + esc(h) + "</th>";}).join("") + "</tr>";
    target.querySelector("tbody").innerHTML = rows.map(function (r) {return "<tr>" + r.map(function (v) {return "<td>" + esc(v === null ? "Sin dato" : v) + "</td>";}).join("") + "</tr>";}).join("");
    if (caption) target.querySelector("caption").textContent = caption;
  }
  function exportCsv() {
    var csv = [tableData.headers].concat(tableData.rows).map(function (r) {return r.map(function (v) {return '"' + String(v === null ? "" : v).replace(/"/g,'""') + '"';}).join(";");}).join("\r\n");
    saveBlob(new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8"}), document.body.dataset.page + "-seleccion.csv");
  }
  function territoryOptions(select) {
    select.replaceChildren();
    var country = document.createElement("option");country.value="ES";country.textContent="España";select.append(country);
    var cgroup=document.createElement("optgroup");cgroup.label="Comunidades y ciudades autónomas";
    INE.geos.filter(function(g){return g.level==="community";}).sort(function(a,b){return a.name.localeCompare(b.name,"es");}).forEach(function(g){var o=document.createElement("option");o.value=g.id;o.textContent=g.name;cgroup.append(o);});select.append(cgroup);
    var pgroup=document.createElement("optgroup");pgroup.label="Provincias";
    INE.geos.filter(function(g){return g.level==="province";}).sort(function(a,b){return a.name.localeCompare(b.name,"es");}).forEach(function(g){var o=document.createElement("option");o.value=g.id;o.textContent=g.name;pgroup.append(o);});select.append(pgroup);
  }
  document.querySelectorAll("[data-export]").forEach(function (b) {b.addEventListener("click",function(){exportSvg(b.dataset.export);});});
  var download = document.getElementById("download-csv");if(download) download.addEventListener("click",exportCsv);
  window.Atlas = {INE:INE,SUN:SUN,geos:geos,months:months,shortMonths:shortMonths,resNames:resNames,query:query,
    number:number,pct:pct,compact:compact,esc:esc,text:text,announce:announce,setQuery:setQuery,showTip:showTip,
    hideTip:hideTip,wire:wire,svg:svg,table:table,territoryOptions:territoryOptions,exportSvg:exportSvg};
}());
