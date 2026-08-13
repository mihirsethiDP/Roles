const fs = require('fs');
const ROOT = process.env.ROLES_ROOT || require('path').join(__dirname, '..');
const results = {};
const assert = (name, cond) => { results[name] = cond ? 'PASS' : 'FAIL'; if (!cond) process.exitCode = 1; };

function mkEl() {
  return {
    style: {}, innerHTML: '', textContent: '', disabled: false, className: '', value: '',
    classList: { toggle(){}, add(){}, remove(){}, contains: () => false },
    appendChild(){}, remove(){},
  };
}
const els = {};
global.document = {
  getElementById: id => els[id] || (els[id] = mkEl()),
  querySelectorAll: () => [mkEl(), mkEl(), mkEl(), mkEl()],
  querySelector: () => mkEl(),
  createElement: () => mkEl(),
  body: { appendChild(){} },
};
global.window = { scrollTo(){} };

const script = fs.readFileSync(ROOT + '/presentation/index.html', 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const fn = new Function('els', script + `
  ;pickWorkspace('demo'); pickPlant('Demo WTP — Sales'); go(3);
  const out = {};
  // add Kavita
  startAdd();
  out.formShown = els.focus.innerHTML.includes('np_name');
  document.getElementById('np_name').value = 'Kavita Rao'; document.getElementById('np_title').value = 'Lab technician · day shift';
  addPerson();
  out.count = USERS.length;
  out.active = activeUser;
  out.newHasA = !!A.u6 && A.u6.role === 'l1';
  out.newDev = deviations(A.u6).length;
  out.focusNewCard = els.focus.innerHTML.includes('NEW PERSON') && els.focus.innerHTML.includes("Kavita's role");
  out.noFakeSuggest = !els.focus.innerHTML.includes('SUGGESTED');
  // choose a role and save
  setRole('l3');
  out.devAfterRole = deviations(A.u6).length;
  saveUser();
  out.savedOk = A.u6.saved === true;
  // reset guard on suggest-less user
  activeUser = 'u6'; resetUser();
  out.resetNoCrash = A.u6.role === 'l3';
  // add another, leave unsaved; quick-finish must not touch her
  startAdd(); document.getElementById('np_name').value = 'Rohit Verma'; document.getElementById('np_title').value = ''; addPerson();
  out.defaultTitle = USERS.find(u=>u.id==='u7').title === 'Team member';
  acceptRest();
  out.quickFinishSkipsNew = A.u7.saved === false;
  out.suggestedAllSaved = USERS.filter(u=>u.suggest).every(u=>A[u.id].saved);
  // empty name rejected
  startAdd(); document.getElementById('np_name').value = '   '; addPerson();
  out.emptyRejected = USERS.length === 7;
  cancelAdd();
  // finale includes Kavita (u6 saved), not Rohit (unsaved)
  A.u6.saved = true; go(4);
  out.finale = els.finale.innerHTML;
  return out;
`);
const o = fn(els);

assert('add form shown', o.formShown);
assert('person added (6 users)', o.count === 6);
assert('focus jumps to new person', o.active === 'u6');
assert('assignment initialized L1, zero drift', o.newHasA && o.newDev === 0);
assert('NEW PERSON card, no fake suggestion', o.focusNewCard && o.noFakeSuggest);
assert('role change keeps zero drift (standard)', o.devAfterRole === 0);
assert('save works for added person', o.savedOk);
assert('reset does not crash suggest-less user', o.resetNoCrash);
assert('blank title gets default', o.defaultTitle);
assert('quick-finish skips role-less new people', o.quickFinishSkipsNew);
assert('quick-finish still saves suggested people', o.suggestedAllSaved);
assert('empty name rejected', o.emptyRejected);
assert('finale lists Kavita as L3', o.finale.includes('Kavita Rao') && o.finale.includes('L3 Lead'));
assert('finale omits unsaved Rohit', !o.finale.includes('Rohit Verma'));

console.log(JSON.stringify(results, null, 2));
