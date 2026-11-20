'use strict';

const players = ['Zach', 'Boyce', 'Kiran', 'Ben 2', 'Billy', 'Potter', 'Will', 'James', 'Luca', 'Matty'];
const goalkeeper = 'Zach';
// Photo crops store the horizontal center, vertical center and rendered width as percentages.
const playerProfiles = {
  Zach: {
    number: 13,
    photo: './photos/zach.webp',
    photoCrop: [37.78, 20.65, 355.26],
    position: 'Goalkeeper',
    bio: 'Wizard in goal, excellent shot stopping, questionable with his feet. Has a bit of a temper.',
    similarPlayer: 'Jordan Pickford'
  },
  Boyce: {
    number: 22,
    position: 'Defender',
    photo: './photos/boyce.webp',
    photoCrop: [49.26, 44.5, 270],
    bio: 'General at the back, commanding the shape of the defence, can play with the ball at his feet.',
    similarPlayer: 'John Stones'
  },
  Kiran: {
    number: 6,
    position: 'Midfielder',
    photo: './photos/kiran.webp',
    photoCrop: [64.8, 30.83, 262.14],
    bio: 'Good on the ball, often shoots wide, can find a pass.',
    similarPlayer: 'Jordan Henderson'
  },
  'Ben 1': {
    number: 9,
    position: 'Forward',
    photo: './photos/ben-1.webp',
    photoCrop: [57.4, 32, 255],
    bio: 'Giraffe on ice-skates',
    similarPlayer: 'Ellis Simms'
  },
  'Ben 2': {
    number: 8,
    position: 'Midfielder',
    photo: './photos/ben-2.webp',
    photoCrop: [78, 46.4, 230],
    bio: 'Classy footballer. Cool, calm and collected.',
    similarPlayer: 'Michael Carrick'
  },
  Billy: { number: 2, position: 'Defender', photo: './photos/billy.webp', photoCrop: [48.89, 40.37, 207.69], bio: 'Classic squad player', similarPlayer: 'Phil Neville' },
  Potter: {
    number: 20,
    position: 'Midfielder',
    photo: './photos/potter.webp',
    photoCrop: [47.59, 39.3, 154.29],
    bio: 'Solid player, low energy at points, decent on the ball.',
    similarPlayer: 'Mark Noble'
  },
  Will: {
    number: 67,
    position: 'Forward',
    photo: './photos/will.webp',
    photoCrop: [53.98, 21.64, 222.12],
    bio: 'Hunger, desire and high energy. Questionable on the ball',
    similarPlayer: 'Joe Allen'
  },
  James: { number: 53, position: 'Forward', photo: './photos/james.webp', photoCrop: [50.19, 32.1, 284.21], bio: 'Lack of commitment, always partying.', similarPlayer: 'Joey Barton' },
  Luca: {
    number: 7,
    position: 'Midfielder',
    photo: './photos/luca.webp',
    photoCrop: [49.81, 34.97, 257.14],
    bio: 'Best signing in the clubs history, foot blessed by God.',
    similarPlayer: 'Rayan Cherki'
  },
  Matty: { number: 3, position: 'Defender', photo: './photos/matty.webp', photoCrop: [46.14, 23.27, 176], bio: 'Hunk, ultra slow defender', similarPlayer: 'Per Mertesacker' }
};
const positionOrder = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
const squadDisplayOrder = [...players].sort((first, second) => {
  const a = playerProfiles[first];
  const b = playerProfiles[second];
  const positionDifference = (positionOrder[a.position] ?? 4) - (positionOrder[b.position] ?? 4);
  return positionDifference || (a.number ?? Infinity) - (b.number ?? Infinity);
});
const previousMatchPrefix = 'expected-toulouse:matches:v1:';
const editorTokenKey = 'expected-toulouse:editor-token:v1';
const resultsEndpoint = 'https://api.github.com/repos/kiranfinamordamania/expected-toulouse/contents/matches.json';
const injuriesEndpoint = 'https://api.github.com/repos/kiranfinamordamania/expected-toulouse/contents/injuries.json';
const resultsBranch = 'match-data';
const uncredited = 'uncredited';
const maxCommentLength = 500;
const commentsHashPrefix = '#manager-comments=';
const termFilter = document.querySelector('#term-filter');
const matchTermInput = document.querySelector('#match-term');
const competitionInput = document.querySelector('#match-competition');
const entryGate = document.querySelector('#entry-gate');
const entryForms = document.querySelector('#entry-forms');
const unlockEntry = document.querySelector('#unlock-entry');
const forgetTokenButton = document.querySelector('#forget-token');
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
const lineupOptions = document.querySelector('#lineup-options');
const injuryForm = document.querySelector('#injury-form');
const injuryPlayer = document.querySelector('#injury-player');
const injuryType = document.querySelector('#injury-type');
const injuryReturn = document.querySelector('#injury-return');
const unlockInjuries = document.querySelector('#unlock-injuries');
const matchComments = document.querySelector('#match-comments');
const commentFields = document.querySelector('#comment-fields');
const profileDialog = document.querySelector('#profile-dialog');
const history = document.querySelector('#week-log');
const historyToggle = document.querySelector('#toggle-history');
const historyHeading = document.querySelector('#history-heading');
const historyFeedback = document.querySelector('#history-feedback');
const emptyLog = document.querySelector('#empty-log');
const refreshButton = document.querySelector('#refresh-results');
const saveButton = document.querySelector('#save-match');
const editorDialog = document.querySelector('#editor-dialog');
const editorTokenInput = document.querySelector('#editor-token');
const editorFeedback = document.querySelector('#editor-feedback');
const connectEditor = document.querySelector('#connect-editor');
const deleteDialog = document.querySelector('#delete-dialog');
let matches = [];
let injuries = [];
let injuriesLoaded = false;
let injuriesLoadFailed = false;
let injuriesLoading = false;
let injurySaving = false;
let injuriesVersion = 0;
let injuryDraftBaseline;
let squadStats = emptySquadStats();
let openProfile;
let commentsPlayer;
let draft;
let activeTerm;
let historyExpanded = false;
let editorToken = '';
let editorAction;
let connecting = false;
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

