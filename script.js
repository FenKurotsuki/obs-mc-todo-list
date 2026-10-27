const mirror = document.body.appendChild(document.createElement('div'));
mirror.style.cssText = `position: fixed;
                        top: 0;
                        visibility: hidden;
                        white-space: pre-wrap;
                        overflow-wrap: break-word;
                        box-sizing: border-box;`;

const carets = ta => {
  const cs = getComputedStyle(ta);
  Object.assign(mirror.style, {
    width: ta.clientWidth + 'px',
    font: cs.font,
    wordSpacing: cs.wordSpacing,
    padding: cs.padding,
  });
  const base = mirror.getBoundingClientRect();
  const out = [];
  for (let i = 0; i <= ta.value.length; i++) {
    mirror.textContent = ta.value.slice(0, i);
    const marker = mirror.appendChild(document.createElement('span'));
    marker.textContent = ta.value.slice(i) || '\u200b';
    const r = marker.getClientRects()[0];
    out.push({ x: r.left - base.left, y: Math.round(r.top - base.top) });
  }
  return out;
};

let goalX = null;

const textareaOf = row => row?.querySelector('textarea');

const focusEnd = ta => {
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
};

const fit = ta => {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
};

const save = () => localStorage.setItem('objectives', JSON.stringify(
  [...list.children].map(row => ({
    text: textareaOf(row).value,
    done: row.classList.contains('done'),
  }))
));

function moveVertical(input, row, up) {
  let target = input;
  let cs = carets(input);
  const cur = cs[input.selectionStart];
  goalX ??= cur.x;

  const pick = ys => up ? Math.max(...ys) : Math.min(...ys);
  let lineY = pick(cs.map(c => c.y).filter(y => up ? y < cur.y : y > cur.y));
  if (!isFinite(lineY)) {
    target = textareaOf(up ? row.previousElementSibling : row.nextElementSibling);
    if (!target) return;
    cs = carets(target);
    lineY = pick(cs.map(c => c.y));
  }

  let pos = 0, best = Infinity;
  cs.forEach((c, i) => {
    const d = Math.abs(c.x - goalX);
    if (c.y === lineY && d < best) { best = d; pos = i; }
  });
  target.focus();
  target.setSelectionRange(pos, pos);
}

function add(text = '', done = false, after = null) {
  const row = document.createElement('div');
  row.className = 'item' + (done ? ' done' : '');

  const box = document.createElement('span');
  box.className = 'box';
  box.textContent = done ? '[x]' : '[ ]';

  const input = document.createElement('textarea');
  input.rows = 1;
  input.spellcheck = false;
  input.value = text;

  box.onclick = () => {
    box.textContent = row.classList.toggle('done') ? '[x]' : '[ ]';
    save();
  };

  input.oninput = () => {
    input.value = input.value.replace(/\n/g, ' ');
    fit(input);
    save();
  };

  input.onmousedown = () => goalX = null;

  input.onblur = () => {
    if (!input.value.trim()) { row.remove(); save(); }
  };

  input.onkeydown = e => {
    const prev = row.previousElementSibling;
    const next = row.nextElementSibling;

    if (!e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      moveVertical(input, row, e.key === 'ArrowUp');
      return;
    }
    goalX = null;

    if (e.key === 'Enter') {
      e.preventDefault();
      // ctrl+enter to toggle done
      if (e.ctrlKey) box.onclick();
      // enter to add new item
      else if (input.value.trim()) add('', false, row).focus();
    }

    // esc to loss focus
    if (e.key === 'Escape') input.blur();

    // alt+arrow to move item up/down
    if (e.altKey && e.key === 'ArrowUp' && prev) { row.after(prev); save(); }
    if (e.altKey && e.key === 'ArrowDown' && next) { row.before(next); save(); }

    // shift+del to delete item
    if (e.shiftKey && e.key === 'Delete') {
      e.preventDefault();
      input.value = '';
      const neighbour = textareaOf(prev || next);
      if (neighbour) focusEnd(neighbour);
      else input.blur();
    }

    if (e.key === 'Backspace' && !input.value && prev) {
      e.preventDefault();
      focusEnd(textareaOf(prev));
    }
  };

  row.append(box, input);
  list.insertBefore(row, after ? after.nextSibling : null);
  fit(input);
  return input;
}

const emptyLast = () => {
  const ta = textareaOf(list.lastElementChild);
  return ta && !ta.value.trim() && ta;
};

const onEmptySpace = e => e.target === document.body || e.target === list;

document.body.onmousedown = e => {
  if (onEmptySpace(e) && emptyLast()) e.preventDefault();
};

document.body.onclick = e => {
  if (onEmptySpace(e)) (emptyLast() || add()).focus();
};

window.onresize = () => list.querySelectorAll('textarea').forEach(fit);

title.oninput = () => localStorage.setItem('title', title.textContent);

title.onkeydown = e => {
  if (e.key === 'Enter' || e.key === 'Escape') {
    e.preventDefault();
    title.blur();
  }
};

title.onclick = e => e.stopPropagation();

try { title.textContent = localStorage.getItem('title') ?? title.textContent; } catch {}
try { JSON.parse(localStorage.getItem('objectives') || '[]').forEach(o => add(o.text, o.done)); } catch {}
