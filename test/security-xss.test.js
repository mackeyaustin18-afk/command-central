const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appPath = path.join(__dirname, '..', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.className = '';
    this.value = '';
    this.disabled = false;
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.classList = { add() {}, remove() {}, toggle() { return false; } };
  }
  appendChild(child) {
    this.children.push(child);
    this.scrollHeight = this.children.length;
    return child;
  }
  set textContent(value) { this._textContent = String(value); }
  get textContent() { return this._textContent || ''; }
  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML || ''; }
  focus() {}
}

const elements = new Map();
function getElement(id) {
  if (!elements.has(id)) elements.set(id, new FakeElement(id));
  return elements.get(id);
}

const context = {
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  URL,
  encodeURIComponent,
  decodeURIComponent,
  fetch: async () => ({ ok: false, status: 404, json: async () => ({}) }),
  alert() {},
  CONFIG: {
    GOOGLE_CLIENT_ID: 'test-client-id',
    YOUR_NAME: 'Austin',
    EMAIL_COUNT: 5,
    EVENT_DAYS_AHEAD: 7,
    DRIVE_FILES_COUNT: 5,
    QUICK_LINKS: [],
  },
  localStorage: {
    store: new Map(),
    getItem(key) { return this.store.get(key) || null; },
    setItem(key, value) { this.store.set(key, String(value)); },
    removeItem(key) { this.store.delete(key); },
  },
  sessionStorage: {
    getItem() { throw new Error('access tokens must not be loaded from sessionStorage'); },
    setItem() { throw new Error('access tokens must not be saved to sessionStorage'); },
    removeItem() {},
  },
  google: { accounts: { id: { initialize() {} }, oauth2: { initTokenClient() { return { requestAccessToken() {} }; } } } },
  window: { addEventListener() {}, open() {} },
  document: {
    createElement: tag => new FakeElement(tag),
    getElementById: getElement,
    querySelectorAll: () => [],
    querySelector: () => new FakeElement('query'),
    addEventListener() {},
  },
};
context.window.document = context.document;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: appPath });

assert.strictEqual(
  context.esc('<script>alert("x")</script>&'),
  '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;',
  'esc must HTML-encode dangerous characters'
);

assert.strictEqual(context.sanitizeUrl('javascript:alert(1)'), '#', 'javascript: URLs must be blocked');
assert.strictEqual(context.sanitizeUrl('data:text/html,<svg onload=alert(1)>'), '#', 'data: URLs must be blocked');
assert.strictEqual(context.sanitizeUrl('https://example.com/path'), 'https://example.com/path', 'https URLs should pass');

const projectHtml = context.renderProjStrip({
  id: 99,
  name: '<img src=x onerror=alert(1)>',
  description: '<svg onload=alert(1)>',
  status: 'active',
  updated: 'Today',
  color: '#5b4fe8',
  initials: '<X>',
  links: [{ label: '<img src=x onerror=alert(1)>', url: 'javascript:alert(1)' }],
});
assert(!projectHtml.includes('javascript:'), 'project links must not render javascript: hrefs');
assert(!projectHtml.includes('<img'), 'project HTML must encode labels/names instead of rendering tags');
assert(projectHtml.includes('href="#"'), 'blocked project URLs should render as inert # links');

const msgs = getElement('ai-msgs');
context.appendMsg('<img src=x onerror=alert(1)>', 'user');
assert.strictEqual(msgs.children.length, 1, 'appendMsg should append a message element');
assert(!msgs.children[0].innerHTML.includes('<img'), 'appendMsg must not inject user text via innerHTML');

assert(!source.includes("sessionStorage.setItem('cc_token'"), 'Google access tokens must not be persisted in sessionStorage');
assert(!source.includes("sessionStorage.getItem('cc_token'"), 'Google access tokens must not be restored from sessionStorage');

console.log('command-central security checks passed');