function matchTerm(match) { return match.term ?? 1; }
function termLabel(term) { return `Term ${term}`; }
function matchCompetition(match) { return match.competition ?? 'league'; }
function matchKey(match) { return `${matchTerm(match)}:${matchCompetition(match)}:${match.week}`; }
function matchLabel(match) { return `${matchCompetition(match) === 'cup' ? 'Cup game' : 'Gameweek'} ${match.week}`; }
function matchTermLabel(match) { return `${matchLabel(match)} · ${termLabel(matchTerm(match))}`; }

function sortMatches(records) {
  return records.sort((first, second) => matchTerm(second) - matchTerm(first)
    || second.week - first.week || matchCompetition(second).localeCompare(matchCompetition(first)));
}

function validGoal(goal) {
  if (!goal) return false;
  if (goal.scorer === uncredited) return goal.assist === '';
  return players.includes(goal.scorer)
    && (goal.assist === '' || (players.includes(goal.assist) && goal.assist !== goal.scorer));
}

function validManagerComments(comments) {
  return comments === undefined || (comments !== null && typeof comments === 'object' && !Array.isArray(comments)
    && Object.entries(comments).every(([player, comment]) => players.includes(player)
      && typeof comment === 'string' && comment.trim() && comment.length <= maxCommentLength));
}

function validMatch(match) {
  return match && inRange(match.week, 1, 999)
    && (match.term === undefined || inRange(match.term, 1, 2))
    && (match.competition === undefined || ['league', 'cup'].includes(match.competition))
    && inRange(match.team, 0, 99) && inRange(match.opponent, 0, 99)
    && typeof match.opponentName === 'string' && match.opponentName.trim().length > 0 && match.opponentName.length <= 100
    && Array.isArray(match.goals) && match.goals.length === match.team && match.goals.every(validGoal)
    && validManagerComments(match.managerComments)
    && (match.lineup === undefined || (Array.isArray(match.lineup) && match.lineup.length > 0
      && match.lineup.every(player => players.includes(player)) && new Set(match.lineup).size === match.lineup.length));
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
    || !data.matches.every(validMatch) || new Set(data.matches.map(matchKey)).size !== data.matches.length) {
    throw new Error('Shared match history is invalid');
  }
  return { sha: file.sha, records: sortMatches(data.matches) };
}

function encodeSharedData(data) {
  const bytes = new TextEncoder().encode(`${JSON.stringify(data, null, 2)}\n`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function writeSharedMatch(match, baseline, replacement) {
  const key = matchKey(match);
  const token = editorToken;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { sha, records } = await readSharedResults(token);
    if (editorToken !== token) throw new Error('Editing is locked');
    const current = records.find(record => matchKey(record) === key);
    if (JSON.stringify(current) === JSON.stringify(replacement)) return records;
    if (JSON.stringify(current) !== JSON.stringify(baseline)) {
      throw Object.assign(new Error('Match has changed'), { changed: true });
    }
    const updated = records.filter(record => matchKey(record) !== key);
    if (replacement) updated.push(replacement);
    sortMatches(updated);
    try {
      await githubRequest(resultsEndpoint, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: resultsBranch,
          sha,
          message: `${replacement ? 'Save' : 'Delete'} ${matchTermLabel(match).toLowerCase()}`,
          content: encodeSharedData({ matches: updated })
        })
      });
      return updated;
    } catch (error) {
      if (error.status !== 409 || attempt > 0) throw error;
    }
  }
}

function validReturnDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) return false;
  const date = value.length === 7 ? `${value}-01` : value;
  const timestamp = Date.parse(date);
  return inRange(Number(date.slice(0, 4)), 1900, 9999) && Number.isFinite(timestamp)
    && new Date(timestamp).toISOString().slice(0, 10) === date;
}

async function readSharedInjuries(token = '') {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const file = await githubRequest(`${injuriesEndpoint}?ref=${resultsBranch}`, { headers });
  if (file.encoding !== 'base64' || typeof file.sha !== 'string') throw new Error('Invalid injuries file');
  const bytes = Uint8Array.from(atob(file.content), char => char.charCodeAt(0));
  const { injuries: records } = JSON.parse(new TextDecoder().decode(bytes));
  if (!Array.isArray(records) || !records.every(record => record && players.includes(record.player)
    && typeof record.type === 'string' && record.type.length <= 160 && validReturnDate(record.returnDate))
    || new Set(records.map(record => record.player)).size !== records.length) {
    throw new Error('Invalid injuries file');
  }
  return { sha: file.sha, records };
}

