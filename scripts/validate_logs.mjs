import fs from 'node:fs';

const errors = [];
const logs = JSON.parse(fs.readFileSync('data/logs.json', 'utf8'));

if (logs.version !== 2) errors.push('data/logs.json version must be 2');
if (!Array.isArray(logs.sessions)) errors.push('sessions must be an array');
if (!Array.isArray(logs.answers)) errors.push('answers must be an array');
if (!logs.questionStats || typeof logs.questionStats !== 'object') errors.push('questionStats must be an object');
if (!logs.stats || typeof logs.stats !== 'object') errors.push('stats must be an object');

const forbiddenAnswerKeys = ['question', 'explanation', 'answer', 'selected', 'options', 'shownOptions'];
for (const [index, answer] of (logs.answers || []).entries()) {
  for (const key of forbiddenAnswerKeys) {
    if (Object.hasOwn(answer, key)) errors.push(`answers[${index}] must not contain ${key}`);
  }
}

const sources = ['assets/app.js', 'index.html'].map((path) => [path, fs.readFileSync(path, 'utf8')]);
for (const [path, text] of sources) {
  for (const pattern of [
    'question:q.question',
    'explanation:q.explanation',
    'answer:q.answer',
    'selected:chosen',
    "localStorage.setItem('examLogs'",
  ]) {
    if (text.includes(pattern)) errors.push(`${path} still contains ${pattern}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('log_validation_ok');
