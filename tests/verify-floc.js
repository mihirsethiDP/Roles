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
  const els = freshDoc();
  const fn = new Function(grab(ROOT + '/index.html') + `
    ;renderModules();
    return {MODULES, PLANTMODS, PERMMOD, catalog: (function(){
      // re-render catalog into a capturable element
      return document.getElementById("modcatalog").innerHTML;
    })()};
  `);
  const R = fn();
  assert('[studio] floc in catalog, flagged noperm', R.MODULES.some(m => m.id === 'floc' && m.noperm));
  assert('[studio] 8 modules total', R.MODULES.length === 8);
  assert('[studio] no permission maps to floc', !Object.values(R.PERMMOD).includes('floc'));
  assert('[studio] floc licensed at Sector 62 + demos', R.PLANTMODS['STP — Sector 62'].includes('floc') && R.PLANTMODS['Demo WTP — Sales'].includes('floc'));
  assert('[studio] catalog says entitlement-only', R.catalog.includes('HARDWARE ADD-ON') && R.catalog.includes('grants no user permissions'));
  assert('[studio] no zero-abilities text', !R.catalog.includes('Unlocks 0 abilities'));
})();

/* ---- Presentation ---- */
(() => {
  const els = freshDoc();
  const fn = new Function(grab(ROOT + '/presentation/index.html') + `
    ;pickWorkspace('demo'); pickPlant('Demo WTP — Sales'); go(2);
    const canHtml = document.getElementById('canchips').innerHTML;
    const listHtml = document.getElementById('modlist').innerHTML;
    const availBefore = Object.keys(PERMMOD).filter(k => avail(k)).length;
    toggleModule('floc');
    const availAfter = Object.keys(PERMMOD).filter(k => avail(k)).length;
    go(3);
    const anyUserChanged = Object.values(A).some(a => Object.keys(a.P).some(k => PERMMOD[k] === 'floc'));
    return {canHtml, listHtml, availBefore, availAfter, anyUserChanged, flocOn: mods.has('floc')};
  `);
  const P = fn();
  assert('[pres] floc row shown with HARDWARE tag', P.listHtml.includes('Floc Detector') && P.listHtml.includes('HARDWARE'));
  assert('[pres] floc absent from capability chips', !P.canHtml.includes('Floc') && !P.canHtml.includes('undefined'));
  assert('[pres] toggling floc changes no ability count', P.availBefore === P.availAfter);
  assert('[pres] floc toggled off cleanly', P.flocOn === false);
  assert('[pres] no user permission references floc', P.anyUserChanged === false);
})();

console.log(JSON.stringify(results, null, 2));
