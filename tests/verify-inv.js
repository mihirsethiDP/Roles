const fs = require('fs');
const ROOT = process.env.ROLES_ROOT || require('path').join(__dirname, '..');
const results = {};
const assert = (name, cond) => { results[name] = cond ? 'PASS' : 'FAIL'; if (!cond) process.exitCode = 1; };

function mkEl() {
  return {
    style: {}, innerHTML: '', textContent: '', disabled: false, className: '', value: '', options: {length: 0},
    classList: { toggle(){}, add(){}, remove(){}, contains: () => false },
    appendChild(){}, remove(){},
  };
}
function freshDoc() {
  const els = {};
  global.document = {
    getElementById: id => els[id] || (els[id] = mkEl()),
    querySelectorAll: () => [mkEl(), mkEl(), mkEl(), mkEl()],
    querySelector: () => mkEl(),
    createElement: () => mkEl(),
    body: { appendChild(){} },
  };
  global.window = { scrollTo(){} };
  return els;
}
const grab = f => fs.readFileSync(f, 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];

/* ---- Role Studio ---- */
(() => {
  freshDoc();
  const fn = new Function(grab(ROOT + '/index.html') + `
    ;return {buildStdP, computeTabs, bodyFor, MODULES, PLANTMODS, PERMMOD};
  `);
  const R = fn();
  assert('[studio] inv module in catalog', R.MODULES.some(m => m.id === 'inv'));
  assert('[studio] inv licensed at Essentia STP', R.PLANTMODS['Essentia STP'].includes('inv'));
  assert('[studio] perms mapped to inv', R.PERMMOD['work.inventory'] === 'inv' && R.PERMMOD['approve.invlogs'] === 'inv');
  const p1 = R.buildStdP('l1', '');
  assert('[studio] L1 std has operator inventory', p1['work.inventory'] === true && p1['approve.invlogs'] === false);
  const t1 = R.computeTabs({P: p1});
  assert('[studio] L1 gets Inventory tab', t1.some(t => t.id === 'inventory'));
  const why1 = [];
  const b1 = R.bodyFor('inventory', {P: p1}, why1);
  assert('[studio] operator view: add/remove shown, logs locked', b1.includes('+ Add') && b1.includes('Movement logs hidden'));
  const p3 = R.buildStdP('l3', '');
  const b3 = R.bodyFor('inventory', {P: p3}, []);
  assert('[studio] supervisor view: logs shown', p3['approve.invlogs'] === true && b3.includes('Inventory log — today'));
})();

/* ---- Presentation ---- */
(() => {
  freshDoc();
  const fn = new Function(grab(ROOT + '/presentation/index.html') + `
    ;pickWorkspace('demo'); pickPlant('Demo WTP — Sales'); go(3);
    const l1tabs = computeTabs(A.u1.P), l3tabs = computeTabs(A.u2.P);
    const before = {l1inv: A.u1.P['work.inventory'], l1logs: A.u1.P['approve.invlogs'], l3logs: A.u2.P['approve.invlogs'], l1tabs, l3tabs, modsN: MODULES.length};
    toggleModule('inv');
    const after = {l1inv: A.u1.P['work.inventory'], tabs: computeTabs(A.u1.P)};
    return {before, after};
  `);
  const {before, after} = fn();
  assert('[pres] inv among modules', before.modsN >= 7);
  assert('[pres] L1 operator face on', before.l1inv === true && before.l1logs === false);
  assert('[pres] L3 supervisor face on', before.l3logs === true);
  assert('[pres] both get Inventory tab', before.l1tabs.includes('Inventory') && before.l3tabs.includes('Inventory'));
  assert('[pres] module off → ceiling clamps', after.l1inv === false && !after.tabs.includes('Inventory'));
})();

console.log(JSON.stringify(results, null, 2));
