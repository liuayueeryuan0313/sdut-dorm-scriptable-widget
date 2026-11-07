
// 查寝 / 电量 · 中号 4×2 · 固定深色 · 专用只读接口
const KEY='dorm.widget.api.v1',TITLE='查寝 / 电量',PATH='/api/widget/v1/dorm';
const TOKEN_RE=/^dw_[A-Za-z0-9_-]{43}$/,DEFAULT_ORIGIN='',IS_DORM=true;
const HELP='填写部署后手机可访问的 HTTP 或 HTTPS 站点地址，可带端口。在管理网页「连接与计划 → 小组件接口」生成专用 Token。无需管理密码或学校密码。';
const MENU_HELP='中号 4×2 · 最近查寝成绩 / 剩余电量 · 电量增加时自动更新总量';

function validateData(d){return d?.schemaVersion===1&&d.timezone==='Asia/Shanghai'&&(d.inspection===null||(d.inspection&&typeof d.inspection==='object'&&(d.inspection.score===null||validNumber(d.inspection.score))))&&d.electricity&&(d.electricity.remainingKwh===null||validNumber(d.electricity.remainingKwh)&&d.electricity.remainingKwh>=0)&&['ok','error','unavailable'].includes(d.electricity.state)&&typeof d.electricity.stale==='boolean';}
const D={text:'#F8FAFC',muted:'#94A3B8',sub:'#64748B',cyan:'#38BDF8',green:'#34D399',warn:'#FBBF24'};
function txt(stack,value,size,color=D.text,bold=false){const t=stack.addText(String(value));t.font=bold?Font.semiboldSystemFont(size):Font.systemFont(size);t.textColor=new Color(color);t.lineLimit=1;t.minimumScaleFactor=.8;return t;}
function ringImage(ratio,low=false){
  const ctx=new DrawContext();ctx.size=new Size(96,96);ctx.opaque=false;ctx.respectScreenScale=true;
  ctx.setStrokeColor(new Color(low?'#7F303A':'#263449'));ctx.setLineWidth(5);ctx.strokeEllipse(new Rect(6,6,84,84));
  if(ratio!==null&&ratio>0){
    const p=new Path(),steps=Math.max(1,Math.ceil(ratio*160));
    for(let i=0;i<=steps;i++){const a=-Math.PI/2+2*Math.PI*ratio*i/steps,point=new Point(48+42*Math.cos(a),48+42*Math.sin(a));if(i===0)p.move(point);else p.addLine(point);}
    ctx.addPath(p);ctx.setStrokeColor(new Color(low?'#F87171':D.cyan));ctx.setLineWidth(5);ctx.strokePath();
  }
  return ctx.getImage();
}
function render(settings,p){
  const w=new ListWidget(),g=new LinearGradient();g.colors=[new Color('#101A2C'),new Color('#0D1321'),new Color('#080D17')];g.locations=[0,.55,1];g.startPoint=new Point(0,0);g.endPoint=new Point(1,1);w.backgroundGradient=g;w.setPadding(16,18,16,18);
  if(config.widgetFamily&&config.widgetFamily!=='medium'&&config.runsInWidget){txt(w,'请选择中号（4×2）组件',15,D.cyan,true);return w;}
  if(!p.data){txt(w,TITLE,17,D.cyan,true);w.addSpacer(12);const t=txt(w,p.error||'请先配置连接',13,D.muted);t.lineLimit=3;w.addSpacer();return w;}
  const d=p.data,i=d.inspection,e=d.electricity,max=p.demo?100:settings.electricityCycle?.totalKwh;
  const hasTotal=validNumber(max)&&max>=0,hasMax=hasTotal&&max>0,hasKwh=validNumber(e.remainingKwh);
  const low=hasKwh&&e.remainingKwh<20;
  const ratio=hasMax&&hasKwh?Math.max(0,Math.min(1,e.remainingKwh/max)):null;
  const dims=widgetMetrics(),side=(dims.width-36-16.5)/2;
  const ringSize=dims.mediumHeight>=155?96:Math.max(76,dims.mediumHeight-59);
  const row=w.addStack();row.layoutHorizontally();
  const left=row.addStack();left.layoutVertically();left.size=new Size(side,0);
  txt(left,'▤  最近查寝',12,D.text,true);left.addSpacer(6);
  if(!i){txt(left,'—',44);txt(left,'暂无查寝记录',11,D.muted);}
  else{
    const score=left.addStack();score.bottomAlignContent();
    const scoreSize=dims.mediumHeight<155?38:44;
    const n=txt(score,validNumber(i.score)?String(i.score):'—',scoreSize);n.font=Font.mediumRoundedSystemFont(scoreSize);
    score.addSpacer(3);txt(score,'分',10,D.muted);score.addSpacer();
    const badge=score.addStack();badge.setPadding(3,5,3,5);badge.cornerRadius=4;badge.backgroundColor=new Color('#10B981',.13);txt(badge,i.level||'—',9,D.green,true);
    left.addSpacer(5);txt(left,[i.building,i.room].filter(Boolean).join(' · ')||'—',10,D.muted);
    left.addSpacer(3);txt(left,[String(i.date||'—').slice(5).replace('-','/'),i.checkType].filter(Boolean).join(' · '),9,D.sub);
  }
  left.addSpacer();
  row.addSpacer(8);const divider=row.addStack();divider.size=new Size(.5,98);divider.backgroundColor=new Color('#FFFFFF',.075);divider.addSpacer();row.addSpacer(8);
  const right=row.addStack();right.layoutVertically();right.size=new Size(side,ringSize+15);
  const title=right.addStack();title.size=new Size(side,14);title.addSpacer();txt(title,'ϟ  剩余电量',12,D.text,true);title.addSpacer();right.addSpacer(1);
  const ringRow=right.addStack();ringRow.addSpacer();const circle=ringRow.addStack();circle.size=new Size(ringSize,ringSize);circle.backgroundImage=ringImage(ratio,low);circle.layoutVertically();circle.addSpacer();
  const value=circle.addStack();value.addSpacer();const n=txt(value,hasKwh?String(Math.round(e.remainingKwh*10)/10):'—',26,low?'#F87171':D.text);n.font=Font.mediumRoundedSystemFont(26);value.addSpacer();
  const unit=circle.addStack();unit.addSpacer();txt(unit,'度',10,D.muted);unit.addSpacer();circle.addSpacer();ringRow.addSpacer();
  w.addSpacer();
  let note=p.demo?'示例数据 · 总量仅供预览':'电量 '+displayTime(e.checkedAt);
  if(!p.demo){if(p.offline)note+=' · 离线缓存';else if(e.stale||e.state==='error')note+=' · 历史值';if(d.monitor?.hasError)note+=' · 查寝采集异常';}
  const footer=w.addStack();footer.layoutHorizontally();footer.centerAlignContent();
  const status=footer.addStack();status.size=new Size(side,11);txt(status,note,8,p.offline||e.stale||e.state==='error'?D.warn:D.sub);
  footer.addSpacer(16.5);const caption=footer.addStack();caption.size=new Size(side,11);caption.addSpacer();txt(caption,hasTotal?'共 '+max+' 度':'等待有效电量',9,hasTotal?D.sub:D.warn);caption.addSpacer();
  return w;
}
function demoData(){return {schemaVersion:1,timezone:'Asia/Shanghai',inspection:{date:localDay(),score:95,level:'优秀',building:'示例公寓',room:'814',checkType:'宿舍卫生'},electricity:{remainingKwh:58.6,checkedAt:new Date().toISOString(),stale:false,state:'ok'},monitor:{hasError:false}};}

