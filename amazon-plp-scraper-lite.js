// =============================================================================
// Amazon search-results (PLP) scraper - LITE: strict validation, plain CSV
// Run on any Amazon search results page (desktop layout, not mobile mode).
// F12 -> Console -> type "allow pasting" + Enter -> paste this script -> Enter
// =============================================================================
(function(){
  // ============== SETTINGS ==============
  var DEADLINE       = null;  // e.g. new Date(2026,6,14); null = skip the on-time check
  var SKIP_SPONSORED = true;  // ignore ads inside the results list
  // ======================================
  var site = location.hostname;
  var YEAR = DEADLINE ? DEADLINE.getFullYear() : new Date().getFullYear();

  // ---------- shared parsing helpers ----------
  // Prices: "$1,299.99", "1.299,00 €", "29,99 €", "1 299,00" -> number
  function parseMoney(v){
    var s=String(v).replace(/[^0-9.,]/g,'');
    if(!s) return 0;
    var dec=Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
    if(dec>-1 && s.length-dec-1<=2){
      return parseFloat(s.slice(0,dec).replace(/[.,]/g,'')+'.'+s.slice(dec+1))||0;
    }
    return parseFloat(s.replace(/[.,]/g,''))||0;
  }
  // Review counts: "1,234", "2.345", "1.2K", "1,2 mil", "3M" -> number
  function parseCount(v){
    var m=String(v).trim().toLowerCase().match(/^([\d.,]+)\s*(k|m|mil)?$/);
    if(!m) return 0;
    if(m[2]) return Math.round(parseFloat(m[1].replace(',','.'))*(m[2]==='m'?1e6:1e3))||0;
    return parseInt(m[1].replace(/[.,]/g,''),10)||0;
  }
  function num(v){ return parseFloat(String(v).replace(',','.').replace(/[^0-9.]/g,''))||0; }
  // Delivery text -> { label, date } . Understands EN + ES ("Jul 3", "6 de julio", "6 jul", Tomorrow/mañana)
  var MONTHS={ene:0,jan:0,feb:1,mar:2,abr:3,apr:3,may:4,jun:5,jul:6,ago:7,aug:7,sep:8,oct:9,nov:10,dic:11,dec:11};
  function parseDelivery(text, year){
    var t=(text||'').replace(/\s+/g,' ');
    if(/tomorrow|mañana|manana/i.test(t)) return {label:'Tomorrow', date:'tomorrow'};
    var m=t.match(/(\d{1,2})\s*(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?/i);
    var day, mon;
    if(m){ day=+m[1]; mon=MONTHS[m[2].toLowerCase()]; }
    else{
      m=t.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})/i);
      if(m){ mon=MONTHS[m[1].toLowerCase()]; day=+m[2]; }
    }
    if(m && mon!==undefined) return {label:m[0].trim(), date:new Date(year, mon, day)};
    return {label:'', date:null};
  }
  // Sponsored results (EN/ES markers). Verify on your own page - Amazon changes markup.
  function isSponsored(el){
    return el.classList.contains('AdHolder')
      || !!el.querySelector('.puis-sponsored-label-text, [aria-label*="ponsored" i], [aria-label*="atrocinado" i]');
  }
  function ratingFrom(el){
    var st=el.querySelector('[aria-label*="out of 5"], [aria-label*=" de 5"]');
    if(!st) return {el:null, val:''};
    var m=(st.getAttribute('aria-label')||'').match(/([\d.,]+)\s+(?:out of 5|de 5)/);
    return {el:st, val:m?m[1].replace(',','.'):''};
  }

  var rows=[], seen={}, skippedAds=0;
  document.querySelectorAll('div[data-asin][data-component-type="s-search-result"]').forEach(function(x){
    var id=x.getAttribute('data-asin');
    if(!id||id.length!==10||seen[id]) return;
    if(SKIP_SPONSORED && isSponsored(x)){ skippedAds++; return; }

    // title - required
    var titleEl=x.querySelector('h2 span') || x.querySelector('h2 a span');
    if(!titleEl) return;
    var title=titleEl.innerText.trim();
    if(!title || title.length<5) return;

    // price - required (any currency)
    var priceOff=x.querySelector('.a-price .a-offscreen');
    var price=priceOff ? priceOff.innerText.trim() : '';
    if(!price || parseMoney(price)<=0) return;
    seen[id]=true;

    // rating - only from the star label ("4.5 out of 5" / "4,5 de 5")
    var rating=ratingFrom(x).val;

    // reviews - strict, never negative
    var reviews='';
    var allStars=x.querySelectorAll('[aria-label*="out of 5"]');
    for(var s=0;s<allStars.length && !reviews;s++){
      var m=(allStars[s].getAttribute('aria-label')||'').match(/by\s+([\d,]+)\s+(?:reviews|ratings)/i);
      if(m) reviews=m[1].replace(/,/g,'');
    }
    if(!reviews){
      var revLinks=x.querySelectorAll('a[href*="#customerReviews"], a[aria-label*="ratings"]');
      for(var r=0;r<revLinks.length && !reviews;r++){
        var rlbl=revLinks[r].getAttribute('aria-label')||'';
        var rm=rlbl.match(/([\d,]+)\s+(?:rating|review)/i);
        if(rm) reviews=rm[1].replace(/,/g,'');
        else {
          var txt=(revLinks[r].innerText||'').trim();
          if(/^[\d,]+$/.test(txt)) reviews=txt.replace(/,/g,'');
        }
      }
    }

    // delivery + on-time
    var dEl=x.querySelector('[data-cy="delivery-recipe"], [aria-label*="delivery"]');
    var dv=parseDelivery(dEl?(dEl.innerText||''):'', YEAR);
    var onTime='N/A';
    if(DEADLINE){
      onTime='Verify';
      if(dv.date==='tomorrow') onTime='YES';
      else if(dv.date) onTime = dv.date<=DEADLINE ? 'YES' : 'NO';
    }

    var badge=((x.querySelector('.a-badge-text')||{}).innerText||'').trim();
    rows.push({ASIN:id,Title:title,Price:price,Rating:rating,Reviews:reviews,Delivery:dv.label,OnTime:onTime,Badge:badge,Link:'https://'+site+'/dp/'+id});
  });

  if(!rows.length){ alert('0 products — scroll & retry'); return; }

  // CSV download
  var headers=['ASIN','Title','Price','Rating','Reviews','Delivery','OnTime','Badge','Link'];
  var csv=headers.join(',')+'\n'+rows.map(function(r){
    return headers.map(function(h){return '"'+String(r[h]||'').replace(/"/g,'""')+'"';}).join(',');
  }).join('\n');
  var q=new URLSearchParams(location.search);
  var kw=(q.get('k')||'amz').substring(0,25).replace(/\s/g,'-');
  var pg=q.get('page')||'1';
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download='amz_'+kw+'_p'+pg+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  alert('✅ '+rows.length+' products downloaded'+(skippedAds?' ('+skippedAds+' sponsored skipped)':'')+'\nFile: '+a.download);
})();
