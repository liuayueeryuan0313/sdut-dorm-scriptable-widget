'use strict';
// Execute the widget entry point with simulated Scriptable APIs; no real network or credentials.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const check = require('node:test');
const repo = path.resolve(__dirname, '..');
const source = fs.readFileSync(repo + '/DormElectricity.js', 'utf8');
const KEY = 'dorm.widget.api.v1';
const cachePath = '/library/' + KEY + '/snapshot.json';
const good = {
  schemaVersion: 1, timezone: 'Asia/Shanghai',
  inspection: {score: 95, level: '优秀', building: '示例公寓', room: '814', date: '2026-11-07', checkType: '宿舍卫生'},
  electricity: {remainingKwh: 58.6, state: 'ok', stale: false, checkedAt: '2026-11-07T08:00:00Z'},
  monitor: {hasError: false}
};
async function run(options = {}) {
  const texts = [], colors = [], requests = [], alerts = [], paths = [];
  const keys = options.storage?.keys || new Map(), files = options.storage?.files || new Map();
  const menus = [...(options.menus || [options.menu ?? -1])];
  const settings = {origin: 'https://widget.invalid', token: 'dw_' + 'a'.repeat(43), maxKwh: 100, ...options.settings};
  if (!options.noSettings && !keys.has(KEY)) keys.set(KEY, JSON.stringify(settings));
  if (options.cached) files.set(cachePath, JSON.stringify({data: good, savedAt: 1}));
  let widget, complete = 0, preview = 0;
  class Element {
    addText(text) {texts.push(text); return new Element();}
    addStack() {return new Element();}
    addSpacer() {}
    setPadding() {}
    layoutHorizontally() {}
    layoutVertically() {}
    bottomAlignContent() {}
    centerAlignContent() {}
    async presentMedium() {preview++;}
  }
  class Geometry {constructor(...args) {this.args = args;}}
  class Color extends Geometry {constructor(...args) {super(...args); colors.push(args[0]);}}
  class Drawing {
    setStrokeColor() {}
    setLineWidth() {}
    strokeEllipse() {}
    addPath() {}
    strokePath() {}
    getImage() {return {};}
  }
  class Path {
    constructor() {this.points = []; paths.push(this);}
    move(point) {this.points.push(point);}
    addLine(point) {this.points.push(point);}
  }
  class Alert {
    constructor() {this.actions = []; alerts.push(this);}
    addAction(label) {this.actions.push(label);}
    addTextField() {}
    addSecureTextField() {}
    textFieldValue(index) {return options.input?.[index] ?? "";}
    addCancelAction() {}
    async presentAlert() {return menus.shift() ?? -1;}
  }
  class Request {
    constructor(url) {this.url = url; requests.push(this);}
    async loadString() {
      if (options.networkError) throw Error('simulated network error');
      this.response = {statusCode: options.status ?? 200};
      return options.body ?? JSON.stringify(options.data ?? good);
    }
  }
  const context = vm.createContext({
    config: {runsInWidget: !options.app, widgetFamily: options.family || 'medium'},
    Script: {name: () => 'DormElectricity', setWidget: w => {widget = w;}, complete: () => {complete++;}},
    Keychain: {get: k => {if (!keys.has(k)) throw Error('missing'); return keys.get(k);}, set: (k,v) => keys.set(k,v)},
    FileManager: {local: () => ({
      libraryDirectory: () => '/library', joinPath: (a,b) => a + '/' + b,
      fileExists: p => files.has(p), createDirectory: p => files.set(p, ''),
      readString: p => {if (!files.has(p)) throw Error('missing'); return files.get(p);},
      writeString: (p,v) => files.set(p,v), remove: p => files.delete(p)
    })},
    Device: {screenSize: () => ({width: 390, height: 844})},
    ListWidget: Element, LinearGradient: Geometry, Color, Size: Geometry, Rect: Geometry,
    Point: Geometry, Path, DrawContext: Drawing, Alert, Request,
    Font: new Proxy({}, {get: () => size => ({size})})
  });
  await vm.runInContext('(async () => {\n' + source + '\n})()', context, {timeout: 2000});
  assert.equal(complete, 1, 'main must complete exactly once');
  assert.ok(!texts.some(t => t.includes('未识别')), 'unexpected render/configuration failure');
  if (!options.app) {
    assert.ok(widget, 'widget must be installed');
    assert.match(widget.url, /^scriptable:\/\/\/run/);
  }
  return {texts, colors, requests, keys, files, preview, alerts, widget, paths};
}
check('live response renders and caches data with authenticated request', async () => {
    const r = await run();
    assert.ok(r.texts.includes('95') && r.texts.includes('58.6'));
    assert.ok(r.files.has(cachePath));
    assert.equal(r.requests[0].url, 'https://widget.invalid/api/widget/v1/dorm');
    assert.equal(r.requests[0].headers.Authorization, 'Bearer dw_' + 'a'.repeat(43));
    assert.equal(r.requests[0].onRedirect({url: 'https://other.invalid/path'}), null);
    assert.ok(r.requests[0].onRedirect({url: 'https://widget.invalid/path'}));
    assert.ok(r.widget.refreshAfterDate.getTime() > Date.now());
  });