function readSettings(){try{return JSON.parse(Keychain.get(KEY));}catch(_){return {};}}
function endpoint(origin){return origin+PATH;}
function originValue(value){
  const m=String(value||'').trim().match(/^(https?):\/\/([^\s/?#@]+)(?:\/api\/widget\/v1\/dorm)?\/?$/i);
  if(!m)throw Error('地址格式不正确：请输入 http://服务器IP:端口，或完整查寝接口地址；不要带问号参数。');
  return m[1].toLowerCase()+'://'+m[2].toLowerCase();
}
function files(){const fm=FileManager.local(),dir=fm.joinPath(fm.libraryDirectory(),KEY);if(!fm.fileExists(dir))fm.createDirectory(dir,true);return {fm,dir,path:fm.joinPath(dir,'snapshot.json')};}
function clearCache(){const {fm,path}=files();if(fm.fileExists(path))fm.remove(path);}
async function configure(settings){
  const a=new Alert();a.title=TITLE+' · 连接';a.message=HELP;
  a.addTextField('HTTP/HTTPS 站点地址',settings.origin||DEFAULT_ORIGIN);a.addSecureTextField('专用 Token（留空保留原值）','');a.addAction('保存');a.addCancelAction('取消');
  if(await a.presentAlert()<0)return null;
  const origin=originValue(a.textFieldValue(0)),typed=a.textFieldValue(1).trim();
  const token=typed||(origin===settings.origin?settings.token:'');
  if(!TOKEN_RE.test(token||''))throw Error('Token 格式不正确：请填写查寝项目生成的完整 dw_ 开头专用 Token。');
  const changed=origin!==settings.origin||token!==settings.token;
  if(changed||settings.blocked)clearCache();
  const next={...settings,origin,token,blocked:false};
  if(changed)delete next.electricityCycle;
  Keychain.set(KEY,JSON.stringify(next));return next;
}
async function select(){
  let settings=readSettings();if(config.runsInWidget)return {settings};
  const a=new Alert();a.title=TITLE;a.message=MENU_HELP;
  a.addAction('刷新并预览');a.addAction('配置接口与 Token');
  a.addAction('示例预览');a.addCancelAction('取消');
  const c=await a.presentAlert();if(c<0)return null;
  if(c===1){settings=await configure(settings);if(!settings)return null;}
  return {settings,demo:c===2};
}
function validNumber(n){return typeof n==='number'&&Number.isFinite(n);}
function localDay(d=new Date()){return new Date(d.getTime()+28800000).toISOString().slice(0,10);}
function widgetMetrics(){
  const s=Device.screenSize(),width=Math.min(s.width,s.height),height=Math.max(s.width,s.height);
  // iPhone widget bounds in points; preview and desktop share these dimensions.
  const sizes={568:[292,141,311],667:[321,148,324],736:[348,157,357],812:[329,155,345],844:[338,158,354],852:[338,158,354],874:[342,162,362],896:[360,169,379],926:[364,170,382],932:[364,170,382],956:[364,170,382]};
  const v=sizes[Math.round(height)];
  if(v&&width<500)return {width:v[0],mediumHeight:v[1],height:v[2]};
  const w=Math.max(280,Math.min(380,width-64));return {width:w,mediumHeight:Math.floor((w-22)/2),height:Math.floor(w*1.047)};
}
function dayShift(s,n){return localDay(new Date(Date.parse(s+'T00:00:00+08:00')+n*86400000));}
function readingTime(value){
  if(!value)return NaN;
  const raw=String(value),fixed=/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(?::\d\d)?$/.test(raw)?raw.replace(' ','T')+'+08:00':raw;
  return Date.parse(fixed);
}
function displayTime(value){
  const ms=readingTime(value);if(!Number.isFinite(ms))return '—';
  const s=new Date(ms+28800000).toISOString();return s.slice(5,10).replace('-','/')+' '+s.slice(11,16);
}
function updateElectricityCycle(settings,packet){
  const e=packet.data?.electricity;
  if(packet.demo||packet.offline||!e||e.state!=='ok'||e.stale||!validNumber(e.remainingKwh)||e.remainingKwh<0)return;
  const checkedAt=readingTime(e.checkedAt);
  if(!Number.isFinite(checkedAt))return;
  const previous=settings.electricityCycle;
  const hasPrevious=previous&&validNumber(previous.totalKwh)&&previous.totalKwh>=0&&validNumber(previous.remainingKwh)&&previous.remainingKwh>=0&&validNumber(previous.checkedAt);
  // Compare only newer successful samples; old readings must not simulate a recharge.
  if(hasPrevious&&checkedAt<=previous.checkedAt)return;
  const totalKwh=!hasPrevious||e.remainingKwh>previous.remainingKwh?e.remainingKwh:previous.totalKwh;
  const electricityCycle={totalKwh,remainingKwh:e.remainingKwh,checkedAt};
  Keychain.set(KEY,JSON.stringify({...settings,electricityCycle}));
  settings.electricityCycle=electricityCycle;
}
async function fetchPacket(settings){
  if(!settings.origin||!settings.token)return {error:'请先配置接口与 Token'};
  if(settings.blocked)return {error:'凭证失效，请重新配置 Token'};
  const {fm,path}=files();let cached;
  try{cached=JSON.parse(fm.readString(path));}catch(_){}
  try{
    const req=new Request(endpoint(settings.origin));req.timeoutInterval=15;
    req.headers={'Authorization':'Bearer '+settings.token,'Accept':'application/json'};
    req.onRedirect=next=>String(next.url||'').startsWith(settings.origin+'/')?next:null;
    const body=await req.loadString(),status=req.response?.statusCode;
    if(status===401){clearCache();Keychain.set(KEY,JSON.stringify({...settings,blocked:true}));return {error:'凭证失效，请重新配置 Token'};}
    if(status!==200){const messages={400:'接口参数或账户配置有误',404:'接口不存在，请更新服务端',421:'域名未获允许，请配置服务端'};throw Error(messages[status]||'服务暂不可用');}
    let data;try{data=JSON.parse(body);}catch(_){throw Error('接口返回格式有误');}
    if(!validateData(data))throw Error('接口版本或数据格式不兼容');
    const packet={data,savedAt:Date.now()};try{fm.writeString(path,JSON.stringify(packet));}catch(_){}
    return packet;
  }catch(e){
    // Never expose request URLs, credentials, or underlying network errors.
    const safe=['接口参数或账户配置有误','接口不存在，请更新服务端','域名未获允许，请配置服务端','接口返回格式有误','接口版本或数据格式不兼容'];
    const error=safe.includes(e.message)?e.message:'网络或服务暂不可用';
    if(cached&&validateData(cached.data))return {...cached,offline:true,error};
    return {error};
  }
}
function openSettings(){return 'scriptable:///run?scriptName='+encodeURIComponent(Script.name());}
async function main(){
  try{
    const selected=await select();if(!selected){Script.complete();return;}
    const packet=selected.demo?{data:demoData(),demo:true,savedAt:Date.now()}:await fetchPacket(selected.settings);
    updateElectricityCycle(selected.settings,packet);
    const widget=render(selected.settings,packet);widget.url=openSettings();widget.refreshAfterDate=new Date(Date.now()+30*60000);
    if(config.runsInWidget)Script.setWidget(widget);else if(IS_DORM)await widget.presentMedium();else await widget.presentLarge();
  }catch(e){
    const allowed=['地址格式不正确：请输入 http://服务器IP:端口，或完整查寝接口地址；不要带问号参数。','Token 格式不正确：请填写查寝项目生成的完整 dw_ 开头专用 Token。'];
    const detail=allowed.includes(e.message)?e.message:'发生未识别的配置或显示错误；请检查地址、Token 和 Scriptable 权限。';
    const widget=new ListWidget();widget.backgroundColor=new Color(IS_DORM?'#0D1321':'#191E1B');widget.setPadding(18,18,18,18);
    const text=widget.addText(detail);text.textColor=new Color('#CBD5E1');text.font=Font.systemFont(14);widget.url=openSettings();
    if(config.runsInWidget)Script.setWidget(widget);else{const a=new Alert();a.title='配置未完成';a.message=detail;a.addAction('好');await a.presentAlert();}
  }
  Script.complete();
}

await main();
