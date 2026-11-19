'use strict';

const players = ['Zach', 'Boyce', 'Kiran', 'Ben 2', 'Billy', 'Potter', 'Will', 'James', 'Luca', 'Matty'];
const previousMatchPrefix = 'expected-toulouse:matches:v1:';
const repositoryName = location.pathname.split('/')[1] === 'expectedtoulouse' ? 'expectedtoulouse' : 'expected-toulouse';
const resultsEndpoint = `https://api.github.com/repos/kiranfinamordamania/${repositoryName}/contents/matches.json`;
const resultsBranch = 'match-data';
const uncredited = 'uncredited';
const scoreForm = document.querySelector('#score-form');
const goalsForm = document.querySelector('#goals-form');
const scoreHeading = document.querySelector('#score-heading');
const detailsHeading = document.querySelector('#details-heading');
const weekInput = document.querySelector('#gameweek');
const teamInput = document.querySelector('#team-score');
const opponentInput = document.querySelector('#opponent-score');
const opponentNameInput = document.querySelector('#opponent-name');
const feedback = document.querySelector('#match-feedback');
const goalFields = document.querySelector('#goal-fields');
const history = document.querySelector('#week-log');
const historyHeading = document.querySelector('#history-heading');
const historyFeedback = document.querySelector('#history-feedback');
const emptyLog = document.querySelector('#empty-log');
const refreshButton = document.querySelector('#refresh-results');
const saveButton = document.querySelector('#save-match');
const editorDialog = document.querySelector('#editor-dialog');
const editorTokenInput = document.querySelector('#editor-token');
const deleteDialog = document.querySelector('#delete-dialog');
let matches = [];
let draft;
let loadedWeek;
let editorToken = '';
let editorAction;
let deleteTarget;
let saving = false;
let resultsVersion = 0;
let lastRefresh = 0;
let loadFailed = false;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function inRange(number, min, max) {
  return Number.isInteger(number) && number >= min && number <= max;
}

function validGoal(goal) {
  if (!goal) return false;
  if (goal.scorer === uncredited) return goal.assist === '';
  return players.includes(goal.scorer)
    && (goal.assist === '' || (players.includes(goal.assist) && goal.assist !== goal.scorer));
}

function validMatch(match) {
  return match && inRange(match.week, 1, 999)
    && inRange(match.team, 0, 99) && inRange(match.opponent, 0, 99)
    && typeof match.opponentName === 'string' && match.opponentName.trim().length > 0 && match.opponentName.length <= 100
    && Array.isArray(match.goals) && match.goals.length === match.team && match.goals.every(validGoal);
}

function readPreviousMatches() {
  const records = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(previousMatchPrefix)) continue;
      try {
        const match = JSON.parse(localStorage.getItem(key));
        if (!match || key !== previousMatchPrefix + match.week) continue;
        const previous = { ...match, opponentName: match.opponentName || 'Opponent' };
        if (validMatch(previous)) records.push(previous);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }
  } catch {
    return records;
  }
  return records.sort((first, second) => second.week - first.week);
}

async function githubRequest(url, options = {}) {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    ...options,
    headers: { Accept: 'application/vnd.github+json', ...options.headers }
  });
  if (!response.ok) throw Object.assign(new Error('GitHub request failed'), { status: response.status });
  return response.json();
}

async function readSharedResults(token = '') {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const file = await githubRequest(`${resultsEndpoint}?ref=${resultsBranch}`, { headers });
  const bytes = Uint8Array.from(atob(file.content), char => char.charCodeAt(0));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (file.encoding !== 'base64' || typeof file.sha !== 'string' || !Array.isArray(data.matches)
    || !data.matches.every(validMatch) || new Set(data.matches.map(match => match.week)).size !== data.matches.length) {
    throw new Error('Shared match history is invalid');
  }
  return { sha: file.sha, records: data.matches.sort((first, second) => second.week - first.week) };
}

function encodeResults(records) {
  const bytes = new TextEncoder().encode(`${JSON.stringify({ matches: records }, null, 2)}\n`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function writeSharedMatch(week, baseline, replacement) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { sha, records } = await readSharedResults(editorToken);
    const current = records.find(record => record.week === week);
    if (JSON.stringify(current) === JSON.stringify(replacement)) return records;
    if (JSON.stringify(current) !== JSON.stringify(baseline)) {
      throw Object.assign(new Error('Gameweek has changed'), { changed: true });
    }
    const updated = records.filter(record => record.week !== week);
    if (replacement) updated.push(replacement);
    updated.sort((first, second) => second.week - first.week);
    try {
      await githubRequest(resultsEndpoint, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${editorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: resultsBranch,
          sha,
          message: `${replacement ? 'Save' : 'Delete'} Expected Toulouse gameweek ${week}`,
          content: encodeResults(updated)
        })
      });
      return updated;
    } catch (error) {
      if (error.status !== 409 || attempt > 0) throw error;
    }
  }
}