async function writeSharedInjury(player, baseline, replacement, token) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { sha, records } = await readSharedInjuries(token);
    if (editorToken !== token) throw new Error('Editing is locked');
    const current = records.find(record => record.player === player);
    if (JSON.stringify(current) === JSON.stringify(replacement)) return records;
    if (JSON.stringify(current) !== JSON.stringify(baseline)) {
      throw Object.assign(new Error('Injury has changed'), { latestInjuries: records });
    }
    const updated = records.filter(record => record.player !== player);
    if (replacement) updated.push(replacement);
    try {
      await githubRequest(injuriesEndpoint, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: resultsBranch, sha, message: 'Update shared injury list',
          content: encodeSharedData({ injuries: updated }) })
      });
      return updated;
    } catch (error) {
      if (error.status !== 409 || attempt > 0) throw error;
    }
  }
}

function injuryReturnLabel(returnDate) {
  const approximate = returnDate.length === 7;
  const date = new Date(approximate ? `${returnDate}-01` : returnDate);
  const format = approximate ? { month: 'long', year: 'numeric' } : { dateStyle: 'medium' };
  const label = date.toLocaleDateString('en-GB', { ...format, timeZone: 'UTC' });
  return approximate ? `mid-${label}` : label;
}

function showPlayerProfile(player) {
  openProfile = player;
  renderProfile(player);
  profileDialog.showModal();
}

function playerLabel(player, number, injury) {
  const identity = element('div', undefined, 'player');
  const profile = element('button', player, 'profile-link');
  profile.type = 'button';
  profile.setAttribute('aria-haspopup', 'dialog');
  profile.addEventListener('click', () => showPlayerProfile(player));
  identity.append(profile);
  if (number != null) identity.append(element('span', `#${number}`, 'squad-number'));
  if (injury) {
    const cross = element('span', '✚', 'injury-cross');
    cross.setAttribute('aria-hidden', 'true');
    identity.append(cross);
  }
  return identity;
}

function emptySquadStats() {
  return new Map(players.map(player => [player, {
    played: 0, goals: 0, assists: 0, unknown: 0, cleanSheets: player === goalkeeper ? 0 : null
  }]));
}

function renderProfile(player) {
  const { number, position, photo, photoCrop, bio, similarPlayer } = playerProfiles[player] ?? {};
  const injury = injuries.find(record => record.player === player);
  const stats = squadStats.get(player);
  const image = document.querySelector('#profile-photo');
  const initial = document.querySelector('#profile-initial');
  const [centerX, centerY, width] = photoCrop ?? [50, 50, 100];
  image.style.setProperty('--photo-center-x', `-${centerX}%`);
  image.style.setProperty('--photo-center-y', `-${centerY}%`);
  image.style.setProperty('--photo-width', `${width}%`);
  if (photo) {
    image.src = photo;
    image.alt = `${player}’s profile photo`;
  } else {
    image.removeAttribute('src');
    image.alt = '';
  }
  image.hidden = !photo;
  initial.hidden = Boolean(photo);
  initial.textContent = player.startsWith('Ben ') ? `B${player.slice(4)}` : player[0];

  document.querySelector('#profile-title').textContent = player;
  const shirtNumber = document.querySelector('#profile-shirt-number');
  shirtNumber.textContent = number == null ? '' : `Shirt number ${number}`;
  shirtNumber.hidden = number == null;
  document.querySelector('.profile-numbers').hidden = !stats;
  if (stats) {
    document.querySelector('#profile-played').textContent = stats.played;
    document.querySelector('#profile-goals').textContent = stats.goals;
    document.querySelector('#profile-assists').textContent = stats.assists;
  }
  document.querySelector('#profile-position').textContent = position ?? 'Not set';
  const injuryStatus = document.querySelector('#profile-injury');
  injuryStatus.parentElement.hidden = !stats;
  injuryStatus.textContent = injury ? `Expected back ${injuryReturnLabel(injury.returnDate)}` : 'No injury listed';
  document.querySelector('#profile-bio').textContent = bio ?? 'Bio coming later.';
  document.querySelector('#profile-similar-player').textContent = similarPlayer ?? '';
  document.querySelector('#profile-comparison').hidden = !similarPlayer;
  const comments = document.querySelector('#profile-comments');
  comments.parentElement.hidden = !stats;
  if (stats) comments.href = commentsHashPrefix + encodeURIComponent(player);

  const unknown = stats?.unknown ?? 0;
  const note = document.querySelector('#profile-attendance');
  note.hidden = unknown === 0;
  note.textContent = unknown === 1 ? 'Attendance is unknown for 1 match.' : `Attendance is unknown for ${unknown} matches.`;
}

document.querySelector('#ben-forever-profile').addEventListener('click', () => showPlayerProfile('Ben 1'));
document.querySelector('#close-profile').addEventListener('click', () => profileDialog.close());
profileDialog.addEventListener('close', () => { openProfile = undefined; });

