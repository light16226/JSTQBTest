const QUESTION_SOURCES=[
 {chapter:'1章',file:'data/questions_1.json'},
 {chapter:'2章',file:'data/questions_2.json'},
 {chapter:'3章',file:'data/questions_3.json'},
 {chapter:'4章',file:'data/questions_4.json'},
 {chapter:'5章',file:'data/questions_5.json'},
 {chapter:'6章',file:'data/questions_6.json'},
];
const ALL_CHAPTERS='全章';
const LOG_STORAGE_KEY='jstqbStudyLogs_v2';
const LEGACY_LOG_STORAGE_KEYS=['examLogs'];
const LOG_SCHEMA_VERSION=2;
const state={questions:[],pool:[],idx:0,score:0,session:[],sessionId:null,logs:null,selected:null,cache:new Map(),logStorageWarning:''};
const $=id=>document.getElementById(id);
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function explanationWithSource(q){
 const exp=String(q?.explanation||'なし');
 const basis=String(q?.sourceBasis||'').trim();
 if(!basis) return exp;
 if(/\n根拠:\s*$/.test(exp)) return exp+basis;
 if(/根拠:\s*$/.test(exp)) return exp+basis;
 return exp+'\n根拠: '+basis;
}
function selectedSources(){
 const chap=$('chapterSelect').value;
 if(chap===ALL_CHAPTERS) return QUESTION_SOURCES;
 return QUESTION_SOURCES.filter(s=>s.chapter===chap);
}
function embeddedDataFor(source){
 const files=window.EMBEDDED_QUESTION_FILES||{};
 if(files[source.file]) return files[source.file];
 const embedded=window.EMBEDDED_QUESTIONS;
 if(embedded&&Array.isArray(embedded.questions)){
  const questions=embedded.questions.filter(q=>q.chapter===source.chapter);
  return {meta:{...(embedded.meta||{}),questionCount:questions.length,chapters:[source.chapter]},questions};
 }
 return null;
}
async function loadQuestionSource(source){
 if(state.cache.has(source.file)) return state.cache.get(source.file);
 let data;
 try{
  const r=await fetch(source.file,{cache:'no-store'});
  if(!r.ok) throw new Error(`${source.file}: ${r.status}`);
  data=await r.json();
 }catch(e){
  data=embeddedDataFor(source);
  if(!data) throw e;
 }
 const questions=Array.isArray(data.questions)?data.questions:[];
 state.cache.set(source.file,questions);
 return questions;
}
async function loadSelectedQuestions(){
 const sources=selectedSources();
 $('startBtn').disabled=true;
 try{
  const groups=await Promise.all(sources.map(loadQuestionSource));
  state.questions=groups.flat();
  $('totalQuestions').textContent=state.questions.length;
  $('questionLimit').max=state.questions.length;
  if(Number($('questionLimit').value)>state.questions.length) $('questionLimit').value=state.questions.length;
 }finally{
  $('startBtn').disabled=state.questions.length===0;
 }
}
function emptyLogs(){
 return {version:LOG_SCHEMA_VERSION,sessions:[],answers:[],questionStats:{},stats:{total:0,correct:0,incorrect:0,accuracy:0}};
}
function parseStoredJson(value){
 if(!value) return null;
 try{return JSON.parse(value)}catch(e){return null}
}
function findQuestionById(id){
 if(!id) return null;
 const fromCurrent=state.questions.find(q=>q.id===id);
 if(fromCurrent) return fromCurrent;
 for(const questions of state.cache.values()){
  const found=questions.find(q=>q.id===id);
  if(found) return found;
 }
 const embedded=window.EMBEDDED_QUESTIONS;
 if(embedded&&Array.isArray(embedded.questions)) return embedded.questions.find(q=>q.id===id)||null;
 return null;
}
function readElapsedMs(rec){
 if(!rec) return 0;
 if(typeof rec.elapsedMs==='number') return Math.max(0,Math.round(rec.elapsedMs));
 if(typeof rec.timeMs==='number') return Math.max(0,Math.round(rec.timeMs));
 if(typeof rec.elapsedSec==='number') return Math.max(0,Math.round(rec.elapsedSec*1000));
 if(typeof rec.timeSec==='number') return Math.max(0,Math.round(rec.timeSec*1000));
 return 0;
}
function toCompactAnswer(rec){
 if(!rec||!rec.id) return null;
 const q=findQuestionById(rec.id);
 let selectedIndex=Number.isInteger(rec.selectedIndex)?rec.selectedIndex:null;
 if(q&&typeof rec.selected==='string'){
  const resolved=q.options.indexOf(rec.selected);
  selectedIndex=resolved>=0?resolved:selectedIndex;
 }
 if(q&&(selectedIndex===null||selectedIndex<0||selectedIndex>=q.options.length)) selectedIndex=null;
 const compact={
  timestamp:rec.timestamp||new Date().toISOString(),
  id:String(rec.id),
  chapter:rec.chapter||(q&&q.chapter)||'',
  selectedIndex,
  correct:!!rec.correct,
 };
 if(Number.isInteger(rec.shownSelectedIndex)) compact.shownSelectedIndex=rec.shownSelectedIndex;
 const elapsedMs=readElapsedMs(rec);
 if(elapsedMs>0) compact.elapsedMs=elapsedMs;
 if(rec.sessionId) compact.sessionId=String(rec.sessionId);
 return compact;
}
function migrateLogs(input){
 const out=emptyLogs();
 const source=input&&typeof input==='object'?input:{};
 const answers=Array.isArray(source.answers)?source.answers:[];
 out.answers=answers.map(toCompactAnswer).filter(Boolean);
 out.sessions=Array.isArray(source.sessions)?source.sessions.map(s=>({
  timestamp:s.timestamp||new Date().toISOString(),
  total:Number(s.total)||0,
  correct:Number(s.correct)||0,
  incorrect:Number(s.incorrect)||0,
  accuracy:Number(s.accuracy)||0,
  totalTimeMs:readElapsedMs({elapsedMs:s.totalTimeMs}),
  averageTimeMs:readElapsedMs({elapsedMs:s.averageTimeMs}),
  questionIds:Array.isArray(s.questionIds)?s.questionIds.map(String):[],
 })).filter(s=>s.timestamp):[];
 updateStatsFor(out);
 return out;
}
function loadLogs(){
 let logs=parseStoredJson(localStorage.getItem(LOG_STORAGE_KEY));
 if(logs) return migrateLogs(logs);
 for(const key of LEGACY_LOG_STORAGE_KEYS){
  logs=parseStoredJson(localStorage.getItem(key));
  if(logs){
   const migrated=migrateLogs(logs);
   try{localStorage.setItem(LOG_STORAGE_KEY,JSON.stringify(migrated))}catch(e){state.logStorageWarning='ログ保存容量が大きくなっています。ログを書き出してから削除してください。'}
   return migrated;
  }
 }
 return migrateLogs(window.INITIAL_LOGS||emptyLogs());
}
function makeAnswerLogRecord(q,selectedIndex,shownSelectedIndex,correct,elapsedMs){
 const rec={timestamp:new Date().toISOString(),id:q.id,chapter:q.chapter,selectedIndex,shownSelectedIndex,correct,sessionId:state.sessionId};
 if(elapsedMs>0) rec.elapsedMs=Math.round(elapsedMs);
 return rec;
}
function updateStatsFor(logs){
 const answers=Array.isArray(logs.answers)?logs.answers:[];
 const total=answers.length;
 const correct=answers.filter(x=>x.correct).length;
 logs.stats={total,correct,incorrect:total-correct,accuracy:total?correct/total:0};
 logs.questionStats={};
 for(const r of answers){
  if(!r.id) continue;
  const stat=logs.questionStats[r.id]||{answered:0,correct:0,incorrect:0,lastAnsweredAt:null,totalElapsedMs:0};
  stat.answered++;
  if(r.correct) stat.correct++; else stat.incorrect++;
  if(!stat.lastAnsweredAt||String(r.timestamp)>String(stat.lastAnsweredAt)) stat.lastAnsweredAt=r.timestamp;
  stat.totalElapsedMs+=readElapsedMs(r);
  logs.questionStats[r.id]=stat;
 }
 return logs;
}
function updateStats(){if(state.logs) updateStatsFor(state.logs)}
function setLogStorageWarning(message){
 state.logStorageWarning=message||'';
 renderLogs();
}
function saveLogs(){
 if(!state.logs) return false;
 state.logs.version=LOG_SCHEMA_VERSION;
 updateStats();
 try{
  localStorage.setItem(LOG_STORAGE_KEY,JSON.stringify(state.logs));
  state.logStorageWarning='';
  return true;
 }catch(e){
  state.logStorageWarning='ログ保存容量が大きくなっています。ログを書き出してから削除してください。';
  return false;
 }
}
function recordAnswer(rec){
 const compact=toCompactAnswer(rec);
 if(!compact) return;
 state.session.push(compact);
 if(!state.logs) state.logs=emptyLogs();
 if(!Array.isArray(state.logs.answers)) state.logs.answers=[];
 state.logs.answers.unshift(compact);
 updateStats();
 saveLogs();
}
function recordAnswerForCurrentQuestion(rec){
 const beforeSessionLength=state.session.length;
 try{
  recordAnswer(rec);
 }catch(e){
  console.error('Failed to record answer.',e);
  try{
   const compact=toCompactAnswer(rec);
   if(compact&&state.session.length===beforeSessionLength) state.session.push(compact);
  }catch(innerError){
   console.error('Failed to keep answer in the current session.',innerError);
  }
 }
}
function selectedTextForLog(r){
 const q=findQuestionById(r.id);
 if(q&&Number.isInteger(r.selectedIndex)&&r.selectedIndex>=0&&r.selectedIndex<q.options.length) return q.options[r.selectedIndex];
 return Number.isInteger(r.selectedIndex)?`選択肢${r.selectedIndex+1}`:'-';
}
function answerTextForLog(r){
 const q=findQuestionById(r.id);
 return q?q.answer:'-';
}
function formatMs(ms){
 ms=Math.max(0,Number(ms)||0);
 const total=Math.floor(ms/1000);
 const min=Math.floor(total/60);
 const sec=total%60;
 return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
async function loadData(){
 $('chapterSelect').innerHTML=[ALL_CHAPTERS,...QUESTION_SOURCES.map(s=>s.chapter)].map(c=>`<option>${escapeHtml(c)}</option>`).join('');
 $('chapterSelect').addEventListener('change',loadSelectedQuestions);
 await loadSelectedQuestions();
 state.logs=loadLogs();
 renderLogs();
}
async function start(){
 await loadSelectedQuestions();
 const chap=$('chapterSelect').value;
 let qs=chap===ALL_CHAPTERS?state.questions:state.questions.filter(q=>q.chapter===chap);
 if($('shuffleQuestions').checked) qs=shuffle(qs);
 const limit=Math.max(1,Math.min(Number($('questionLimit').value)||10,qs.length));
 state.pool=qs.slice(0,limit).map(q=>({...q, shownOptions:$('shuffleOptions').checked?shuffle(q.options):q.options}));
 state.idx=0; state.score=0; state.session=[]; state.selected=null; state.sessionId=`s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
 $('summaryPanel').classList.add('hidden'); $('quizPanel').classList.remove('hidden'); showQuestion();
}
function showQuestion(){
 const q=state.pool[state.idx]; state.selected=null;
 $('feedback').classList.add('hidden'); $('feedback').textContent=''; $('nextBtn').disabled=true;
 $('qid').textContent=`${q.id} / ${q.chapter}`; $('questionText').textContent=q.question;
 $('progressText').textContent=`${state.idx+1} / ${state.pool.length}`; $('scoreText').textContent=`正答 ${state.score}`;
 $('barFill').style.width=`${(state.idx/state.pool.length)*100}%`;
 $('options').innerHTML=q.shownOptions.map((o,i)=>`<button class="option" data-i="${i}">${escapeHtml(o)}</button>`).join('');
 document.querySelectorAll('.option').forEach(b=>b.addEventListener('click',()=>answer(b)));
}
function answer(btn){
 if(state.selected!==null) return;
 const q=state.pool[state.idx];
 const shownSelectedIndex=Number(btn.dataset.i);
 const chosen=q.shownOptions[shownSelectedIndex];
 const selectedIndex=q.options.indexOf(chosen);
 const ok=chosen===q.answer;
 state.selected=chosen;
 if(ok) state.score++;
 document.querySelectorAll('.option').forEach(b=>{const val=b.textContent; if(val===q.answer)b.classList.add('correct'); if(b===btn&&!ok)b.classList.add('wrong'); b.disabled=true;});
 recordAnswerForCurrentQuestion(makeAnswerLogRecord(q,selectedIndex>=0?selectedIndex:null,shownSelectedIndex,ok,0));
 $('feedback').classList.remove('hidden'); $('feedback').textContent=(ok?'正解です。':'不正解です。')+'\n\n正答: '+q.answer+'\n\n解説:\n'+explanationWithSource(q);
 $('nextBtn').disabled=false; renderLogs();
}
function next(){ if(state.idx<state.pool.length-1){state.idx++; showQuestion();} else finish(); }
function finish(){
 $('quizPanel').classList.add('hidden'); $('summaryPanel').classList.remove('hidden');
 const total=state.session.length, correct=state.session.filter(x=>x.correct).length;
 $('sumTotal').textContent=total; $('sumCorrect').textContent=correct; $('sumAccuracy').textContent=total?Math.round(correct/total*100)+'%':'0%';
 state.logs.sessions.unshift({timestamp:new Date().toISOString(),total,correct,incorrect:total-correct,accuracy:total?correct/total:0,questionIds:state.session.map(x=>x.id)}); saveLogs(); renderLogs();
}
function renderLogs(){
 if(!state.logs)return;
 updateStats();
 const s=state.logs.stats;
 const answeredWithTime=state.logs.answers.filter(r=>readElapsedMs(r)>0);
 const avgMs=answeredWithTime.length?answeredWithTime.reduce((sum,r)=>sum+readElapsedMs(r),0)/answeredWithTime.length:0;
 const suffix=state.logStorageWarning?` / ${state.logStorageWarning}`:'';
 $('logStats').textContent=`累計回答数 ${s.total} / 累計正答数 ${s.correct} / 累計誤答数 ${s.incorrect} / 累計正答率 ${Math.round(s.accuracy*100)}% / 平均時間 ${formatMs(avgMs)} / 最新200件のみ表示${suffix}`;
 $('logTable').querySelector('tbody').innerHTML=state.logs.answers.slice(0,200).map(r=>`<tr><td>${new Date(r.timestamp).toLocaleString('ja-JP')}</td><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.chapter)}</td><td>${readElapsedMs(r)?formatMs(readElapsedMs(r)):'-'}</td><td class="${r.correct?'ok':'bad'}">${r.correct?'正解':'不正解'}</td><td>${escapeHtml(selectedTextForLog(r))}</td><td>${escapeHtml(answerTextForLog(r))}</td></tr>`).join('');
}
function exportLogs(){const blob=new Blob([JSON.stringify(state.logs,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='logs.json'; a.click(); URL.revokeObjectURL(a.href);}
function importLogs(file){const fr=new FileReader(); fr.onload=()=>{try{state.logs=migrateLogs(JSON.parse(fr.result)); saveLogs(); renderLogs(); alert('ログを読み込みました');}catch(e){alert('JSONを読み込めませんでした');}}; fr.readAsText(file);}
$('startBtn').addEventListener('click',()=>start()); $('nextBtn').addEventListener('click',next); $('finishBtn').addEventListener('click',finish); $('exportLogs').addEventListener('click',exportLogs); $('clearLogs').addEventListener('click',()=>{if(confirm('ログを削除しますか？')){state.logs=emptyLogs();saveLogs();renderLogs();}}); $('importLogs').addEventListener('change',e=>e.target.files[0]&&importLogs(e.target.files[0]));
loadData();
