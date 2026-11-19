'use strict';

const players = ['Zach', 'Boyce', 'Kiran', 'Ben 2', 'Billy', 'Potter', 'Will', 'James', 'Luca', 'Matty'];
const matchPrefix = 'expected-toulouse:matches:v1:';
const uncredited = 'uncredited';
const scoreForm = document.querySelector('#score-form');
const goalsForm = document.querySelector('#goals-form');
const scoreHeading = document.querySelector('#score-heading');
const detailsHeading = document.querySelector('#details-heading');
const weekInput = document.querySelector('#gameweek');
const teamInput = document.querySelector('#team-score');
const opponentInput = document.querySelector('#opponent-score');
const feedback = document.querySelector('#match-feedback');
const goalFields = document.querySelector('#goal-fields');
const history = document.querySelector('#week-log');
let matches = [];
let draft;
let loadedWeek;
let storageUnavailable = false;

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

function validMatch(match, key) {
  return match && inRange(match.week, 1, 999) && key === matchPrefix + match.week
    && inRange(match.team, 0, 99) && inRange(match.opponent, 0, 99)
    && Array.isArray(match.goals) && match.goals.length === match.team && match.goals.every(validGoal);
}

function readMatches() {
  const records = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(matchPrefix)) continue;
      try {
        const match = JSON.parse(localStorage.getItem(key));
        if (validMatch(match, key)) records.push(match);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }
  } catch {
    storageUnavailable = true;
    document.querySelector('#save-note').textContent = 'Browser storage is unavailable. Matches cannot be saved.';
    return matches;
  }
  return records.sort((first, second) => second.week - first.week);
}

function playerLabel(player) {
  const identity = element('div', undefined, 'player');
  const keeper = player === 'Zach';
  const initials = element('span', player === 'Ben 2' ? 'B2' : player[0], keeper ? 'initials is-keeper' : 'initials');
  initials.setAttribute('aria-hidden', 'true');
  const name = element('div', player);
  if (keeper) name.append(' ', element('span', 'GK', 'keeper-tag'));
  identity.append(initials, name);
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
  return `Expected Toulouse ${match.team}–${match.opponent} Opponent`;
}

function renderHistory() {
  const cards = document.createDocumentFragment();
  for (const match of matches) {
    const card = element('article', undefined, 'match-card');
    const top = element('div', undefined, 'match-card-top');
    const title = element('div');
    title.append(element('h3', `Gameweek ${match.week}`), element('p', scoreLine(match), 'match-score'));
    const edit = element('button', 'Edit', 'secondary');
    edit.type = 'button';
    edit.setAttribute('aria-label', `Edit gameweek ${match.week}`);
    edit.dataset.week = match.week;
    top.append(title, edit);
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
  history.replaceChildren(cards);
  document.querySelector('#empty-log').hidden = matches.length > 0;
}

function render() {
  const stats = new Map(players.map(player => [player, { goals: 0, assists: 0 }]));
  const keeperMatches = [];
  let goals = 0;
  let assists = 0;
  for (const match of matches) {
    goals += match.team;
    if (match.team > 0 && match.opponent === 0) keeperMatches.push(match);
    for (const goal of match.goals) {
      if (stats.has(goal.scorer)) stats.get(goal.scorer).goals += 1;
      if (goal.assist) {
        stats.get(goal.assist).assists += 1;
        assists += 1;
      }
    }
  }
  document.querySelector('#team-goals').textContent = goals;
  document.querySelector('#team-assists').textContent = assists;
  document.querySelector('#team-clean-sheets').textContent = keeperMatches.length;
  document.querySelector('#keeper-counter').textContent = keeperMatches.length;
  const list = document.querySelector('#keeper-matches');
  list.replaceChildren(...keeperMatches.map(match => element('li', `Gameweek ${match.week} · ${scoreLine(match)}`)));
  list.hidden = keeperMatches.length === 0;
  renderSquad(stats);
  renderHistory();
}

function setFeedback(message) {
  feedback.textContent = message;
  feedback.hidden = message === '';
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
  if (!inRange(week, 1, 999) || !inRange(team, 0, 99) || !inRange(opponent, 0, 99)) return;
  const existing = matches.find(match => match.week === week);
  const goals = draft.week === week ? draft.goals : existing?.goals ?? [];
  draft = { week, team, opponent, goals, baseline: draft.week === week ? draft.baseline : existing };
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
  draft.goals = draftGoals();
  setFeedback('');
  showScoreForm(true);
});

goalsForm.addEventListener('submit', event => {
  event.preventDefault();
  const { week, team, opponent, baseline } = draft;
  const match = { week, team, opponent, goals: draftGoals() };
  const key = matchPrefix + week;
  if (!validMatch(match, key)) return;
  try {
    if (storageUnavailable) throw new Error('Storage is unavailable');
    const current = JSON.parse(localStorage.getItem(key));
    if (validMatch(current, key) && JSON.stringify(current) !== JSON.stringify(baseline)) {
      setFeedback('This gameweek changed in another tab. Open it from Match history to edit the latest result.');
      return;
    }
    localStorage.setItem(key, JSON.stringify(match));
  } catch {
    setFeedback('Could not save the match. Check that browser storage is available and try again.');
    return;
  }

  matches = readMatches();
  render();
  loadWeek(nextWeek());
  setFeedback(`Gameweek ${week} saved.`);
  scoreHeading.focus();
});

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
  if (!edit) return;
  loadWeek(Number(edit.dataset.week));
  scoreHeading.focus();
});

window.addEventListener('storage', event => {
  if (event.key !== null && !event.key.startsWith(matchPrefix)) return;
  matches = readMatches();
  render();
});

matches = readMatches();
render();
loadWeek(nextWeek());
