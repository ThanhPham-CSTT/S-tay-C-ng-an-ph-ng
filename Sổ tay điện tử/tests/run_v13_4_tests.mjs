import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'script_1.js'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const appJs=fs.readFileSync(path.join(root,'v13_4.js'),'utf8');
const appCss=fs.readFileSync(path.join(root,'v13_4.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
let passed=0;
function ok(value,message){if(!value)throw new Error(message);passed++;}
function field(r,k){return String(r?.[k]||'');}

ok(data.length===915,'Tổng dòng phải là 915');
const embeddedMatch=html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/);
ok(embeddedMatch,'Không tìm thấy dữ liệu nhúng');
ok(JSON.stringify(JSON.parse(embeddedMatch[1]))===JSON.stringify(data),'Dữ liệu nhúng không khớp script_1.js');

const nd168=data.filter(r=>/168/.test(field(r,'Nghị định')+field(r,'Module chuẩn V3.6')));
ok(nd168.length===455,'Tổng dòng NĐ168/NĐ238 phải là 455');
const direct=nd168.filter(r=>field(r,'Mã trạng thái thẩm quyền V13.1')==='PHUONG_CO_THE_QD_CO_DIEU_KIEN');
const transfer=nd168.filter(r=>field(r,'Mã trạng thái thẩm quyền V13.1')==='LAP_BB_CHUYEN_CAP');
ok(direct.length===98,'Phải có 98 dòng có thể QĐ có điều kiện');
ok(transfer.length===346,'Phải có 346 dòng lập BB/chuyển cấp');
ok(direct.every(r=>/^Có điều kiện/.test(field(r,'Trưởng CA phường ra QĐ'))),'Dòng trực tiếp phải mang nhãn Có điều kiện');
ok(transfer.every(r=>/^Không/.test(field(r,'Trưởng CA phường ra QĐ'))),'Dòng chuyển cấp không được mang nhãn Có');
ok(direct.every(r=>!field(r,'Trừ điểm GPLX')&&!field(r,'Tước GPLX/giấy phép')&&!field(r,'Tịch thu phương tiện/tang vật')),'Không được QĐ trực tiếp khi có trừ điểm/tước/tịch thu');

const futureAdded=data.filter(r=>field(r,'Phiên bản dữ liệu').includes('V13.1 - Legal Integrity'));
ok(futureAdded.length===11,'Phải có 11 dòng sửa đổi NĐ238 mới');
ok(futureAdded.every(r=>field(r,'Hiệu lực từ')==='2026-08-15'),'Tất cả dòng NĐ238 mới phải bắt đầu 15/08/2026');
ok(futureAdded.every(r=>field(r,'Mã trạng thái thẩm quyền V13.1')!=='PHUONG_CO_THE_QD_CO_DIEU_KIEN'),'Không được mở thẩm quyền phường cho dòng NĐ238 mới ngoài Điều 41');
const oldChild=data.find(r=>field(r,'Điều')==='6'&&field(r,'Khoản')==='3'&&field(r,'Điểm')==='m'&&field(r,'Hành vi / nội dung').includes('không sử dụng thiết bị'));
ok(oldChild&&field(oldChild,'Hiệu lực đến')==='2026-08-14','Dòng trẻ em cũ phải hết hiệu lực 14/08/2026');
const newChild=futureAdded.find(r=>field(r,'Điều')==='6'&&field(r,'Khoản')==='1a');
ok(newChild&&field(newChild,'Mức phạt / hình thức theo khoản').includes('cảnh cáo'),'Phải có khoản 1a cảnh cáo từ NĐ238');
const cabin=futureAdded.find(r=>field(r,'Điều')==='20'&&field(r,'Khoản')==='5'&&field(r,'Điểm')==='n');
ok(cabin&&field(cabin,'Hành vi / nội dung').includes('khoang chở khách'),'Thiếu điểm n camera khoang chở khách');
const paidRide=futureAdded.find(r=>field(r,'Điều')==='20'&&field(r,'Khoản')==='8a');
ok(paidRide&&field(paidRide,'Trừ điểm GPLX')==='06 điểm','Khoản 8a phải trừ 06 điểm');

const packagedRootJs=fs.readdirSync(root).filter(name=>name.endsWith('.js')).map(name=>fs.readFileSync(path.join(root,name),'utf8')).join('\n');
ok(!/localStorage|sessionStorage/.test(html+packagedRootJs),'Gói phát hành không được chứa mã lưu trạng thái người dùng vào Web Storage');
ok(appJs.includes('30*60*1000'),'Thiếu cơ chế tự xóa phiên sau 30 phút');
ok(appJs.includes("location.protocol==='file:'"),'Thiếu nhánh an toàn khi mở bằng file cục bộ');
ok(sw.includes("'./index.html'")&&sw.includes("'./v13_4.js'")&&sw.includes("'./v13_4.css'"),'Service worker thiếu tệp lõi');
ok(manifest.start_url==='./index.html'&&manifest.display==='standalone','Manifest PWA không hợp lệ');
ok(/viewport-fit=cover/.test(html)&&/min-height:44px/.test(html),'Thiếu cấu hình vùng an toàn hoặc kích thước chạm tối thiểu cho điện thoại/iPad');
ok(/@media\(min-width:760px\)/.test(appCss),'Thiếu bố cục đáp ứng cho iPad');
for(const icon of manifest.icons){const png=fs.readFileSync(path.join(root,icon.src));const actual=png.readUInt32BE(16)+'x'+png.readUInt32BE(20);ok(actual===icon.sizes,'Kích thước icon khai báo sai: '+icon.src);}
for(const file of ['version.json','v13_4.js','v13_4.css','README_V13_4.txt','PILOT_GUIDE_V13_4.txt','PRIVACY_SECURITY_V13_4.txt','DATA_AUDIT_REPORT_V13_4.json','LEGAL_CHANGELOG_V13_4.json','RELEASE_MANIFEST_V13_4.json'])ok(fs.existsSync(path.join(root,file)),'Thiếu '+file);

// Compile all executable scripts without running browser-dependent code.
new vm.Script(appJs,{filename:'v13_4.js'});passed++;
new vm.Script(sw,{filename:'sw.js'});passed++;
const sandbox={window:{},document:{readyState:'loading',addEventListener(){}},navigator:{},console};sandbox.window=sandbox;
vm.runInNewContext(appJs,sandbox,{filename:'v13_4-effective.js'});
ok(sandbox.V134_EFFECTIVE_STATE(newChild,'2026-07-21').code==='future','NĐ238 phải là tương lai ngày 21/07/2026');
ok(sandbox.V134_EFFECTIVE_STATE(newChild,'2026-08-15').code==='current','NĐ238 phải tự có hiệu lực ngày 15/08/2026');
ok(sandbox.V134_EFFECTIVE_STATE(oldChild,'2026-08-15').code==='expired','Dòng cũ phải hết hiệu lực từ 15/08/2026');
const scripts=[...html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
for(let i=0;i<scripts.length;i++){new vm.Script(scripts[i],{filename:'index-inline-'+i+'.js'});passed++;}

// Execute the exact modern search engine slice against representative field queries.
const start=html.indexOf('function norm(s)');
const end=html.indexOf('function fbox(',start);
ok(start>0&&end>start,'Không tách được lõi tìm kiếm');
const engine=html.slice(start,end);
const queries=[
  ['bán hàng rong','12','2','e'],
  ['xe quá tải 15%','34','2',''],
  ['xe quá tải 30%','34','4','a'],
  ['xe quá tải 55%','34','5','a'],
  ['xe bánh xích không giấy phép','34','3','b'],
  ['xe biển số nước ngoài','37','',''],
  ['tờ khai tạm nhập tái xuất','38','',''],
  ['thẩm quyền Trưởng Công an cấp xã Điều 41','41','',''],
  ['camera khoang chở khách','20','5','n'],
  ['xe không kinh doanh chở người có thu tiền','20','8a','']
];
const run=new Function('DATA','queries',`let currentQuery='',currentModule='all',currentFilter='all',currentMode='all',currentCat='all';${engine}\nreturn queries.map(function(t){currentQuery=t[0];var list=DATA.filter(match).sort(function(a,b){return (layerRank(a)-layerRank(b))||(score(b)-score(a));});var r=list[0];return {q:t[0],expected:t.slice(1),actual:r?[r['Điều'],r['Khoản'],r['Điểm']]:[]};});`);
const results=run(data,queries);
for(const result of results){const [d,k,p]=result.expected;ok(result.actual[0]===d&&(!k||result.actual[1]===k)&&(!p||String(result.actual[2]).normalize('NFD').replace(/[\u0300-\u036f]/g,'')===p),result.q+' trả sai: '+JSON.stringify(result.actual));}

const report={status:'PASS',tested_at:new Date().toISOString(),assertions:passed,rows:data.length,nd168:nd168.length,direct:direct.length,transfer:transfer.length,queries:results};
fs.writeFileSync(path.join(root,'TEST_REPORT_V13_4.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