check('low electricity warning', async () => {
    const r = await run({data: {...good, electricity: {...good.electricity, remainingKwh: 12.3}}});
    assert.ok(r.texts.includes('12.3') && r.colors.includes('#F87171'));
  });
check('missing configuration avoids requests', async () => {
    const r = await run({noSettings: true});
    assert.equal(r.requests.length, 0);
    assert.ok(r.texts.includes('请先配置接口与 Token'));
  });
check('network failure renders offline cache', async () => {
    const r = await run({networkError: true, cached: true});
    assert.ok(r.texts.includes('58.6') && r.texts.some(t => t.includes('离线缓存')));
  });
check('401 deletes cache and blocks credentials', async () => {
    const r = await run({status: 401, cached: true});
    assert.equal(r.files.has(cachePath), false);
    assert.equal(JSON.parse(r.keys.get(KEY)).blocked, true);
    assert.ok(r.texts.includes('凭证失效，请重新配置 Token'));
  });
check('blocked credentials avoid requests', async () => {
    const r = await run({settings: {blocked: true}});
    assert.equal(r.requests.length, 0);
    assert.ok(r.texts.includes('凭证失效，请重新配置 Token'));
  });
check('incompatible schema produces meaningful error', async () => {
    const r = await run({data: {...good, schemaVersion: 2}});
    assert.ok(r.texts.includes('接口版本或数据格式不兼容'));
  });
check('malformed JSON produces meaningful error', async () => {
    const r = await run({body: 'invalid json'});
    assert.ok(r.texts.includes('接口返回格式有误'));
  });
check('missing readings render placeholders', async () => {
    const r = await run({data: {...good, inspection: null, electricity: {...good.electricity, remainingKwh: null}}});
    assert.ok(r.texts.includes('暂无查寝记录'));
    assert.ok(!r.texts.includes('58.6'));
  });
check('unsupported widget size produces guidance', async () => {
    const r = await run({family: 'small', noSettings: true});
    assert.ok(r.texts.includes('请选择中号（4×2）组件'));
  });
check('app demo runs without network and presents medium preview', async () => {
    const r = await run({app: true, menu: 2, noSettings: true});
    assert.equal(r.requests.length, 0);
    assert.equal(r.preview, 1);
    assert.ok(r.texts.includes('95') && r.texts.includes('示例数据 · 总量仅供预览'));
  });

function sample(remainingKwh, minute, extra = {}) {
  return {...good, electricity: {...good.electricity, remainingKwh,
    checkedAt: new Date(Date.parse('2026-11-07T08:00:00Z') + minute * 60000).toISOString(), ...extra}};
}
function cycle(result) {return JSON.parse(result.keys.get(KEY)).electricityCycle;}
function storage() {return {keys: new Map(), files: new Map()};}

check('first reading replaces the legacy fixed maximum', async () => {
  const r = await run({data: sample(15, 0)});
  assert.equal(cycle(r).totalKwh, 15);
  assert.ok(r.texts.includes('共 15 度'));
  assert.ok(!r.texts.includes('共 100 度'));
});

check('consumption preserves total; every recharge starts a new cycle across runs', async () => {
  const saved = storage();
  for (const [minute, remaining, total] of [[0, 20, 20], [1, 15, 20], [2, 65, 65], [3, 60, 65], [4, 60, 65], [5, 10, 65], [6, 40, 40]]) {
    const r = await run({storage: saved, data: sample(remaining, minute)});
    assert.equal(cycle(r).totalKwh, total);
    assert.equal(cycle(r).remainingKwh, remaining);
    assert.ok(r.texts.includes('共 ' + total + ' 度'));
  }
});

