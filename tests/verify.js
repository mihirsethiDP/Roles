const fs = require('fs');
const ROOT = process.env.ROLES_ROOT || require('path').join(__dirname, '..');
const html = fs.readFileSync(ROOT + '/presentation/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

const els = {};
function mkEl() {
  return {
    style: {}, innerHTML: '', textContent: '', disabled: false, className: '',
    classList: { toggle(){}, add(){}, remove(){}, contains: () => false },
    appendChild(){}, remove(){},
  };
}
global.document = {
  getElementById: id => els[id] || (els[id] = mkEl()),
  querySelectorAll: () => [mkEl(), mkEl(), mkEl(), mkEl()],
  querySelector: () => mkEl(),
  createElement: () => mkEl(),
  body: { appendChild(){} },
};
global.window = { scrollTo(){} };

// accessors into the eval lexical scope (let-declared state)
eval(script + `
;globalThis.S = () => ({plant, mods, A, activeUser});
globalThis.setActive = v => { activeUser = v; };
globalThis.USERS = USERS;
`);

const results = {};
const assert = (name, cond) => { results[name] = cond ? 'PASS' : 'FAIL'; if (!cond) process.exitCode = 1; };

pickWorkspace('demo');
pickPlant('Demo WTP — Sales');
assert('plant picked + prefill', S().plant === 'Demo WTP — Sales' && S().mods.size >= 7);
assert('progress moves on pick', progress() === 22);

go(2);
toggleModule('iot');
assert('iot off', !S().mods.has('iot'));

go(3);
const A = S().A;
const p0 = progress();
assert('all users initialized', USERS.every(u => A[u.id] && A[u.id].P));
assert('suggested standard has zero drift', deviations(A.u1).length === 0);
acceptSuggested();
acceptSuggested();
assert('2 saved', savedCount() === 2);
assert('progress grows per person', progress() > p0);
assert('auto-advanced to u3', S().activeUser === 'u3');

togglePerm('approve', 'forceclose');
assert('deviation created', deviations(A.u3).length === 1);
saveUser();
assert('save blocked without reason', A.u3.saved === false);
A.u3.reason = 'Force-close reserved for HQ at this site';
saveUser();
assert('save ok with reason', A.u3.saved === true && savedCount() === 3);

setActive('u5'); renderAll();
togglePerm('tech', 'iot');
assert('module-locked perm stays off', A.u5.P['tech.iot'] === false);
const techOn = Object.keys(A.u5.P).filter(k => k.startsWith('tech.') && A.u5.P[k]);
assert('tech grant inside ceiling (no iot/sensors)', !techOn.includes('tech.sensors') && !techOn.includes('tech.iot') && techOn.length > 0);

setActive('u3');
disableCascade(A.u3, 'work');
assert('cascade work->approve->oversight', setState(A.u3, 'approve') === 'off' && setState(A.u3, 'oversight') === 'off');
resetUser();
assert('reset restores suggestion', deviations(A.u3).length === 0 && A.u3.role === 'l4');
A.u3.saved = true;

acceptRest();
assert('acceptRest saves remaining standards', savedCount() === 5);

go(4);
assert('progress 100', progress() === 100);
const fin = els.finale.innerHTML;
assert('finale has check + plant', fin.includes('bigcheck') && fin.includes('Demo WTP — Sales is ready'));
assert('lineup has all 5', (fin.match(/lcard/g) || []).length >= 5);
assert('takeaway rule present', fin.includes('contract includes it'));
assert('no code-like content', !/userId|baseRole|JSON/.test(fin));

console.log(JSON.stringify(results, null, 2));
