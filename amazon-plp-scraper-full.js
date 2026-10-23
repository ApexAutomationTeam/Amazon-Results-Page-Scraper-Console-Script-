// =============================================================================
// Amazon search-results (PLP) scraper - FULL: scoring, pros/cons, colour-coded Excel file
// Run on any Amazon search results page. No product-page visits needed.
// F12 -> Console -> type "allow pasting" + Enter -> paste this script -> Enter
// =============================================================================
(function(){
  // ============== SETTINGS ==============
  var MIN_PRICE      = 5;     // skip listings cheaper than this (scam / accessory filter)
  var DEADLINE       = null;  // e.g. new Date(2026,6,14) for "must arrive by 14 Jul 2026"; null = skip delivery check
  var SKIP_SPONSORED = true;  // ignore ads inside the results list
  // ======================================
  var site = location.hostname;
  var YEAR = DEADLINE ? DEADLINE.getFullYear() : new Date().getFullYear();
  var DEADLINE_TXT = DEADLINE ? DEADLINE.toISOString().split('T')[0] : '';

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

  // ---------- PROS / CONS / RED FLAGS / RECOMMENDATION ----------
  function analyze(r){
    var pros=[], cons=[], flags=[];
    var tl=r.Title.toLowerCase();
    var rat=num(r.Rating), rev=parseCount(r.Reviews), price=parseMoney(r.Price);

    // rating
    if(rat>=4.8) pros.push('Exceptional '+r.Rating+'★ — among the best-rated in this search');
    else if(rat>=4.6) pros.push('Excellent '+r.Rating+'★ rating from real buyers');
    else if(rat>=4.4) pros.push('Strong '+r.Rating+'★ — consistently positive feedback');
    else if(rat>=4.0) pros.push('Solid '+r.Rating+'★ overall satisfaction');
    else if(rat>=3.5){ cons.push('Mixed reviews at '+r.Rating+'★ — read recent ones before buying'); }
    else if(rat>0){ cons.push('Weak '+r.Rating+'★ rating'); flags.push('⚠️ Rating below 3.5★ — quality concerns reported'); }
    else { flags.push('⚠️ No rating yet — unproven listing'); }

    // review volume
    if(rev>=10000) pros.push('Massive review base ('+r.Reviews+') — long-established product');
    else if(rev>=1000) pros.push(r.Reviews+' reviews — well-proven in the market');
    else if(rev>=200) pros.push('Healthy '+r.Reviews+' review count');
    else if(rev>=50) cons.push('Modest review count ('+r.Reviews+') — newer listing');
    else if(rev>0){ cons.push('Only '+r.Reviews+' reviews so far'); flags.push('⚠️ Under 50 reviews — limited track record'); }
    else flags.push('⚠️ Zero reviews — cannot verify buyer experience');

    // price (thresholds are in the listing currency - adjust for your category)
    if(price>=200) cons.push('Premium price point ('+r.Price+') — compare before committing');
    else if(price>=80) pros.push('Mid-range price ('+r.Price+') for the category');
    else if(price>=20) pros.push('Accessible price ('+r.Price+')');
    else if(price>=MIN_PRICE){ cons.push('Very low price ('+r.Price+')'); flags.push('⚠️ Unusually cheap — verify seller & authenticity'); }

    // delivery
    if(DEADLINE){
      if(r.OnTime==='YES') pros.push('Arrives by deadline ('+r.Delivery+')');
      else if(r.OnTime==='NO'){ cons.push('Delivery after deadline: '+r.Delivery); flags.push('🚩 MISSES deadline '+DEADLINE_TXT); }
      else cons.push('Delivery date unclear — confirm at checkout');
    }
    if(/grat|free/i.test(r.DeliveryCost)) pros.push('Free delivery included');

    // badges
    if(/best seller|más vendido/i.test(r.Badge)) pros.push('Amazon Best Seller badge — top sales in category');
    if(/overall pick|elección/i.test(r.Badge)) pros.push("Amazon's Overall Pick — algorithm-recommended");
    if(/limited time|oferta/i.test(r.Badge)) pros.push('Active discount running — price may rise later');

    // title keywords (games / electronics oriented - extend for your niche)
    if(/deluxe|premium|collector/i.test(tl)) pros.push('Deluxe/collector edition — extra content included');
    if(/day one|launch/i.test(tl)) pros.push('Day-One edition with launch bonuses');
    if(/renewed|refurb|reacondicionado/i.test(tl)){ cons.push('Renewed/refurbished unit, not new'); flags.push('⚠️ Refurbished — check warranty terms'); }
    if(/import|importación|japan|jp\b/i.test(tl)) cons.push('Import version — check language/region lock');
    if(/download code|código de descarga|digital/i.test(tl)){ cons.push('Digital code, not physical disc'); flags.push('⚠️ Code-in-box — no resale value, no returns once opened'); }
    if(/usk/i.test(tl)) pros.push('USK (DE) regional version');
    if(/pegi/i.test(tl)) pros.push('PEGI-rated European version');
    if(/esrb/i.test(tl)) pros.push('ESRB (US) rated version');

    // final score
    var rec, score=0;
    if(rat>=4.4) score+=3; else if(rat>=4.0) score+=2; else if(rat>=3.5) score+=1;
    if(rev>=1000) score+=3; else if(rev>=200) score+=2; else if(rev>=50) score+=1;
    if(r.OnTime==='YES' || r.OnTime==='N/A') score+=2;
    if(flags.filter(function(f){return f.indexOf('🚩')===0;}).length) score-=3;
    if(price<MIN_PRICE*3 && rev<50) score-=1;
    if(score>=7)      rec='✅ TOP PICK — high rating, proven reviews'+(DEADLINE?', on-time delivery':'')+'. Buy with confidence.';
    else if(score>=5) rec='👍 RECOMMENDED — strong overall; minor caveats noted in cons.';
    else if(score>=3) rec='🤔 ACCEPTABLE — usable option but verify the flagged points first.';
    else              rec='❌ SKIP — too many risk factors (see red flags). Choose an alternative.';

    r.Pros = pros.join(' • ')||'—';
    r.Cons = cons.join(' • ')||'—';
    r.RedFlags = flags.join(' • ')||'None detected';
    r.Recommendation = rec;
    return r;
  }

  // ---------- SCRAPE RESULTS PAGE ----------
  var rows=[], seen={}, skippedAds=0;
  document.querySelectorAll('div[data-asin][data-component-type="s-search-result"]').forEach(function(x){
    var id=x.getAttribute('data-asin');
    if(!id||id.length!==10||seen[id]) return;
    if(SKIP_SPONSORED && isSponsored(x)){ skippedAds++; return; }

    var title=Array.from(x.querySelectorAll('h2 span'))
      .map(function(s){return (s.innerText||'').trim();})
      .filter(function(t){return t.length>1;}).join(' ');
    if(!title||title.length<5) return;

    var pe=x.querySelector('.a-price .a-offscreen');
    var price=pe?pe.innerText.trim():'';
    if(!price||parseMoney(price)<MIN_PRICE) return;   // scam filter
    seen[id]=true;

    // store / vendor from the results card only (brand row, else first word of title)
    var store='';
    var brandEl=x.querySelector('.s-line-clamp-1 span, [data-cy="title-recipe"] .a-size-base-plus, h5 span, .a-row.a-size-base.a-color-secondary span');
    if(brandEl && brandEl.innerText.trim().length>1 && brandEl.innerText.trim().length<40) store=brandEl.innerText.trim();
    if(!store) store=title.split(/[\s,|]/)[0];
    var storeLink='https://'+site+'/s?k='+encodeURIComponent(store);

    // rating
    var rt=ratingFrom(x), st=rt.el, rating=rt.val;

    // reviews (never negative)
    var reviews='';
    var rl=x.querySelector('a[aria-label*="ratings"],a[aria-label*="valoraciones"]');
    if(rl){var m=(rl.getAttribute('aria-label')||'').match(/([\d,.]+)\s+(?:ratings|valoraciones)/i);if(m)reviews=m[1].replace(/,/g,'');}
    if(!reviews){var as=x.querySelectorAll('a');for(var i=0;i<as.length;i++){var t=(as[i].innerText||'').trim();if(/^\([\d.,]+\s?(?:[KkMm]|mil)?\)$/.test(t)){reviews=t.replace(/[()]/g,'');break;}}}
    if(!reviews&&st){var bm=(st.getAttribute('aria-label')||'').match(/by\s+([\d,]+)/i);if(bm)reviews=bm[1].replace(/,/g,'');}

    // delivery date + cost
    var delivCost='Included / see checkout', dt='';
    var dEl=x.querySelector('[data-cy="delivery-recipe"]');
    if(dEl){ dt=dEl.innerText||''; if(/gratis|free/i.test(dt)) delivCost='FREE'; }
    var dv=parseDelivery(dt, YEAR);
    var onTime='Verify';
    if(!DEADLINE) onTime='N/A';
    else if(dv.date==='tomorrow') onTime='YES';
    else if(dv.date) onTime = dv.date<=DEADLINE ? 'YES' : 'NO';

    var badge=((x.querySelector('.a-badge-text')||{}).innerText||'').trim();

    rows.push(analyze({
      Item: title, Store: store, StoreLink: storeLink,
      Link: 'https://'+site+'/dp/'+id, ASIN: id, Title: title,
      Price: price, DeliveryCost: delivCost,
      SetupCost: 'None (self-setup product) — verify at checkout',
      Delivery: dv.label||'Check listing',
      ReturnPolicy: 'Amazon standard return policy (verify on listing)',
      Rating: rating||'N/A', Reviews: reviews||'N/A', Badge: badge, OnTime: onTime
    }));
  });

  if(!rows.length){ alert('0 products — scroll the page and retry'); return; }

  // ---------- EXCEL FILE (HTML table saved as .xls: keeps colours; Excel may show a format warning, click Yes) ----------
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  var H=['#','Item Name','Store/Vendor','Store Link','Product Link','Total Price','Delivery Cost','Setup/Installation Cost','Estimated Delivery','Return Policy','Rating','Reviews','Pros','Cons','Red Flags','Final Recommendation'];
  var html='<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>'
    +'table{border-collapse:collapse;font-family:Arial;font-size:10pt}'
    +'td,th{border:1px solid #bbb;padding:6px;vertical-align:top}'
    +'th{background:#1F4E79;color:#fff;font-weight:bold;text-align:center}'
    +'.t{background:#7D4608;color:#fff;font-size:13pt;font-weight:bold;text-align:center}'
    +'.g{background:#E8F5E9}.y{background:#FFFDE7}.r{background:#FFEBEE}'
    +'.rec{font-weight:bold}.flag{color:#B71C1C}.pros{color:#1B5E20}.cons{color:#7B241C}'
    +'a{color:#1155CC}</style></head><body><table>'
    +'<tr><td class="t" colspan="'+H.length+'">AMAZON PRODUCT RESEARCH — '+esc(site)+' — '+new Date().toISOString().split('T')[0]+'</td></tr>'
    +'<tr>'+H.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr>';
  rows.forEach(function(r,i){
    var cls = r.Recommendation.indexOf('✅')===0?'g' : r.Recommendation.indexOf('❌')===0?'r' : 'y';
    html+='<tr class="'+cls+'">'
      +'<td>'+(i+1)+'</td>'
      +'<td><b>'+esc(r.Item)+'</b></td>'
      +'<td>'+esc(r.Store)+'</td>'
      +'<td><a href="'+esc(r.StoreLink)+'">'+esc(r.StoreLink)+'</a></td>'
      +'<td><a href="'+esc(r.Link)+'">'+esc(r.Link)+'</a></td>'
      +'<td><b>'+esc(r.Price)+'</b></td>'
      +'<td>'+esc(r.DeliveryCost)+'</td>'
      +'<td>'+esc(r.SetupCost)+'</td>'
      +'<td>'+esc(r.Delivery)+(DEADLINE?' ('+esc(r.OnTime)+')':'')+'</td>'
      +'<td>'+esc(r.ReturnPolicy)+'</td>'
      +'<td><b>'+esc(r.Rating)+'★</b></td>'
      +'<td>'+esc(r.Reviews)+'</td>'
      +'<td class="pros">'+esc(r.Pros)+'</td>'
      +'<td class="cons">'+esc(r.Cons)+'</td>'
      +'<td class="flag">'+esc(r.RedFlags)+'</td>'
      +'<td class="rec">'+esc(r.Recommendation)+'</td>'
      +'</tr>';
  });
  html+='</table></body></html>';

  var kw=(new URLSearchParams(location.search).get('k')||'amz').substring(0,25).replace(/\s+/g,'-');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+html],{type:'application/vnd.ms-excel'}));
  a.download='amazon_'+kw+'_'+new Date().toISOString().split('T')[0]+'.xls';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  console.log('✅ '+rows.length+' products saved'+(skippedAds?' ('+skippedAds+' sponsored skipped)':''));
  alert('✅ '+rows.length+' products saved to '+a.download);
})();