check('duplicate and out-of-order samples cannot change the recharge baseline', async () => {
  const saved = storage();
  const original = cycle(await run({storage: saved, data: sample(20, 5)}));
  for (const [remaining, minute] of [[100, 5], [5, 4], [100, 3]]) {
    const r = await run({storage: saved, data: sample(remaining, minute)});
    assert.deepEqual(cycle(r), original);
  }
  const r = await run({storage: saved, data: sample(19, 6)});
  assert.equal(cycle(r).totalKwh, 20);
});

check('ring uses the latest recharge total as its denominator', async () => {
  const saved = storage();
  await run({storage: saved, data: sample(15, 0)});
  await run({storage: saved, data: sample(65, 1)});
  const r = await run({storage: saved, data: sample(60, 2)});
  const [x, y] = r.paths[0].points.at(-1).args;
  const angle = -Math.PI / 2 + 2 * Math.PI * 60 / 65;
  assert.ok(Math.abs(x - (48 + 42 * Math.cos(angle))) < 1e-9);
  assert.ok(Math.abs(y - (48 + 42 * Math.sin(angle))) < 1e-9);
});

check('stale, failed, unavailable, missing and undated samples preserve the baseline', async () => {
  const saved = storage();
  const original = cycle(await run({storage: saved, data: sample(20, 0)}));
  for (const extra of [{stale: true}, {state: 'error'}, {state: 'unavailable'}, {remainingKwh: null}, {checkedAt: null}, {checkedAt: 'invalid'}]) {
    const r = await run({storage: saved, data: sample(100, 1, extra)});
    assert.deepEqual(cycle(r), original);
  }
  const r = await run({storage: saved, data: sample(19, 2)});
  assert.equal(cycle(r).totalKwh, 20);
});

check('offline cache and demo preview never reset the recorded total', async () => {
  const saved = storage();
  await run({storage: saved, data: sample(65, 0)});
  const original = cycle(await run({storage: saved, data: sample(60, 1)}));
  const offline = await run({storage: saved, networkError: true});
  assert.deepEqual(cycle(offline), original);
  assert.ok(offline.texts.includes('共 65 度'));
  const demo = await run({storage: saved, app: true, menu: 2});
  assert.deepEqual(cycle(demo), original);
  assert.deepEqual(demo.alerts[0].actions, ['刷新并预览', '配置接口与 Token', '示例预览']);
});

check('zero is a valid baseline and the next increase is a recharge', async () => {
  const saved = storage();
  const zero = await run({storage: saved, data: sample(0, 0)});
  assert.ok(zero.texts.includes('共 0 度'));
  assert.equal(cycle(zero).totalKwh, 0);
  const recharged = await run({storage: saved, data: sample(30, 1)});
  assert.equal(cycle(recharged).totalKwh, 30);
});

check('historical readings do not initialize a total or use the manual maximum', async () => {
  const r = await run({data: sample(65, 0, {stale: true})});
  assert.equal(cycle(r), undefined);
  assert.ok(r.texts.includes('等待有效电量'));
});

check('timestamp comparison treats timezone-less server times as Shanghai time', async () => {
  const saved = storage();
  await run({storage: saved, data: sample(20, 0, {checkedAt: '2026-11-07 16:00:00'})});
  const r = await run({storage: saved, data: sample(65, 1)});
  assert.equal(cycle(r).totalKwh, 65);
});

check('changing the origin or token clears both cycle and cached readings', async () => {
  for (const input of [['https://other.invalid', 'dw_' + 'b'.repeat(43)], ['https://widget.invalid', 'dw_' + 'b'.repeat(43)]]) {
    const saved = storage();
    await run({storage: saved});
    const r = await run({storage: saved, app: true, menus: [1, 0], input, networkError: true});
    assert.equal(cycle(r), undefined);
    assert.equal(r.files.has(cachePath), false);
    assert.ok(r.texts.includes('网络或服务暂不可用'));
  }
});

check('saving the same connection preserves the cycle', async () => {
  const saved = storage();
  const original = cycle(await run({storage: saved}));
  const r = await run({storage: saved, app: true, menus: [1, 0], input: ['https://widget.invalid', '']});
  assert.deepEqual(cycle(r), original);
});