function renderManagerComments() {
  const records = matches.filter(match => match.managerComments?.[commentsPlayer]);
  const history = document.querySelector('#player-comment-history');
  const entries = document.createDocumentFragment();
  let term;
  for (const match of records) {
    const currentTerm = matchTerm(match);
    if (currentTerm !== term) {
      entries.append(element('h3', termLabel(currentTerm)));
      term = currentTerm;
    }
    const entry = element('article', undefined, 'manager-comment');
    entry.append(element('h4', `${matchLabel(match)} · vs ${match.opponentName}`),
      element('p', match.managerComments[commentsPlayer]));
    entries.append(entry);
  }
  history.replaceChildren(entries);
  const status = document.querySelector('#player-comments-status');
  status.textContent = loadFailed ? 'Could not load the latest shared comments.'
    : records.length ? ''
      : (!lastRefresh || refreshButton.disabled) ? 'Loading shared comments…' : 'No manager’s comments yet.';
  status.hidden = !status.textContent;
}

function showManagerComments(player) {
  commentsPlayer = player;
  document.querySelector('#squad-overview').hidden = Boolean(player);
  document.querySelector('#player-comments').hidden = !player;
  if (!player) return;
  const heading = document.querySelector('#player-comments-heading');
  heading.textContent = `Manager’s comments for ${player}`;
  renderManagerComments();
  heading.focus();
}

function renderInjuries() {
  const rows = document.createDocumentFragment();
  for (const player of squadDisplayOrder) {
    const injury = injuries.find(record => record.player === player);
    if (!injury) continue;
    const row = element('tr');
    const name = element('th', player);
    name.scope = 'row';
    const until = element('time', injuryReturnLabel(injury.returnDate));
    until.dateTime = injury.returnDate;
    row.append(name);
    row.insertCell().textContent = injury.type || '—';
    row.insertCell().append(until);
    if (editorToken) {
      const remove = element('button', 'Remove', 'secondary remove-match');
      remove.type = 'button';
      remove.disabled = injurySaving;
      remove.setAttribute('aria-label', `Remove injury for ${player}`);
      remove.addEventListener('click', () => {
        if (window.confirm(`Remove the injury for ${player}?`)) void updateInjury(player, injury);
      });
      row.insertCell().append(remove);
    }
    rows.append(row);
  }
  const list = document.querySelector('#injured-players');
  list.replaceChildren(rows);
  list.closest('table').hidden = injuries.length === 0;
  document.querySelector('#injury-actions').hidden = !editorToken;
  const empty = document.querySelector('#injury-empty');
  empty.hidden = injuries.length > 0 && !injuriesLoadFailed;
  empty.textContent = injuriesLoadFailed ? 'Could not load the latest injuries.'
    : injuriesLoaded ? 'No injuries listed.' : 'Loading injuries…';
}

function renderSquad(stats) {
  const rows = document.createDocumentFragment();
  for (const player of squadDisplayOrder) {
    const row = element('tr');
    const heading = element('th');
    heading.scope = 'row';
    const { position, number } = playerProfiles[player];
    const injury = injuries.find(record => record.player === player);
    heading.append(playerLabel(player, number, injury));
    if (injury) heading.append(element('span', `Expected back ${injuryReturnLabel(injury.returnDate)}`, 'player-injury-note'));
    row.append(heading);
    row.insertCell().textContent = position ?? '—';
    const { played, goals, assists, cleanSheets } = stats.get(player);
    row.insertCell().textContent = played;
    row.insertCell().textContent = goals;
    row.insertCell().textContent = assists;
    row.insertCell().textContent = cleanSheets ?? '';
    rows.append(row);
  }
  document.querySelector('#players').replaceChildren(rows);
}

function scoreLine(match) {
  return `Expected Toulouse ${match.team}–${match.opponent} ${match.opponentName}`;
}

function matchContributions(goals) {
  const scorers = new Map();
  const assisters = new Map();
  for (const { scorer, assist } of goals) {
    scorers.set(scorer, (scorers.get(scorer) ?? 0) + 1);
    if (assist) assisters.set(assist, (assisters.get(assist) ?? 0) + 1);
  }
  const summary = element('dl', undefined, 'match-contributions');
  for (const [label, counts, emptyText] of [['Goals', scorers, 'None'], ['Assists', assisters, 'None recorded']]) {
    const group = element('div');
    const value = element('dd');
    const entries = [...counts].sort(([first, firstCount], [second, secondCount]) =>
      secondCount - firstCount || first.localeCompare(second));
    if (entries.length) {
      const list = element('ul');
      for (const [player, count] of entries) {
        const name = player === uncredited ? 'Uncredited' : player;
        list.append(element('li', `${name} ×${count}`));
      }
      value.append(list);
    } else {
      value.append(element('span', emptyText, 'match-contributions-empty'));
    }
    group.append(element('dt', label), value);
    summary.append(group);
  }
  return summary;
}