function playerLabel(player) {
  const identity = element('div', undefined, 'player');
  identity.textContent = player;
  if (player === 'Zach') identity.append(element('span', 'GK', 'keeper-tag'));
  return identity;
}

function renderSquad(stats) {
  const rows = document.createDocumentFragment();
  for (const player of players) {
    const row = element('tr');
    const heading = element('th');
    heading.scope = 'row';
    heading.append(playerLabel(player));
    row.append(heading);
    row.insertCell().textContent = stats.get(player).goals;
    row.insertCell().textContent = stats.get(player).assists;
    rows.append(row);
  }
  document.querySelector('#players').replaceChildren(rows);
}

function scoreLine(match) {
  return `Expected Toulouse ${match.team}–${match.opponent} ${match.opponentName}`;
}

function renderHistory(container, records, editable = false) {
  const cards = document.createDocumentFragment();
  for (const match of records) {
    const card = element('article', undefined, 'match-card');
    const top = element('div', undefined, 'match-card-top');
    const title = element('div');
    const actions = element('div', undefined, 'match-card-actions');
    const score = element('p', undefined, 'match-score');
    score.append('Expected Toulouse ', element('strong', `${match.team}–${match.opponent}`), ` ${match.opponentName}`);
    title.append(element('h3', `Gameweek ${match.week}`), score);
    top.append(title);
    if (editable) {
      const edit = element('button', 'Edit', 'secondary');
      edit.type = 'button';
      edit.setAttribute('aria-label', `Edit gameweek ${match.week}`);
      edit.dataset.week = match.week;
      actions.append(edit);
    }
    const remove = element('button', 'Delete', 'secondary remove-match');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete gameweek ${match.week}${editable ? '' : ' from this browser'}`);
    remove.addEventListener('click', () => confirmDelete(match, !editable));
    actions.append(remove);
    top.append(actions);
    card.append(top);

    if (match.goals.length) {
      const details = element('details');
      details.append(element('summary', 'Goals and assists'));
      const goals = element('ol');
      for (const { scorer, assist } of match.goals) {
        const name = scorer === uncredited ? 'Uncredited goal' : scorer;
        const item = element('li', name);
        if (assist) item.append(element('span', `Assisted by ${assist}`));
        goals.append(item);
      }
      details.append(goals);
      card.append(details);
    }
    cards.append(card);
  }
  container.replaceChildren(cards);
}

function renderLeader(stats, metric, id, unit) {
  const best = Math.max(...Array.from(stats.values(), player => player[metric]));
  const leaders = best > 0 ? players.filter(player => stats.get(player)[metric] === best) : [];
  document.querySelector(`#${id}`).textContent = leaders.length ? leaders.join(' / ') : `No ${metric} yet`;
  document.querySelector(`#${id}-count`).textContent = leaders.length
    ? `${best} ${unit}${best === 1 ? '' : 's'}${leaders.length > 1 ? ' each' : ''}`
    : '';
}

function render() {
  const stats = new Map(players.map(player => [player, { goals: 0, assists: 0 }]));
  const keeperMatches = [];
  let goals = 0;
  for (const match of matches) {
    goals += match.team;
    if (match.team > 0 && match.opponent === 0) keeperMatches.push(match);
    for (const goal of match.goals) {
      if (stats.has(goal.scorer)) stats.get(goal.scorer).goals += 1;
      if (goal.assist) stats.get(goal.assist).assists += 1;
    }
  }
  document.querySelector('#team-goals').textContent = goals;
  document.querySelector('#team-clean-sheets').textContent = keeperMatches.length;
  renderLeader(stats, 'goals', 'top-scorer', 'goal');
  renderLeader(stats, 'assists', 'top-assister', 'assist');
  document.querySelector('#keeper-counter').textContent = keeperMatches.length;
  const list = document.querySelector('#keeper-matches');
  list.replaceChildren(...keeperMatches.map(match => element('li', `Gameweek ${match.week} · ${scoreLine(match)}`)));
  list.hidden = keeperMatches.length === 0;
  renderSquad(stats);
  renderHistory(history, matches, true);
  emptyLog.hidden = matches.length > 0 && !loadFailed;
  emptyLog.textContent = loadFailed ? 'Could not load the latest shared results. Try Refresh results.' : 'No shared matches recorded yet.';
}

function setFeedback(message) {
  feedback.textContent = message;
  feedback.hidden = message === '';
}

function setHistoryFeedback(message) {
  historyFeedback.textContent = message;
  historyFeedback.hidden = message === '';
}

function renderLocalHistory() {
  const previous = readPreviousMatches();
  document.querySelector('#local-history').hidden = previous.length === 0;
  renderHistory(document.querySelector('#local-results'), previous);
}

function showScoreForm(moveFocus = false) {
  scoreForm.hidden = false;
  goalsForm.hidden = true;
  if (moveFocus) scoreHeading.focus();
}

function loadWeek(week) {
  const existing = matches.find(match => match.week === week);
  loadedWeek = week;
  weekInput.value = week;
  teamInput.value = existing?.team ?? '';
  opponentInput.value = existing?.opponent ?? '';
  opponentNameInput.value = existing?.opponentName ?? '';
  scoreHeading.textContent = existing ? `Edit gameweek ${week}` : 'Record a match';
  draft = { week, baseline: existing, goals: existing?.goals ?? [] };
  setFeedback('');
  showScoreForm();
}

function nextWeek() {
  if (matches.length === 0) return 1;
  const highest = matches[0].week;
  if (highest < 999) return highest + 1;
  const saved = new Set(matches.map(match => match.week));
  for (let week = 1; week < 999; week += 1) {
    if (!saved.has(week)) return week;
  }
  return highest;
}

function makeOption(label, value = label) {
  const option = element('option', label);
  option.value = value;
  return option;
}

function fillAssists(select, scorer, selected) {
  select.replaceChildren(makeOption('No assist', ''));
  if (players.includes(scorer)) {
    select.append(...players.filter(player => player !== scorer).map(player => makeOption(player)));
  }
  select.disabled = !players.includes(scorer);
  select.value = Array.from(select.options).some(option => option.value === selected) ? selected : '';
}

function makeGoalFields(index, goal) {
  const group = element('fieldset', undefined, 'goal-row');
  group.append(element('legend', `Goal ${index + 1}`));
  const scorerLabel = element('label', 'Scorer');
  const assistLabel = element('label', 'Assist');
  const scorer = element('select', undefined, 'scorer');
  const assist = element('select', undefined, 'assist');
  scorer.setAttribute('aria-label', `Goal ${index + 1} scorer`);
  assist.setAttribute('aria-label', `Goal ${index + 1} assist`);
  scorer.required = true;
  scorer.append(makeOption('Select scorer', ''), ...players.map(player => makeOption(player)), makeOption('Uncredited goal', uncredited));
  scorer.value = goal?.scorer ?? '';
  fillAssists(assist, scorer.value, goal?.assist ?? '');
  scorer.addEventListener('change', () => fillAssists(assist, scorer.value, assist.value));
  scorerLabel.append(scorer);
  assistLabel.append(assist);
  group.append(scorerLabel, assistLabel);
  return group;
}

function draftGoals() {
  return Array.from(goalFields.children, group => ({
    scorer: group.querySelector('.scorer').value,
    assist: group.querySelector('.assist').value
  }));
}

weekInput.addEventListener('input', () => {
  const week = weekInput.valueAsNumber;
  if (inRange(week, 1, 999) && week !== loadedWeek) loadWeek(week);
});

scoreForm.addEventListener('submit', event => {
  event.preventDefault();
  const week = weekInput.valueAsNumber;
  const team = teamInput.valueAsNumber;
  const opponent = opponentInput.valueAsNumber;
  const opponentName = opponentNameInput.value.trim();
  if (!inRange(week, 1, 999) || !inRange(team, 0, 99) || !inRange(opponent, 0, 99)) return;
  if (!opponentName) {
    setFeedback('Enter the opponent’s name.');
    opponentNameInput.focus();
    return;
  }
  const existing = matches.find(match => match.week === week);
  const goals = draft?.week === week ? draft.goals : existing?.goals ?? [];
  draft = { week, team, opponent, opponentName, goals, baseline: draft?.week === week ? draft.baseline : existing };
  goalFields.replaceChildren(...Array.from({ length: team }, (_, index) => makeGoalFields(index, goals[index])));
  document.querySelector('#match-score').textContent = `Gameweek ${week} · ${scoreLine(draft)}`;
  document.querySelector('#no-goals').hidden = team > 0;
  detailsHeading.textContent = team > 0 ? 'Assign goals' : 'Confirm match';
  setFeedback('');
  scoreForm.hidden = true;
  goalsForm.hidden = false;
  detailsHeading.focus();
});

document.querySelector('#change-score').addEventListener('click', () => {
  if (saving) return;
  draft.goals = draftGoals();
  setFeedback('');
  showScoreForm(true);
});

async function updateSharedHistory(week, baseline, replacement, report) {
  if (saving) return false;
  const action = replacement ? 'save' : 'delete';
  saving = true;
  resultsVersion += 1;
  saveButton.disabled = true;
  report(replacement ? 'Saving to GitHub…' : 'Deleting from shared history…');
  try {
    matches = await writeSharedMatch(week, baseline, replacement);
    loadFailed = false;
    render();
    return true;
  } catch (error) {
    if (error.changed) {
      report('This gameweek changed. Refresh results and check the latest score before trying again.');
    } else if ([401, 403, 404].includes(error.status)) {
      editorToken = '';
      report(`GitHub did not allow this ${action === 'save' ? 'save' : 'deletion'}. Check that your token has Contents: Read and write for ${repositoryName}, then try again.`);
    } else {
      report(`Could not ${action} the match on GitHub. Try again.`);
    }
    return false;
  } finally {
    saving = false;
    saveButton.disabled = false;
  }
}

async function publishMatch() {
  const { week, team, opponent, opponentName, baseline } = draft;
  const match = { week, team, opponent, opponentName, goals: draftGoals() };
  if (!validMatch(match) || !await updateSharedHistory(week, baseline, match, setFeedback)) return;
  loadWeek(nextWeek());
  setFeedback(`Gameweek ${week} saved to the shared history.`);
  scoreHeading.focus();
}

function withEditorAccess(action, request) {
  if (saving) return;
  if (editorToken) {
    void request();
    return;
  }
  editorAction = request;
  document.querySelector('#editor-title').textContent = `Connect GitHub to ${action}`;
  document.querySelector('#editor-repository').textContent = `only the ${repositoryName} repository`;
  document.querySelector('#connect-editor').textContent = `Connect and ${action} match`;
  editorDialog.showModal();
}

goalsForm.addEventListener('submit', event => {
  event.preventDefault();
  withEditorAccess('save', publishMatch);
});

document.querySelector('#editor-form').addEventListener('submit', event => {
  event.preventDefault();
  editorToken = editorTokenInput.value.trim();
  const request = editorAction;
  editorDialog.close();
  if (request) void request();
});
editorDialog.addEventListener('close', () => {
  editorTokenInput.value = '';
  editorAction = undefined;
});
document.querySelector('#cancel-editor').addEventListener('click', () => editorDialog.close());

function confirmDelete(match, local) {
  if (saving) return;
  setHistoryFeedback('');
  deleteTarget = { match, local };
  document.querySelector('#delete-score').textContent = `Gameweek ${match.week} · ${scoreLine(match)}`;
  document.querySelector('#delete-scope').textContent = local
    ? 'This removes the result from this browser.'
    : 'This removes the result from the shared history and recalculates the stats.';
  deleteDialog.showModal();
}

async function deleteSharedMatch(match) {
  if (!await updateSharedHistory(match.week, match, undefined, setHistoryFeedback)) return;
  if (draft?.week === match.week) loadWeek(nextWeek());
  setHistoryFeedback(`Gameweek ${match.week} removed from the shared history.`);
  historyHeading.focus();
}

function deleteLocalMatch(match) {
  try {
    localStorage.removeItem(previousMatchPrefix + match.week);
    renderLocalHistory();
    setHistoryFeedback(`Gameweek ${match.week} removed from this browser.`);
    historyHeading.focus();
  } catch {
    setHistoryFeedback('Could not remove the result from this browser. Try again.');
  }
}

document.querySelector('#cancel-delete').addEventListener('click', () => deleteDialog.close());
document.querySelector('#confirm-delete').addEventListener('click', () => {
  const { match, local } = deleteTarget;
  deleteDialog.close();
  if (local) deleteLocalMatch(match);
  else withEditorAccess('delete', () => deleteSharedMatch(match));
});
deleteDialog.addEventListener('close', () => { deleteTarget = undefined; });

const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
function selectTab(selectedTab) {
  for (const tab of tabs) {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const targets = {
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1
    };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    const selectedTab = tabs[targets[event.key]];
    selectTab(selectedTab);
    selectedTab.focus();
  });
}

history.addEventListener('click', event => {
  const edit = event.target.closest('button[data-week]');
  if (!edit || saving) return;
  loadWeek(Number(edit.dataset.week));
  scoreHeading.focus();
});

async function refreshResults() {
  if (saving || refreshButton.disabled) return;
  refreshButton.disabled = true;
  const version = resultsVersion;
  lastRefresh = Date.now();
  try {
    const { records } = await readSharedResults();
    if (version !== resultsVersion) return;
    matches = records;
    loadFailed = false;
    if (!draft) loadWeek(nextWeek());
  } catch {
    if (version !== resultsVersion) return;
    loadFailed = true;
  } finally {
    refreshButton.disabled = false;
    if (version === resultsVersion) render();
  }
}

refreshButton.addEventListener('click', () => void refreshResults());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - lastRefresh >= 30000) void refreshResults();
});
renderLocalHistory();
renderSquad(new Map(players.map(player => [player, { goals: 0, assists: 0 }])));
void refreshResults();
