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
