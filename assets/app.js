const state={questions:[],pool:[],idx:0,score:0,session:[],logs:null,selected:null};
const $=id=>document.getElementById(id);
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
async function loadData(){
 try{const r=await fetch('data/questions.json',{cache:'no-store'}); if(!r.ok) throw new Error(); const d=await r.json(); state.questions=d.questions||[];}
 catch(e){state.questions=(window.EMBEDDED_QUESTIONS&&window.EMBEDDED_QUESTIONS.questions)||[];}
 state.logs=JSON.parse(localStorage.getItem('examLogs')||'null') || window.INITIAL_LOGS || {version:1,sessions:[],answers:[],stats:{total:0,correct:0,incorrect:0,accuracy:0}};
 $('totalQuestions').textContent=state.questions.length;
 const chapters=['すべて',...new Set(state.questions.map(q=>q.chapter))];
 $('chapterSelect').innerHTML=chapters.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
 $('questionLimit').max=state.questions.length;
 renderLogs();
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function start(){
 const chap=$('chapterSelect').value;
 let qs=state.questions.filter(q=>chap==='すべて'||q.chapter===chap);
 if($('shuffleQuestions').checked) qs=shuffle(qs);
 const limit=Math.max(1,Math.min(Number($('questionLimit').value)||10,qs.length));
 state.pool=qs.slice(0,limit).map(q=>({...q, shownOptions:$('shuffleOptions').checked?shuffle(q.options):q.options}));
 state.idx=0; state.score=0; state.session=[]; state.selected=null;
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
 const q=state.pool[state.idx]; const chosen=q.shownOptions[Number(btn.dataset.i)]; const ok=chosen===q.answer; state.selected=chosen; if(ok) state.score++;
 document.querySelectorAll('.option').forEach(b=>{const val=b.textContent; if(val===q.answer)b.classList.add('correct'); if(b===btn&&!ok)b.classList.add('wrong'); b.disabled=true;});
 const rec={timestamp:new Date().toISOString(),id:q.id,chapter:q.chapter,question:q.question,selected:chosen,answer:q.answer,correct:ok,explanation:q.explanation};
 state.session.push(rec); state.logs.answers.unshift(rec); updateStats(); saveLogs();
 $('feedback').classList.remove('hidden'); $('feedback').textContent=(ok?'正解です。':'不正解です。')+'\n\n正答: '+q.answer+'\n\n解説:\n'+(q.explanation||'なし');
 $('nextBtn').disabled=false; renderLogs();
}
function next(){ if(state.idx<state.pool.length-1){state.idx++; showQuestion();} else finish(); }
function finish(){
 $('quizPanel').classList.add('hidden'); $('summaryPanel').classList.remove('hidden');
 const total=state.session.length, correct=state.session.filter(x=>x.correct).length;
 $('sumTotal').textContent=total; $('sumCorrect').textContent=correct; $('sumAccuracy').textContent=total?Math.round(correct/total*100)+'%':'0%';
 state.logs.sessions.unshift({timestamp:new Date().toISOString(),total,correct,incorrect:total-correct,accuracy:total?correct/total:0,questionIds:state.session.map(x=>x.id)}); saveLogs(); renderLogs();
}
function updateStats(){const a=state.logs.answers; const total=a.length, correct=a.filter(x=>x.correct).length; state.logs.stats={total,correct,incorrect:total-correct,accuracy:total?correct/total:0};}
function saveLogs(){localStorage.setItem('examLogs',JSON.stringify(state.logs));}
function renderLogs(){ if(!state.logs)return; updateStats(); const s=state.logs.stats; $('logStats').textContent=`累計回答数 ${s.total} / 累計正答数 ${s.correct} / 累計誤答数 ${s.incorrect} / 累計正答率 ${Math.round(s.accuracy*100)}%`;
 $('logTable').querySelector('tbody').innerHTML=state.logs.answers.slice(0,200).map(r=>`<tr><td>${new Date(r.timestamp).toLocaleString('ja-JP')}</td><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.chapter)}</td><td class="${r.correct?'ok':'bad'}">${r.correct?'正解':'不正解'}</td><td>${escapeHtml(r.selected)}</td><td>${escapeHtml(r.answer)}</td></tr>`).join('');}
function exportLogs(){const blob=new Blob([JSON.stringify(state.logs,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='logs.json'; a.click(); URL.revokeObjectURL(a.href);}
function importLogs(file){const fr=new FileReader(); fr.onload=()=>{try{state.logs=JSON.parse(fr.result); updateStats(); saveLogs(); renderLogs(); alert('ログを読み込みました');}catch(e){alert('JSONを読み込めませんでした');}}; fr.readAsText(file);}
$('startBtn').addEventListener('click',start); $('nextBtn').addEventListener('click',next); $('finishBtn').addEventListener('click',finish); $('exportLogs').addEventListener('click',exportLogs); $('clearLogs').addEventListener('click',()=>{if(confirm('ログを削除しますか？')){state.logs={version:1,sessions:[],answers:[],stats:{total:0,correct:0,incorrect:0,accuracy:0}};saveLogs();renderLogs();}}); $('importLogs').addEventListener('change',e=>e.target.files[0]&&importLogs(e.target.files[0]));
loadData();
