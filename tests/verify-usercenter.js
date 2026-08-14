const fs = require('fs');
const ROOT = process.env.ROLES_ROOT || require('path').join(__dirname, '..');
const results = {};
const assert = (name, cond) => { results[name] = cond ? 'PASS' : 'FAIL'; if (!cond) process.exitCode = 1; };

function mkEl() {
  return {
    style: {}, innerHTML: '', textContent: '', disabled: false, className: '', value: '',
    options: {length: 0},
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

const script = fs.readFileSync(ROOT + '/index.html', 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const fn = new Function('els', script + `
  const out = {};
  // test helper: put a seed person on a plant's access list (mirrors the app's initAsg —
  // one role per person, so the row always carries the person's account role)
  function seedAsg(pid,plant){ const p=PEOPLE.find(x=>x.id===pid); const a={tier:p.role,P:{},reason:'',openSets:{},open:false};
    SETS.forEach(s=>s.perms.forEach(pr=>a.P[s.id+'.'+pr.id]=isStdG(p.role,p.grant,s.id))); p.asg[plant]=a; return a; }
  // --- directory renders with seeds ---
  render();
  out.dirDefault = els.uclist.innerHTML.includes('Satyadev Singh') && els.uclist.innerHTML.includes('Piyush Negi');
  out.kpis = els.uckpis.innerHTML.includes('people');
  out.seedDrift = els.uclist.innerHTML.includes('deviation'); // asha + vikram carry exceptions

  // --- filters ---
  els.ucsearch.value='garvit'; render();
  out.searchWorks = els.uclist.innerHTML.includes('Garvit') && !els.uclist.innerHTML.includes('Satyadev');
  els.ucsearch.value=''; els.ucfstate.value='grant'; render();
  out.grantFilter = els.uclist.innerHTML.includes('Garvit') && !els.uclist.innerHTML.includes('Mohit');
  els.ucfstate.value=''; render();

  // --- open a person: editor binds to their record ---
  selectPerson('satyadev');
  out.profileBound = cur.id==='satyadev' && ASG===cur.asg && grant===cur.grant && role===cur.role;
  out.singleRole = cur.role==='l3' && ASG['Essentia STP'].tier==='l3' && ASG['Vedanta- 200 KLD (WTP)'].tier==='l3';
  out.seedException = ASG['Essentia STP'].P['remote.actuate']===true && deviations(ASG['Essentia STP']).length>=1;
  out.headerFilled = els.ucnm.textContent==='Satyadev Singh';

  // --- save writes back to the registry & audit; role is top-level, no per-row tier ---
  save();
  out.savedRoleTop = els.payload.textContent.includes('"role": "l3"') && !els.payload.textContent.includes('"tier"');
  out.payloadPerson = els.payload.textContent.includes('"userId": "satyadev"') && els.payload.textContent.includes('Satyadev Singh');
  out.auditNamed = AUDIT[0].t.includes('Satyadev Singh');

  // --- add person: no access until assigned ---
  backToDirectory(); startAddPerson();
  document.getElementById('np_name').value='Sunil Joshi';
  document.getElementById('np_title').value='Vendor engineer';
  addPersonSubmit();
  out.added = PEOPLE.some(x=>x.n==='Sunil Joshi') && cur.n==='Sunil Joshi';
  out.addedNoAccess = Object.keys(cur.asg).length===0;
  out.addAudited = AUDIT[0].t.includes('Sunil Joshi') && AUDIT[0].t.includes('no access');
  // give him plant access + the one role, save
  togglePlantSel('Vedanta- 50KLD (Gas Holder)'); setRole('l1'); save();
  out.newPersonSaved = PEOPLE.find(x=>x.n==='Sunil Joshi').asg['Vedanta- 50KLD (Gas Holder)'].tier==='l1'
                    && PEOPLE.find(x=>x.n==='Sunil Joshi').role==='l1';
  // a role change lands at EVERY plant on the access list (account-wide)
  togglePlantSel('EMS'); setRole('l3');
  out.roleEverywhere = cur.role==='l3' && ASG['Vedanta- 50KLD (Gas Holder)'].tier==='l3' && ASG['EMS'].tier==='l3';
  setRole('l1'); togglePlantSel('EMS'); save(); // revert: back to L1, one plant only

  // --- review reads the same registry ---
  out.reviewIsRegistry = reviewPeople()===PEOPLE;
  out.reviewSeesNew = reviewPeople().some(x=>x.n==='Sunil Joshi');
  // no seed carries an add now (Asha's is a removal); create a real added exception to exercise the state
  PEOPLE.find(x=>x.id==='mohit').asg['Vedanta- 200 KLD (WTP)'].P['approve.gates']=true;
  out.st_added = cellState(PEOPLE.find(x=>x.id==='mohit'),'Vedanta- 200 KLD (WTP)','approve.gates')==='added';
  PEOPLE.find(x=>x.id==='mohit').asg['Vedanta- 200 KLD (WTP)'].P['approve.gates']=false;
  out.st_removed = cellState(PEOPLE.find(x=>x.id==='garvit'),'Amazon DEL-4','approve.selfapprove')==='removed';
  out.st_capped = cellState(PEOPLE.find(x=>x.id==='garvit'),'Amazon DEL-4','tech.sensors')==='capped';
  reviewPerson='satyadev'; lens='person'; whySel=null; openRevSets=null; renderReview();
  out.editingChipGone = !els.reviewbody.innerHTML.includes('open in the User Center'); // cur is Sunil, not satyadev
  selectPerson('satyadev'); renderReview();
  out.editingChip = els.reviewbody.innerHTML.includes('open in the User Center');
  out.whyStill = whyChain(PEOPLE.find(x=>x.id==='satyadev'),'Essentia STP','remote.actuate').includes('DP-1188');
  out.whyAdded = cellState(PEOPLE.find(x=>x.id==='satyadev'),'Essentia STP','remote.actuate')==='added';

  // --- preview drives from the selected person ---
  prevMode='live'; prevPlant='all';
  const ctx=previewCtx();
  out.previewPerson = ctx.who==='Satyadev Singh' && ctx.role==='l3';
  // guardrails still alive on person records
  togglePerm('Essentia STP','approve','gates'); // turning OFF a std l3 perm -> deviation
  out.guardrailsLive = deviations(ASG['Essentia STP']).length>=1;

  // ================= PERSONA TOGGLE =================
  setPersona('site');
  out.siteNote = els.personanote.textContent.includes('your plant');
  const sp = scopedPeople();
  out.siteRoster = sp.some(x=>x.id==='satyadev') && !sp.some(x=>x.id==='piyush') && !sp.some(x=>x.id==='mohit');
  out.sitePlants = scopedPlants().length===1 && scopedPlants()[0]==='Essentia STP';
  out.modsReadOnly = els.modmatrix.innerHTML.includes('Read-only for you') && els.modmatrix.innerHTML.includes('disabled');
  selectPerson('satyadev'); // in scope
  out.grantLocked = els.grantchips.innerHTML.includes('🔒');
  out.noClusterChipForSite = !els.plantbox.innerHTML.includes('whole cluster');
  // site admin adds a person -> lands in their scope
  backToDirectory(); startAddPerson();
  document.getElementById('np_name').value='Meena Iyer'; document.getElementById('np_title').value='Trainee operator';
  addPersonSubmit();
  out.siteAddHome = cur.home==='Essentia STP' && scopedPeople().some(x=>x.n==='Meena Iyer');

  // ================= GLOBAL: CLUSTER SELECT =================
  setPersona('global');
  out.globalSeesAll = scopedPeople().length===PEOPLE.length && reviewPeople()===PEOPLE;
  out.clusterChipForGlobal = (selectPerson('mohit'), els.plantbox.innerHTML.includes('whole cluster'));
  selectCluster('vedanta');
  out.clusterSelected = ['Vedanta- 200 KLD (WTP)','Vedanta- 50KLD (Gas Holder)'].every(p=>cur.asg[p]);

  // ================= CUSTOM ROLES: REMOVED (owner decision 2026-08-13) =================
  // the entire subsystem is gone — nobody, People Admins included, can create or apply one
  out.customGone = typeof createCustomRole==='undefined' && typeof applyCustomRole==='undefined'
                && typeof PACKS==='undefined' && typeof customPalette==='undefined'
                && typeof applyPreview==='undefined' && typeof retirePack==='undefined';
  seedAsg('mohit','Vedanta- 50KLD (Gas Holder)'); // explicit precondition for the bulk tests below (l1 by role)

  // model: flags hold impersonate + sensorhealth; remote is its OWN sensitive set, never a role default, excluded from bulk
  out.remoteOwnSet = !!setById.remote && setById.remote.sensitive===true && PERMMOD['remote.actuate']==='iot';
  out.remoteNoDefault = !Object.values(ROLES).some(r=>r.std.includes('remote'));
  out.remoteNotBulkAddable = bulkEditPerm('Essentia STP',['mohit'],['remote.actuate'],'add','deliberate?')===0 || (()=>{const r=PEOPLE.find(x=>x.id==='mohit');return !r.asg['Essentia STP']||r.asg['Essentia STP'].P['remote.actuate']!==true;})();
  // 2026-07-22 ruling: flags = impersonate (preq people) + sensorhealth (no preq, mod iot); backdate stays gone
  out.flagsOnlyImpersonate = setById.flags.perms.length===2
    && setById.flags.perms.some(p=>p.id==='impersonate'&&p.preq==='people')
    && setById.flags.perms.some(p=>p.id==='sensorhealth'&&!p.preq&&p.mod==='iot')
    && !setById.flags.perms.some(p=>p.id==='backdate');
  // 2026-07-22 rulings: maintenance & check-in deleted; datacorrect + stores are net-new
  out.maintCheckinGone = !setById.readplant.perms.some(p=>p.id==='maintenance'||p.id==='checkin')
    && !Object.keys(PERMMOD).some(k=>k.endsWith('.maintenance')||k.endsWith('.checkin'));
  out.datacorrectInApprove = setById.approve.perms.some(p=>p.id==='datacorrect'&&p.mod==='data');
  out.storesInTech = setById.tech.perms.some(p=>p.id==='stores'&&p.mod==='inv');
  out.backdateGone = !SETS.some(s=>s.perms.some(p=>p.id==='backdate'));
  out.remoteNotInApprove = !setById.approve.perms.some(p=>p.id==='remote');
  // tasks are now baseline (readplant kitty), same as dashboards/insights — viewers keep them
  out.tasksInReadplant = setById.readplant.perms.some(p=>p.id==='tasks') && PERMMOD['readplant.tasks']==='tasks';
  out.tasksNotInWork = !setById.work.perms.some(p=>p.id==='tasks');
  out.dataInReadplant = setById.readplant.perms.some(p=>p.id==='data') && PERMMOD['readplant.data']==='data' && !setById.work.perms.some(p=>p.id==='data');
  out.inventoryStaysOperator = setById.work.perms.some(p=>p.id==='inventory') && !setById.readplant.perms.some(p=>p.id==='inventory');
  out.nonopHasTasks = isStdG('regular','','readplant')===true && setById.readplant.perms.some(p=>p.id==='tasks'); // Non-op has readplant → gets task view/execute (module-gated)
  out.workIsIssueLifecycle = setById.work.perms.filter(p=>p.mod==='ops').length>=4; // sessions/rc/media/raise/handoff

  // ================= CLUSTER PERSONA + PLANT-WIDE BULK ACTIONS =================
  setPersona('cluster');
  out.clusterPlants = scopedPlants().length===2 && scopedPlants().every(p=>PLANTCO[p]==='vedanta');
  out.clusterModsRO = els.modmatrix.innerHTML.includes('Read-only for you') && els.modmatrix.innerHTML.includes("cluster");
  selectPerson('satyadev');
  out.clusterGrantLock = els.grantchips.innerHTML.includes('🔒');
  out.clusterChipShown = els.plantbox.innerHTML.includes('whole cluster');
  backToDirectory();
  out.bulkPanelShown = els.bulkbox.innerHTML.includes('Plant-wide actions');
  // bulk roster add (single-role model: no bulk role change exists) — Satyadev is not at the Gas
  // Holder plant yet and joins at his ACCOUNT role (l3); Mohit is already on the roster, skipped untouched
  const n1 = bulkAddToPlant('Vedanta- 50KLD (Gas Holder)',['mohit','satyadev']);
  out.bulkAdd = n1===1 && PEOPLE.find(x=>x.id==='satyadev').asg['Vedanta- 50KLD (Gas Holder)'].tier==='l3'
             && PEOPLE.find(x=>x.id==='mohit').asg['Vedanta- 50KLD (Gas Holder)'].tier==='l1'
             && typeof bulkSetTier==='undefined';
  // bulk add: people.invite applies (core); portfolio.overview skipped (analytics not licensed at Pari Chowk)
  const n2 = bulkEditPerm('Vedanta- 50KLD (Gas Holder)',['mohit','satyadev'],['people.invite','portfolio.overview'],'add','Client audit staffing, DP-1500');
  const kavA = PEOPLE.find(x=>x.id==='satyadev').asg['Vedanta- 50KLD (Gas Holder)'];
  out.bulkAddApplied = n2===2 && kavA.P['people.invite']===true;
  out.bulkCeilingHolds = kavA.P['portfolio.overview']===false;
  // both rows were freshly created with no reason yet, so the bulk edit stamps each one
  out.bulkReasonStamped = PEOPLE.find(x=>x.id==='satyadev').asg['Vedanta- 50KLD (Gas Holder)'].reason.includes('DP-1500');
  // bulk remove: strip work.raise from the roster (std for l1/l3 -> becomes an amber removal)
  const n3 = bulkEditPerm('Vedanta- 50KLD (Gas Holder)',['mohit','satyadev'],['work.raise'],'remove','Only leads raise manual issues here, DP-1501');
  out.bulkRemove = n3===2 && PEOPLE.find(x=>x.id==='mohit').asg['Vedanta- 50KLD (Gas Holder)'].P['work.raise']===false
                && cellState(PEOPLE.find(x=>x.id==='mohit'),'Vedanta- 50KLD (Gas Holder)','work.raise')==='removed';
  out.bulkNeedsReason = bulkEditPerm('Vedanta- 50KLD (Gas Holder)',['mohit'],['work.media'],'add','')===0;
  out.bulkScopeBlocked = bulkEditPerm('EMS',['satyadev'],['work.media'],'add','out of cluster')===0;
  out.bulkAudited = AUDIT.slice(0,3).some(e=>e.t.includes('Bulk permission edit')) && AUDIT.slice(0,3).some(e=>e.t.includes('Bulk roster add'));
  setPersona('global');

  // ================= ROLE LIBRARY (fixed catalog only — custom roles removed) =================
  render();
  const lib = els.packbox.innerHTML;
  out.catalogFixed = lib.includes('The fixed catalog') && lib.includes('L1 Operator') && lib.includes('Global Admin') && lib.includes('hold');
  out.catalogHolderCounts = lib.includes('people hold it') || lib.includes('person holds it');
  out.libraryRemovalNote = lib.includes('removed from the model') && lib.includes('People Admins included');
  out.libraryNoBuilder = !lib.includes('Create a custom role') && !lib.includes('Apply to people') && !lib.includes('CUSTOM');

  // ================= CONTROL PANEL (cluster/plant admins) =================
  setPersona('global'); tab(5);
  out.ctrlHiddenForGlobal = document.getElementById('nav-ctrl').style.display==='none'
    && els.ctrlpanel.innerHTML.includes('focused home for');
  out.ctrlBouncesGlobal = document.getElementById('pane1').classList.contains('on')===true || !document.getElementById('pane5').classList.contains('on');
  setPersona('cluster'); tab(5);
  out.ctrlShownForCluster = document.getElementById('nav-ctrl').style.display==='block';
  const cp = els.ctrlpanel.innerHTML;
  out.ctrlScoped = cp.includes('Control panel') && cp.includes('people you manage') && cp.includes('Plant-wide action');
  out.ctrlRoster = cp.includes('Your people') && cp.includes('Mohit') && !cp.includes('Piyush'); // priya is jmc, out of greengrid scope
  out.ctrlLookup = cp.includes('Who can do this, here');
  setCtrlCap('approve.gates'); setCtrlPlant('Essentia STP');
  out.ctrlLookupAnswers = els.ctrlpanel.innerHTML.includes('via role')||els.ctrlpanel.innerHTML.includes('via exception')||els.ctrlpanel.innerHTML.includes('nobody')||els.ctrlpanel.innerHTML.includes('licensed here');
  setPersona('global');
  return out;
`);
const o = fn(els);

Object.entries({
  'directory lists all seeds': o.dirDefault,
  'KPI strip renders': o.kpis,
  'seed deviations badged': o.seedDrift,
  'search filters people': o.searchWorks,
  'grant filter works': o.grantFilter,
  'editor binds to person record': o.profileBound,
  'one role account-wide on seed (JULY 30 RULING)': o.singleRole,
  'seed exception present in P': o.seedException,
  'profile header filled': o.headerFilled,
  'save: role is top-level, no per-row tier': o.savedRoleTop,
  'payload carries person identity': o.payloadPerson,
  'audit names the person': o.auditNamed,
  'add person creates + opens record': o.added,
  'new person starts with zero access': o.addedNoAccess,
  'add is audited': o.addAudited,
  'new person assignable + savable': o.newPersonSaved,
  'role change applies at every plant': o.roleEverywhere,
  'review reads the same registry (no fork)': o.reviewIsRegistry,
  'review sees newly added person': o.reviewSeesNew,
  'review: added state from registry': o.st_added,
  'review: removed state from registry': o.st_removed,
  'review: capped state from registry': o.st_capped,
  'editing chip only for open person': o.editingChipGone && o.editingChip,
  'why-chain cites recorded reason': o.whyStill,
  'review: added state from registry (remote)': o.whyAdded,
  'preview drives from selected person': o.previewPerson,
  'guardrails live on person records': o.guardrailsLive,
  'persona: site note explains scope': o.siteNote,
  'persona: site roster scoped': o.siteRoster,
  'persona: site plants scoped': o.sitePlants,
  'persona: modules read-only for site': o.modsReadOnly,
  'persona: global grant locked for site': o.grantLocked,
  'persona: no cluster chip for site': o.noClusterChipForSite,
  'persona: site-added person lands in scope': o.siteAddHome,
  'persona: global sees everything': o.globalSeesAll,
  'cluster: chip shown to global': o.clusterChipForGlobal,
  'cluster: one click assigns whole cluster': o.clusterSelected,
  'custom roles removed: no create/apply anywhere (AUG 13 RULING)': o.customGone,
  'model: flags = impersonate + sensorhealth exception': o.flagsOnlyImpersonate,
  'model: maintenance & check-in deleted (22 Jul)': o.maintCheckinGone,
  'model: approve.datacorrect net-new (mod data)': o.datacorrectInApprove,
  'model: tech.stores net-new (mod inv)': o.storesInTech,
  'model: backdate removed everywhere': o.backdateGone,
  'model: IoT remote is its own sensitive set (mod iot)': o.remoteOwnSet,
  'model: remote not in the approve set': o.remoteNotInApprove,
  'model: tasks moved to the baseline readplant kitty': o.tasksInReadplant,
  'model: tasks no longer in the work set': o.tasksNotInWork,
  'model: viewers (Non-op) keep tasks via readplant': o.nonopHasTasks,
  'model: data entry moved to baseline readplant': o.dataInReadplant,
  'model: inventory stays operator-level (work)': o.inventoryStaysOperator,
  'model: work set is the issue lifecycle (ops)': o.workIsIssueLifecycle,
  'model: remote is never a role default': o.remoteNoDefault,
  'model: remote cannot be bulk-added': o.remoteNotBulkAddable,
  'cluster persona: the 2 Vedanta plants in scope': o.clusterPlants,
  'cluster persona: modules read-only': o.clusterModsRO,
  'cluster persona: global grant locked': o.clusterGrantLock,
  'cluster persona: whole-cluster chip shown': o.clusterChipShown,
  'bulk: panel renders': o.bulkPanelShown,
  'bulk: roster add at account role, no bulk role change': o.bulkAdd,
  'bulk: permission add applied to set of users': o.bulkAddApplied,
  'bulk: module ceiling not bypassable': o.bulkCeilingHolds,
  'bulk: reason stamped on every person': o.bulkReasonStamped,
  'bulk: permission remove works + shows as ⊘': o.bulkRemove,
  'bulk: blocked without reason': o.bulkNeedsReason,
  'bulk: blocked outside persona scope': o.bulkScopeBlocked,
  'bulk: both action kinds audited': o.bulkAudited,
  'library: fixed catalog (9 pre-defined) listed': o.catalogFixed,
  'library: live holder counts on fixed roles': o.catalogHolderCounts,
  'library: removal note names the decision': o.libraryRemovalNote,
  'library: no builder, no apply flow, no CUSTOM chips': o.libraryNoBuilder,
  'control panel: hidden/explained for global': o.ctrlHiddenForGlobal,
  'control panel: global bounced off it': o.ctrlBouncesGlobal,
  'control panel: shown for cluster admin': o.ctrlShownForCluster,
  'control panel: scoped stats + quick actions': o.ctrlScoped,
  'control panel: scoped roster only': o.ctrlRoster,
  'control panel: capability lookup present': o.ctrlLookup,
  'control panel: lookup answers who-can': o.ctrlLookupAnswers,
}).forEach(([k, v]) => assert(k, v));

// static checks
const html = fs.readFileSync(ROOT + '/index.html', 'utf8');
assert('UX: user center helper present', html.includes('everything drives from here'));
assert('UX: legend + how-to-read intact', html.includes('How to read it'));
assert('rebrand: title is User Center · Roles & Permissions', html.includes('<title>User Center · Roles & Permissions</title>'));
assert('rebrand: no CloseTheLoop anywhere', !html.includes('CloseTheLoop'));
assert('custom roles: no builder or apply strings remain', !html.includes('createCustomRole') && !html.includes('Create a custom role') && !html.includes('applyCustomRole'));
const phtml = fs.readFileSync(ROOT + '/presentation/index.html', 'utf8');
assert('rebrand: presentation clean too', !phtml.includes('CloseTheLoop') && !phtml.includes('Role Studio'));
assert('no workspace vocabulary in UI strings', !/[Ww]orkspace/.test(html.replace(/plantsByCompany|multiws/g, '')));

console.log(JSON.stringify(results, null, 2));
