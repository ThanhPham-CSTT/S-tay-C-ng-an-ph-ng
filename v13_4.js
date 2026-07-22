(function(){
  'use strict';
  var RELEASE='V13.4.1';
  var DATA_LOCK='21/07/2026';
  var selectedRow=null;
  var inactivityTimer=null;

  function h(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function value(r,k){return r&&r[k]?String(r[k]):'';}
  function ymdNow(){var d=new Date(),m=d.getMonth()+1,day=d.getDate();return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(day<10?'0':'')+day;}
  function effectiveState(r,atDate){
    var now=atDate||ymdNow(),from=value(r,'Hiệu lực từ'),to=value(r,'Hiệu lực đến');
    if(from&&now<from)return{code:'future',label:'Chưa có hiệu lực',detail:'Có hiệu lực từ '+from.split('-').reverse().join('/')};
    if(to&&now>to)return{code:'expired',label:'Hết hiệu lực cho hành vi mới',detail:'Áp dụng đến hết '+to.split('-').reverse().join('/')};
    return{code:'current',label:'Đang áp dụng',detail:'Theo mốc hiệu lực lưu trong dữ liệu'};
  }
  function isEffectiveNow(r){return effectiveState(r).code==='current';}
  function authorityLabel(r){
    var code=value(r,'Mã trạng thái thẩm quyền V13.1');
    if(code==='PHUONG_CO_THE_QD_CO_DIEU_KIEN')return{cls:'authority-ok',text:'Có thể QĐ có điều kiện'};
    if(code==='LAP_BB_CHUYEN_CAP')return{cls:'authority-transfer',text:'Lập BB/chuyển cấp'};
    if(code==='THAM_KHAO')return{cls:'authority-reference',text:'Căn cứ tham khảo'};
    return{cls:'authority-review',text:'Phải đối chiếu thẩm quyền'};
  }
  window.V134_EFFECTIVE_STATE=effectiveState;

  function installReleaseBar(){
    if(document.getElementById('v134StatusBar'))return;
    var bar=document.createElement('div');bar.id='v134StatusBar';bar.className='v134-status-bar';
    bar.innerHTML='<b>'+RELEASE+'</b><span id="onlineState">Đang kiểm tra kết nối…</span><span>Dữ liệu khóa '+DATA_LOCK+'</span><span id="updateState">Bản cài hiện tại</span>';
    var header=document.querySelector('.appbar');if(header&&header.parentNode)header.parentNode.insertBefore(bar,header.nextSibling);
    function online(){var el=document.getElementById('onlineState');if(el){el.textContent=navigator.onLine?'● Trực tuyến':'● Offline';el.className=navigator.onLine?'online':'offline';}}
    window.addEventListener('online',online);window.addEventListener('offline',online);online();
  }

  function installSearchEnhancements(){
    if(typeof DATA==='undefined'||typeof card!=='function'||typeof match!=='function'||typeof render!=='function')return;
    var originalCard=card,originalMatch=match,originalScore=typeof score==='function'?score:null,originalLayer=typeof layerRank==='function'?layerRank:null;
    card=function(r){
      var html=originalCard(r),state=effectiveState(r),auth=authorityLabel(r),idx=DATA.indexOf(r);
      var strip='<div class="v134-result-strip"><span class="effective-'+state.code+'">'+h(state.label)+'</span><span class="'+auth.cls+'">'+h(auth.text)+'</span></div>';
      var matrix='<div class="fieldbox v134-authority-box"><div class="label">Ma trận thẩm quyền V13.1</div><div><b>'+h(auth.text)+'</b><br>'+h(value(r,'Lý do thẩm quyền V13.1')||'Chưa có kết luận ma trận cho mô-đun này.')+'<br><span class="small">'+h(value(r,'Căn cứ thẩm quyền V13.1'))+'</span></div></div>';
      var validity='<div class="fieldbox v134-effective-box"><div class="label">Hiệu lực theo ngày</div><div><b>'+h(state.label)+'</b> — '+h(state.detail)+'</div></div>';
      var disabled=state.code==='future'?' disabled aria-disabled="true" title="Quy định chưa có hiệu lực tại ngày mở ứng dụng"':'';
      var add='<button class="case-add" type="button" data-addcase="'+idx+'"'+disabled+'>➕ Thêm vào hồ sơ vụ việc</button>';
      html=html.replace(/(<article[^>]*>)/,function(_,start){return start+strip;});
      html=html.replace('</article>',validity+matrix+add+'</article>');
      return html;
    };
    match=function(r){
      var mode=currentMode,ok;
      if(mode==='current'){currentMode='all';ok=originalMatch(r);currentMode=mode;return ok&&isEffectiveNow(r);}
      return originalMatch(r);
    };
    if(originalScore)score=function(r){var s=originalScore(r),st=effectiveState(r);if(st.code==='current')s+=90;else if(st.code==='future')s-=600;else s-=800;return s;};
    if(originalLayer)layerRank=function(r){var t=(value(r,'Loại dữ liệu')+' '+value(r,'Trạng thái khóa dữ liệu')).toLowerCase();if(t.indexOf('tóm tắt')>=0||t.indexOf('tóm tắt bị chặn')>=0)return 5;return originalLayer(r);};
    render=function(){
      var list=DATA.filter(match);if(currentQuery)list=list.sort(function(a,b){return (layerRank(a)-layerRank(b))||(score(b)-score(a));});
      var current=list.filter(isEffectiveNow).length,future=list.filter(function(r){return effectiveState(r).code==='future';}).length;
      var stats=document.getElementById('stats'),results=document.getElementById('results');
      if(stats)stats.innerHTML='Hiển thị <b>'+list.length+'</b>/<b>'+DATA.length+'</b> dòng — <b>'+current+'</b> đang áp dụng'+(future?' — <b>'+future+'</b> chờ hiệu lực':'');
      if(results)results.innerHTML=list.length?list.slice(0,40).map(card).join(''):'<div class="empty">Không có kết quả phù hợp.</div>';
    };
    dash=function(){
      var n168=DATA.filter(is168).length,n336=DATA.filter(is336).length,pccc=DATA.filter(isPCCC).length,current=DATA.filter(isEffectiveNow).length,future=DATA.filter(function(r){return effectiveState(r).code==='future';}).length;
      var el=document.getElementById('dashboard');if(el)el.innerHTML='<div class="tile"><b>'+DATA.length+'</b><span>Tổng dòng</span></div><div class="tile"><b>'+n168+'</b><span>NĐ168/NĐ238</span></div><div class="tile"><b>'+n336+'</b><span>NĐ336</span></div><div class="tile"><b>'+pccc+'</b><span>PCCC</span></div><div class="tile"><b>'+current+'</b><span>Đang áp dụng</span></div><div class="tile"><b>'+future+'</b><span>Chờ hiệu lực</span></div>';
    };
    var q=document.getElementById('q'),sb=document.getElementById('searchBtn'),cl=document.getElementById('clear');
    if(q){q.oninput=null;q.onkeydown=function(e){if((e.key||'')==='Enter'||e.keyCode===13){currentQuery=q.value;render();return false;}};}
    if(sb)sb.onclick=function(){currentQuery=q?q.value:'';render();var p=document.getElementById('resultsPanel');if(p)p.scrollIntoView({behavior:'smooth'});};
    if(cl)cl.onclick=function(){if(q)q.value='';currentQuery='';render();};
    dash();render();
  }

  function openCase(){var p=document.getElementById('fieldCasePanel');if(p){p.hidden=false;p.scrollIntoView({behavior:'smooth',block:'start'});}touchCase();}
  function closeCase(){var p=document.getElementById('fieldCasePanel');if(p)p.hidden=true;}
  function touchCase(){clearTimeout(inactivityTimer);inactivityTimer=setTimeout(function(){clearCase(true);},30*60*1000);}
  function setSelected(r){selectedRow=r;var el=document.getElementById('caseSelectedLaw'),count=document.getElementById('caseCount');if(count)count.textContent=r?'1':'0';if(!el)return;
    if(!r){el.textContent='Chưa chọn dòng pháp lý. Hãy tra cứu và bấm “Thêm vào hồ sơ”.';return;}
    var st=effectiveState(r),auth=authorityLabel(r);el.innerHTML='<b>Đã chọn:</b> Điều '+h(value(r,'Điều'))+(value(r,'Khoản')?', khoản '+h(value(r,'Khoản')):'')+(value(r,'Điểm')?', điểm '+h(value(r,'Điểm')):'')+' — '+h(value(r,'Nghị định'))+'<br>'+h(value(r,'Hành vi / nội dung'))+'<br><span class="'+auth.cls+'">'+h(auth.text)+'</span> <span class="effective-'+st.code+'">'+h(st.label)+'</span>';openCase();}
  function formValue(id){var el=document.getElementById(id);return el?String(el.value||'').trim():'';}
  function checkedEvidence(){return Array.prototype.slice.call(document.querySelectorAll('[data-evidence]:checked')).map(function(el){return el.getAttribute('data-evidence');});}
  function caseSummary(){
    var lines=['PHIẾU TÓM TẮT VỤ VIỆC — '+RELEASE,'Tạo lúc: '+new Date().toLocaleString('vi-VN'),'Dữ liệu pháp lý khóa: '+DATA_LOCK,''];
    lines.push('Mã nội bộ: '+(formValue('caseRef')||'Chưa ghi'));
    lines.push('Nhóm nghiệp vụ: '+formValue('caseModule'));lines.push('Chủ thể: '+formValue('caseSubject'));lines.push('Loại địa điểm: '+formValue('casePlace'));lines.push('Thời điểm hành vi: '+(formValue('caseTime')||'Chưa ghi'));lines.push('Mức độ xác minh: '+formValue('caseVerify'));
    lines.push('Mô tả đã ẩn danh: '+(formValue('caseDescription')||'Chưa ghi'));lines.push('');
    if(selectedRow){var r=selectedRow,incidentDate=formValue('caseTime').slice(0,10),st=effectiveState(r,incidentDate||undefined),auth=authorityLabel(r);lines.push('CĂN CỨ ĐỀ XUẤT');lines.push('- Điều '+value(r,'Điều')+(value(r,'Khoản')?', khoản '+value(r,'Khoản'):'')+(value(r,'Điểm')?', điểm '+value(r,'Điểm'):'')+' — '+value(r,'Nghị định'));lines.push('- Hành vi: '+value(r,'Hành vi / nội dung'));lines.push('- Mức phạt/hình thức: '+value(r,'Mức phạt / hình thức theo khoản'));lines.push('- Trừ điểm/tước/tịch thu: '+([value(r,'Trừ điểm GPLX'),value(r,'Tước GPLX/giấy phép'),value(r,'Tịch thu phương tiện/tang vật')].filter(Boolean).join(' | ')||'Không thể hiện trong dòng'));lines.push('- Khắc phục: '+(value(r,'Biện pháp khắc phục hậu quả hiển thị')||value(r,'Biện pháp khắc phục hậu quả')||'Không thể hiện trong dòng'));lines.push('- Hiệu lực tại ngày hành vi'+(incidentDate?' '+incidentDate.split('-').reverse().join('/'):' (chưa nhập, tạm dùng ngày hiện tại)')+': '+st.label+' — '+st.detail);lines.push('');lines.push('THẨM QUYỀN');lines.push('- Kết luận ma trận: '+auth.text);lines.push('- Lý do: '+value(r,'Lý do thẩm quyền V13.1'));lines.push('- Căn cứ: '+value(r,'Căn cứ thẩm quyền V13.1'));if(value(r,'Mã trạng thái thẩm quyền V13.1')==='LAP_BB_CHUYEN_CAP'){lines.push('- Hướng bắt buộc: hoàn thiện tài liệu trong phạm vi nhiệm vụ và chuyển người/đơn vị có thẩm quyền; không ra quyết định tại phường.');}}
    else lines.push('CĂN CỨ ĐỀ XUẤT: Chưa chọn dòng pháp lý.');
    lines.push('');lines.push('CHỨNG CỨ/TÀI LIỆU ĐÃ ĐÁNH DẤU');var ev=checkedEvidence();lines.push(ev.length?ev.map(function(x){return '□ '+x;}).join('\n'):'Chưa đánh dấu.');
    lines.push('');lines.push('ĐÁNH GIÁ CA THÍ ĐIỂM');lines.push('- Tìm kiếm: '+formValue('pilotSearchOutcome'));lines.push('- Thẩm quyền: '+formValue('pilotAuthorityOutcome'));lines.push('- Thời gian hoàn thành: '+(formValue('pilotMinutes')||'Chưa ghi')+' phút');lines.push('');lines.push('KIỂM TRA TRƯỚC KHI TRÌNH');lines.push('□ Đã đối chiếu nguyên văn và thời điểm hiệu lực');lines.push('□ Đã xác định đúng chủ thể và đủ dấu hiệu hành vi');lines.push('□ Đã kiểm tra tình tiết tăng nặng/giảm nhẹ');lines.push('□ Đã kiểm tra thẩm quyền người lập biên bản và người ra quyết định');lines.push('□ Đã loại bỏ dữ liệu cá nhân khỏi bản tóm tắt thử nghiệm');lines.push('');lines.push('CẢNH BÁO: Phiếu này chỉ hỗ trợ chuẩn bị hồ sơ, không phải quyết định xử phạt và không thay thế văn bản gốc.');return lines.join('\n');
  }
  function buildCase(){var out=document.getElementById('caseOutput');if(out)out.textContent=caseSummary();touchCase();}
  function clearCase(timeout){selectedRow=null;['caseRef','caseTime','caseDescription','pilotMinutes'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});['pilotSearchOutcome','pilotAuthorityOutcome'].forEach(function(id){var el=document.getElementById(id);if(el)el.selectedIndex=0;});Array.prototype.forEach.call(document.querySelectorAll('[data-evidence]'),function(el){el.checked=false;});setSelected(null);var out=document.getElementById('caseOutput');if(out)out.textContent=timeout?'Phiên đã tự xóa sau 30 phút không thao tác.':'Đã xóa phiên làm việc.';if(timeout)closeCase();touchCase();}
  function copyCase(){buildCase();var txt=document.getElementById('caseOutput').textContent;if(navigator.clipboard)navigator.clipboard.writeText(txt);}
  function downloadCase(){buildCase();var txt=document.getElementById('caseOutput').textContent,blob=new Blob([txt],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='phieu-tom-tat-vu-viec-'+new Date().toISOString().slice(0,10)+'.txt';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},500);}
  function bindCase(){
    var toggle=document.getElementById('fieldCaseToggle'),close=document.getElementById('fieldCaseClose');if(toggle)toggle.onclick=openCase;if(close)close.onclick=closeCase;
    document.addEventListener('click',function(e){var btn=e.target.closest&&e.target.closest('[data-addcase]');if(!btn||btn.disabled)return;var idx=parseInt(btn.getAttribute('data-addcase'),10);if(typeof DATA!=='undefined'&&DATA[idx])setSelected(DATA[idx]);});
    var map={caseBuild:buildCase,caseCopy:copyCase,caseDownload:downloadCase,casePrint:function(){buildCase();document.body.classList.add('print-case');window.print();setTimeout(function(){document.body.classList.remove('print-case');},500);},caseClear:function(){clearCase(false);}};Object.keys(map).forEach(function(id){var el=document.getElementById(id);if(el)el.onclick=map[id];});
    var panel=document.getElementById('fieldCasePanel');if(panel)panel.addEventListener('input',touchCase);touchCase();
  }

  function installPwa(){
    if(!('serviceWorker' in navigator)||location.protocol==='file:')return;
    navigator.serviceWorker.register('./sw.js').then(function(reg){reg.update();var el=document.getElementById('updateState');if(el)el.textContent='Offline sẵn sàng';}).catch(function(){var el=document.getElementById('updateState');if(el)el.textContent='Offline chưa sẵn sàng';});
    fetch('./version.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(v){var el=document.getElementById('updateState');if(el)el.textContent=v.release===RELEASE?'Bản mới nhất trong gói':'Có khác biệt phiên bản';}).catch(function(){});
  }

  function boot(){installReleaseBar();installSearchEnhancements();bindCase();installPwa();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
}());