function renderHistory(container, records, editable = false) {
  const cards = document.createDocumentFragment();
  for (const match of records) {
    const card = element('article', undefined, 'match-card');
    const top = element('div', undefined, 'match-card-top');
    const title = element('div');
    const actions = element('div', undefined, 'match-card-actions');
    title.className = 'result-summary';
    const score = element('strong', `${match.team}–${match.opponent}`, 'result-score');
    const outcome = match.team === match.opponent ? 'draw' : match.team > match.opponent ? 'win' : 'loss';
    score.dataset.outcome = outcome;
    score.setAttribute('aria-label', `${scoreLine(match)}, ${outcome}`);
    const details = element('div');
    details.append(element('h3', matchTermLabel(match)), element('p', `vs ${match.opponentName}`, 'result-opponent'));
    title.append(score, details);
    top.append(title);
    if (editable) {
      const edit = element('button', 'Edit', 'secondary');
      edit.type = 'button';
      edit.setAttribute('aria-label', `Edit ${matchTermLabel(match).toLowerCase()}`);
      edit.dataset.match = matchKey(match);
      actions.append(edit);
    }
    const remove = element('button', 'Delete', 'secondary remove-match');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete ${matchTermLabel(match).toLowerCase()}${editable ? '' : ' from this browser'}`);
    remove.addEventListener('click', () => confirmDelete(match, !editable));
    actions.append(remove);
    top.append(actions);
    card.append(top, matchContributions(match.goals));
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

function matchesForActiveTerm() {
  return activeTerm ? matches.filter(match => matchTerm(match) === activeTerm) : matches;
}

function renderMatchHistory(records) {
  renderHistory(history, historyExpanded ? records : records.slice(0, 3), true);
  historyToggle.hidden = records.length <= 3;
  historyToggle.setAttribute('aria-expanded', String(historyExpanded));
  historyToggle.textContent = historyExpanded ? 'Show latest 3 results' : 'Show all results';
}

historyToggle.addEventListener('click', () => {
  historyExpanded = !historyExpanded;
  renderMatchHistory(matchesForActiveTerm());
});

function render() {
  termFilter.value = activeTerm ?? '';
  const visibleMatches = matchesForActiveTerm();
  const stats = emptySquadStats();
  const keeper = stats.get(goalkeeper);
  let goals = 0;
  for (const match of visibleMatches) {
    const participants = new Set(match.lineup);
    goals += match.team;
    if (match.opponent === 0) keeper.cleanSheets += 1;
    for (const goal of match.goals) {
      if (stats.has(goal.scorer)) {
        stats.get(goal.scorer).goals += 1;
        participants.add(goal.scorer);
      }
      if (goal.assist) {
        stats.get(goal.assist).assists += 1;
        participants.add(goal.assist);
      }
    }
    for (const [player, totals] of stats) {
      if (participants.has(player)) totals.played += 1;
      else if (!match.lineup) totals.unknown += 1;
    }
  }
  squadStats = stats;
  document.querySelector('#team-goals').textContent = goals;
  document.querySelector('#team-clean-sheets').textContent = keeper.cleanSheets;
  renderLeader(stats, 'goals', 'top-scorer', 'goal');
  renderLeader(stats, 'assists', 'top-assister', 'assist');
  renderSquad(stats);
  if (profileDialog.open && openProfile) renderProfile(openProfile);
  if (commentsPlayer) renderManagerComments();
  renderMatchHistory(visibleMatches);
  emptyLog.hidden = visibleMatches.length > 0 && !loadFailed;
  emptyLog.textContent = loadFailed ? 'Could not load the latest shared results. Try Refresh results.'
    : activeTerm ? `No matches recorded for ${termLabel(activeTerm)} yet.` : 'No matches recorded yet.';
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

function loadMatch(identity) {
  const term = matchTerm(identity);
  const competition = matchCompetition(identity);
  const { week } = identity;
  const existing = matches.find(match => matchKey(match) === matchKey(identity));
  matchTermInput.value = term;
  competitionInput.value = competition;
  document.querySelector('#gameweek-label').textContent = competition === 'cup' ? 'Cup game number' : 'Gameweek';
  weekInput.value = week;
  teamInput.value = existing?.team ?? '';
  opponentInput.value = existing?.opponent ?? '';
  opponentNameInput.value = existing?.opponentName ?? '';
  scoreHeading.textContent = existing ? `Edit ${matchLabel(existing).toLowerCase()}` : 'Record a match';
  draft = { term, competition, week, baseline: existing, goals: existing?.goals ?? [], lineup: existing?.lineup ?? [],
    managerComments: existing?.managerComments ?? {} };
  matchComments.open = Boolean(Object.keys(draft.managerComments).length);
  setFeedback('');
  showScoreForm();
}

function nextMatch(term = activeTerm ?? matchTerm(matches[0] ?? {}), competition = 'league') {
  const saved = new Set(matches.filter(match => matchTerm(match) === term && matchCompetition(match) === competition)
    .map(match => match.week));
  let week = Math.max(0, ...saved) + 1;
  if (week > 999) {
    week = 1;
    while (week < 999 && saved.has(week)) week += 1;
  }
  return { term, competition, week };
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

function renderLineup(selected) {
  const options = players.map(player => {
    const label = element('label');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.value = player;
    checkbox.checked = selected.includes(player);
    label.append(checkbox, player);
    return label;
  });
  lineupOptions.replaceChildren(...options);
}

function draftLineup() {
  return Array.from(lineupOptions.querySelectorAll('input:checked'), input => input.value);
}

function renderCommentFields(comments) {
  const fields = squadDisplayOrder.map(player => {
    const field = element('label', player);
    const input = element('textarea');
    input.dataset.player = player;
    input.maxLength = maxCommentLength;
    input.rows = 2;
    input.value = comments[player] ?? '';
    field.append(input);
    return field;
  });
  commentFields.replaceChildren(...fields);
}

function draftManagerComments() {
  const comments = Array.from(commentFields.querySelectorAll('textarea'), input => [input.dataset.player, input.value.trim()]);
  return Object.fromEntries(comments.filter(([, comment]) => comment));
}

function readMatchIdentity() {
  return { term: Number(matchTermInput.value), competition: competitionInput.value, week: weekInput.valueAsNumber };
}

function reloadEntryIdentity() {
  const { term, competition } = readMatchIdentity();
  if (inRange(term, 1, 2)) loadMatch(nextMatch(term, competition));
}

matchTermInput.addEventListener('change', reloadEntryIdentity);
competitionInput.addEventListener('change', reloadEntryIdentity);
weekInput.addEventListener('input', () => {
  const identity = readMatchIdentity();
  if (inRange(identity.term, 1, 2) && inRange(identity.week, 1, 999)
    && (!draft || matchKey(identity) !== matchKey(draft))) loadMatch(identity);
});

termFilter.addEventListener('change', () => {
  activeTerm = termFilter.value ? Number(termFilter.value) : undefined;
  historyExpanded = false;
  render();
  if (editorToken && !scoreForm.hidden && !draft?.baseline && !opponentNameInput.value && teamInput.value === '' && opponentInput.value === '') {
    loadMatch(nextMatch());
  }
});

scoreForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!editorToken || saving) return;
  const identity = readMatchIdentity();
  const team = teamInput.valueAsNumber;
  const opponent = opponentInput.valueAsNumber;
  const opponentName = opponentNameInput.value.trim();
  if (!inRange(identity.term, 1, 2) || !inRange(identity.week, 1, 999)
    || !inRange(team, 0, 99) || !inRange(opponent, 0, 99)) return;
  if (!opponentName) {
    setFeedback('Enter the opponent’s name.');
    opponentNameInput.focus();
    return;
  }
  const existing = matches.find(match => matchKey(match) === matchKey(identity));
  const sameMatch = draft && matchKey(draft) === matchKey(identity);
  const goals = sameMatch ? draft.goals : existing?.goals ?? [];
  const lineup = sameMatch ? draft.lineup : existing?.lineup ?? [];
  const managerComments = sameMatch ? draft.managerComments : existing?.managerComments ?? {};
  draft = { ...identity, team, opponent, opponentName, goals, lineup, managerComments, baseline: sameMatch ? draft.baseline : existing };
  goalFields.replaceChildren(...Array.from({ length: team }, (_, index) => makeGoalFields(index, goals[index])));
  renderLineup(lineup);
  renderCommentFields(managerComments);
  document.querySelector('#match-score').textContent = `${matchTermLabel(draft)} · ${scoreLine(draft)}`;
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
  draft.lineup = draftLineup();
  draft.managerComments = draftManagerComments();
  setFeedback('');
  showScoreForm(true);
});

async function updateSharedHistory(match, baseline, replacement, report) {
  if (saving || !editorToken) return false;
  const token = editorToken;
  const action = replacement ? 'save' : 'delete';
  saving = true;
  resultsVersion += 1;
  saveButton.disabled = true;
  forgetTokenButton.disabled = true;
  report(replacement ? 'Saving match…' : 'Deleting from shared history…');
  try {
    matches = await writeSharedMatch(match, baseline, replacement);
    loadFailed = false;
    return true;
  } catch (error) {
    if (error.changed) {
      report('This match changed. Refresh results and check the latest score before trying again.');
    } else if (tokenRejected(error)) {
      forgetToken(token);
      report('This login does not have editing access. Log in again and try again.');
    } else {
      report(`Could not ${action} the match. Try again.`);
    }
    return false;
  } finally {
    saving = false;
    saveButton.disabled = false;
    forgetTokenButton.disabled = false;
  }
}

async function publishMatch() {
  const { term, competition, week, team, opponent, opponentName, baseline } = draft;
  const match = { term, competition, week, team, opponent, opponentName, goals: draftGoals() };
  const lineup = draftLineup();
  if (lineup.length) match.lineup = lineup;
  const managerComments = draftManagerComments();
  if (Object.keys(managerComments).length) match.managerComments = managerComments;
  if (!validMatch(match) || !await updateSharedHistory(match, baseline, match, setFeedback)) return;
  if (activeTerm) activeTerm = term;
  render();
  loadMatch(nextMatch(term, competition));
  setFeedback(`${matchTermLabel(match)} saved to the shared history.`);
  scoreHeading.focus();
}

function setInjuryFeedback(message) {
  const status = document.querySelector('#injury-feedback');
  status.textContent = message;
  status.hidden = !message;
}

function renderInjuryViews() {
  renderInjuries();
  renderSquad(squadStats);
  if (profileDialog.open && openProfile) renderProfile(openProfile);
}

async function refreshInjuries() {
  if (injuriesLoading || injurySaving) return;
  injuriesLoading = true;
  const version = injuriesVersion;
  try {
    const { records } = await readSharedInjuries(editorToken);
    if (version !== injuriesVersion) return;
    injuries = records;
    injuriesLoaded = true;
    injuriesLoadFailed = false;
  } catch {
    if (version === injuriesVersion) injuriesLoadFailed = true;
  } finally {
    injuriesLoading = false;
    if (version === injuriesVersion) renderInjuryViews();
  }
}

async function updateInjury(player, baseline, replacement) {
  if (!editorToken || injurySaving) return;
  const token = editorToken;
  let saved = false;
  injurySaving = true;
  injuriesVersion += 1;
  document.querySelector('#injury-fields').disabled = true;
  document.querySelector('#save-injury').disabled = true;
  renderInjuries();
  setInjuryFeedback(replacement ? 'Saving injury…' : 'Removing injury…');
  try {
    injuries = await writeSharedInjury(player, baseline, replacement, token);
    injuriesLoaded = true;
    injuriesLoadFailed = false;
    if (injuryPlayer.value === player) {
      injuryForm.reset();
      injuryDraftBaseline = undefined;
    }
    setInjuryFeedback(replacement ? `Injury saved for ${player}.` : `Injury removed for ${player}.`);
    saved = true;
  } catch (error) {
    if (error.latestInjuries) {
      injuries = error.latestInjuries;
      injuriesLoaded = true;
      injuriesLoadFailed = false;
      if (injuryPlayer.value === player) injuryDraftBaseline = injuries.find(record => record.player === player);
      setInjuryFeedback('This injury changed in another browser. Check the latest entry before trying again.');
    } else if (tokenRejected(error)) {
      forgetToken(token);
      setInjuryFeedback('This login does not have editing access. Log in again and try again.');
    } else {
      setInjuryFeedback('Could not update the injury. Try again.');
    }
  } finally {
    injurySaving = false;
    document.querySelector('#injury-fields').disabled = false;
    document.querySelector('#save-injury').disabled = false;
    renderInjuryViews();
    if (saved && editorToken) injuryPlayer.focus();
  }
}

injuryPlayer.append(...squadDisplayOrder.map(player => makeOption(player)));
injuryPlayer.addEventListener('change', () => {
  const injury = injuries.find(record => record.player === injuryPlayer.value);
  injuryDraftBaseline = injury;
  injuryType.value = injury?.type ?? '';
  injuryReturn.value = injury?.returnDate.length === 10 ? injury.returnDate : '';
});
injuryForm.addEventListener('submit', event => {
  event.preventDefault();
  const player = injuryPlayer.value;
  const type = injuryType.value.trim();
  const returnDate = injuryReturn.value;
  if (!type || type.length > 160 || !players.includes(player) || returnDate.length !== 10 || !validReturnDate(returnDate)) {
    setInjuryFeedback('Choose a player and enter the injury type and a valid return date.');
    return;
  }
  void updateInjury(player, injuryDraftBaseline, { player, type, returnDate });
});

function syncEntryAccess() {
  entryGate.hidden = Boolean(editorToken);
  entryForms.hidden = !editorToken;
  unlockInjuries.hidden = Boolean(editorToken);
  injuryForm.hidden = !editorToken;
  renderInjuries();
}

function validEditorToken(token) {
  return /^github_pat_[A-Za-z0-9_]+$/.test(token ?? '');
}

function savedEditorToken() {
  try {
    const token = localStorage.getItem(editorTokenKey);
    return validEditorToken(token) ? token : '';
  } catch {
    return '';
  }
}

function rememberToken(token) {
  try {
    localStorage.setItem(editorTokenKey, token);
    return true;
  } catch {
    return false;
  }
}

function forgetToken(token) {
  if (editorToken === token) {
    editorToken = '';
    syncEntryAccess();
  }
  try {
    if (localStorage.getItem(editorTokenKey) === token) localStorage.removeItem(editorTokenKey);
    return true;
  } catch {
    return false;
  }
}

function tokenRejected(error) {
  return [401, 403, 404].includes(error.status);
}

function withEditorAccess(request) {
  if (saving || connecting || unlockEntry.disabled) return;
  if (editorToken) {
    void request();
    return;
  }
  editorAction = request;
  editorFeedback.hidden = true;
  editorDialog.showModal();
}

unlockEntry.addEventListener('click', () => withEditorAccess(() => scoreHeading.focus()));
unlockInjuries.addEventListener('click', () => withEditorAccess(() => injuryPlayer.focus()));
forgetTokenButton.addEventListener('click', () => {
  if (saving || !editorToken) return;
  const forgotten = forgetToken(editorToken);
  setFeedback(forgotten ? 'Logged out.' : 'Logged out for this tab. Clear this site’s browser data to remove your saved login.');
  unlockEntry.focus();
});
goalsForm.addEventListener('submit', event => {
  event.preventDefault();
  if (editorToken && !saving) void publishMatch();
});

document.querySelector('#editor-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (connecting) return;
  const token = editorTokenInput.value.trim();
  if (!validEditorToken(token)) {
    editorFeedback.textContent = 'That password didn’t work. Try again.';
    editorFeedback.hidden = false;
    editorTokenInput.focus();
    return;
  }
  const request = editorAction;
  connecting = true;
  connectEditor.disabled = true;
  editorFeedback.hidden = true;
  try {
    const { records } = await readSharedResults(token);
    if (!editorDialog.open) return;
    resultsVersion += 1;
    editorToken = token;
    const remembered = rememberToken(token);
    matches = records;
    loadFailed = false;
    render();
    if (!draft) loadMatch(nextMatch());
    syncEntryAccess();
    setFeedback(remembered ? '' : 'This browser could not remember your login. Editing is unlocked in this tab only.');
    editorDialog.close();
    if (request) void request();
  } catch (error) {
    editorFeedback.textContent = tokenRejected(error)
      ? 'That password didn’t work. Try again.'
      : 'Could not log in. Try again.';
    editorFeedback.hidden = false;
  } finally {
    connecting = false;
    connectEditor.disabled = false;
  }
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
  document.querySelector('#delete-score').textContent = `${matchTermLabel(match)} · ${scoreLine(match)}`;
  document.querySelector('#delete-scope').textContent = local
    ? 'This removes the result from this browser.'
    : 'This removes the result from the shared history and recalculates the stats.';
  deleteDialog.showModal();
}

async function deleteSharedMatch(match) {
  if (!await updateSharedHistory(match, match, undefined, setHistoryFeedback)) return;
  if (draft && matchKey(draft) === matchKey(match)) loadMatch(nextMatch(matchTerm(match), matchCompetition(match)));
  render();
  setHistoryFeedback(`${matchTermLabel(match)} removed from the shared history.`);
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
  else withEditorAccess(() => deleteSharedMatch(match));
});
deleteDialog.addEventListener('close', () => { deleteTarget = undefined; });

const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const squadTab = document.querySelector('#squad-tab');
const injuriesTab = document.querySelector('#injuries-tab');
function selectTab(selectedTab, { fromLocation = false } = {}) {
  for (const tab of tabs) {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
  if (fromLocation) return;
  if (commentsPlayer) showManagerComments();
  if (['#injuries', '#squad'].includes(location.hash) || location.hash.startsWith(commentsHashPrefix)) {
    window.history.replaceState(null, '', location.pathname + location.search);
  }
}

function syncViewFromHash() {
  const hash = location.hash;
  const player = hash.startsWith(commentsHashPrefix)
    ? players.find(name => hash === commentsHashPrefix + encodeURIComponent(name)) : undefined;
  if (player) {
    if (profileDialog.open) profileDialog.close();
    selectTab(squadTab, { fromLocation: true });
    showManagerComments(player);
  } else if (hash === '#injuries') {
    selectTab(injuriesTab);
  } else if (hash === '#squad' || commentsPlayer) {
    showManagerComments();
    selectTab(squadTab, { fromLocation: true });
    squadTab.focus();
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
  const edit = event.target.closest('button[data-match]');
  if (!edit || saving) return;
  const key = edit.dataset.match;
  withEditorAccess(() => {
    const match = matches.find(record => matchKey(record) === key);
    if (!match) {
      setHistoryFeedback('This match is no longer in the shared history.');
      return;
    }
    loadMatch(match);
    scoreHeading.focus();
  });
});

async function refreshResults() {
  if (saving || refreshButton.disabled) return;
  void refreshInjuries();
  refreshButton.disabled = true;
  const version = resultsVersion;
  const savedToken = editorToken ? '' : savedEditorToken();
  unlockEntry.disabled = Boolean(savedToken);
  lastRefresh = Date.now();
  let restored = false;
  try {
    let results;
    try {
      results = await readSharedResults(savedToken);
      restored = Boolean(savedToken);
    } catch (error) {
      if (!savedToken || version !== resultsVersion) throw error;
      if (tokenRejected(error)) {
        forgetToken(savedToken);
        setFeedback('Your saved login expired or was rejected. Log in again to edit matches.');
      } else {
        setFeedback('Could not check your saved login. Use Refresh results to try again.');
      }
      results = await readSharedResults();
    }
    if (version !== resultsVersion) return;
    matches = results.records;
    loadFailed = false;
  } catch {
    if (version !== resultsVersion) return;
    loadFailed = true;
  } finally {
    refreshButton.disabled = false;
    unlockEntry.disabled = false;
    if (version === resultsVersion) {
      render();
      if (restored && savedEditorToken() === savedToken) {
        editorToken = savedToken;
        if (!draft) loadMatch(nextMatch());
        setFeedback('');
        syncEntryAccess();
      }
    }
  }
}

window.addEventListener('storage', event => {
  if (event.storageArea !== localStorage || (event.key !== editorTokenKey && event.key !== null)) return;
  if (editorToken && editorToken !== savedEditorToken()) {
    editorToken = '';
    syncEntryAccess();
  }
  void refreshResults();
});

refreshButton.addEventListener('click', () => void refreshResults());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - lastRefresh >= 30000) void refreshResults();
});
renderLocalHistory();
renderSquad(squadStats);
renderInjuries();
const leaguePosition = document.querySelector('#league-position');
if (leaguePosition) {
  leaguePosition.classList.toggle('is-first', /^\s*(?:1st|first|1)\b/i.test(leaguePosition.textContent));
}
const leagueKickoff = document.querySelector('#league-fixture-kickoff');
if (leagueKickoff && Date.parse(leagueKickoff.dateTime) <= Date.now()) {
  document.querySelector('#league-fixture-heading').textContent = 'Listed fixture';
}
syncViewFromHash();
window.addEventListener('hashchange', syncViewFromHash);
void refreshResults();