// Exercise the generated handler source after HTML attribute decoding, as a
// browser does on click. All APIs and window.open remain local test doubles.
const test = require('node:test');
function clickRow(html) {
  const match = html.match(/\bonclick="([^"]*)"/);
  assert(match, 'row must have a click handler');
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
  const handler = match[1].replace(/&(amp|lt|gt|quot|#39);/g, (_, key) => entities[key]);
  vm.runInContext(handler, context);
}
const linkRows = [
  { name: 'email', render: value => context.renderEmailRow({ id: value }),
    attack: "'-alert(1)-'", expected: value => 'https://mail.google.com/mail/u/0/#inbox/' + encodeURIComponent(value).replace(/'/g, '%27') },
  { name: 'calendar', render: value => context.renderCalRow({ htmlLink: value }),
    attack: "')-alert(1)-('", expected: value => context.sanitizeUrl(value) },
  { name: 'Drive', render: value => context.renderDriveRow({ url: value }),
    attack: "')-alert(1)-('", expected: value => context.sanitizeUrl(value) },
];
for (const row of linkRows) {
  test(`${row.name}: apostrophes cannot execute code in row handlers`, () => {
    const alerts = [];
    const opened = [];
    context.alert = value => alerts.push(value);
    context.window.open = (...args) => opened.push(args);
    const value = 'https://example.com/' + row.attack;
    clickRow(row.render(value));
    assert.deepStrictEqual(alerts, [], 'click must not execute injected alert');
    assert.deepStrictEqual(opened, [[row.expected(value), '_blank', 'noopener']]);
  });
  test(`${row.name}: URL punctuation and Unicode survive a click`, () => {
    const opened = [];
    context.window.open = (...args) => opened.push(args);
    const value = 'https://example.com/O\'Brien?q="<&>#雪%20&entity=&#39;';
    clickRow(row.render(value));
    assert.deepStrictEqual(opened, [[row.expected(value), '_blank', 'noopener']]);
  });
  if (row.name !== 'email') {
    test(`${row.name}: unsafe URL schemes remain blocked on click`, () => {
      const opened = [];
      context.window.open = (...args) => opened.push(args);
      for (const value of ['javascript:alert(1)', 'data:text/html,<svg onload=alert(1)>']) {
        clickRow(row.render(value));
      }
      assert.deepStrictEqual(opened, []);
    });
  }
}

const markup = '<img src=x onerror=alert(1)>&"\'';
for (const field of ['active_bots', 'open_positions']) {
  test(`trading: ${field} renders as text`, () => {
    context.tradingFixture = { active_bots: 3, open_positions: 2, [field]: markup };
    vm.runInContext('liveOps = { trading: tradingFixture }; renderTradingCard()', context);
    const html = getElement('ops-trading').innerHTML;
    assert(!html.includes('<img'), 'feed markup must not create an element');
    assert(html.includes(context.esc(markup)), 'feed text must be escaped');
  });
}
test('trading: numeric values, zero and missing values retain their display', () => {
  for (const value of [3, '2', 0, undefined]) {
    context.tradingFixture = { active_bots: value, open_positions: value };
    vm.runInContext('liveOps = { trading: tradingFixture }; renderTradingCard()', context);
    assert.strictEqual(getElement('ops-trading').innerHTML.split(`<div class="trading-val">${value || 0}</div>`).length - 1, 2);
  }
});

test('weather: temperature renders as text with mocked fetch', async () => {
  const originalFetch = context.fetch;
  try {
    for (const value of [markup, '72', '-5', undefined]) {
      context.fetch = async () => ({ ok: true, json: async () => ({
        current_condition: [{ temp_F: value, weatherDesc: [{ value: 'Clear' }] }],
      }) });
      await context.fetchWeather();
      const html = getElement('weather-widget').innerHTML;
      assert(!html.includes('<img'), 'weather markup must not create an element');
      assert(html.includes(`<div class="weather-temp">${context.esc(value || '—')}°F</div>`));
      assert(html.includes('Clear'), 'weather description must still render');
    }
  } finally {
    context.fetch = originalFetch;
  }
});
