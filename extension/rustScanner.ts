export type RiskKind = 'unwrap' | 'expect' | 'panic' | 'unreachable' | 'todo' | 'unimplemented' | 'unsafe';
export interface Risk { kind: RiskKind; start: number; end: number }
interface Token { value: string; start: number; end: number }
const identifierStart = /[_\p{ID_Start}]/u;
const identifierPart = /[_\p{ID_Continue}]/u;

/** A lexical pass only: temporary tokens never escape, and findings contain offsets, not text. */
export function scanRust(text: string, ignoreTests = true): Risk[] {
  const tokens: Token[] = [];
  const point = (at: number) => at < text.length ? String.fromCodePoint(text.codePointAt(at)!) : '';
  function quoted(at: number): number {
    for (let i = at + 1; i < text.length; i++) {
      if (text[i] === '\\') i++;
      else if (text[i] === '"') return i + 1;
    }
    return text.length;
  }
  for (let i = 0; i < text.length;) {
    if (/\s/.test(text[i])) { i++; continue; }
    if (text.startsWith('//', i)) { const end = text.indexOf('\n', i + 2); i = end < 0 ? text.length : end + 1; continue; }
    if (text.startsWith('/*', i)) {
      let depth = 1; i += 2;
      while (i < text.length && depth) {
        if (text.startsWith('/*', i)) { depth++; i += 2; }
        else if (text.startsWith('*/', i)) { depth--; i += 2; }
        else i++;
      }
      continue;
    }
    let prefix = i;
    if (text[i] === 'b' && text[i + 1] === 'r') prefix++;
    if (text[prefix] === 'r') {
      let quote = prefix + 1;
      while (text[quote] === '#') quote++;
      if (text[quote] === '"') {
        const endMarker = '"' + '#'.repeat(quote - prefix - 1), end = text.indexOf(endMarker, quote + 1);
        i = end < 0 ? text.length : end + endMarker.length; continue;
      }
    }
    if (text[i] === '"' || text[i] === 'b' && text[i + 1] === '"') { i = quoted(text[i] === 'b' ? i + 1 : i); continue; }
    const charAt = text[i] === 'b' && text[i + 1] === "'" ? i + 1 : i;
    if (text[charAt] === "'") {
      let end = charAt + 1;
      if (text[end] === '\\') {
        end += 2;
        if (text[end - 1] === 'u' && text[end] === '{') { const close = text.indexOf('}', end + 1); end = close < 0 ? text.length : close + 1; }
        else if (text[end - 1] === 'x') end += 2;
      } else end += point(end).length;
      if (text[end] === "'") { i = end + 1; continue; }
      // A lifetime or label consumes its identifier so 'unsafe is never a keyword finding.
      i = charAt + 1;
      while (identifierPart.test(point(i))) i += point(i).length;
      continue;
    }
    const start = i;
    if (identifierStart.test(point(i))) {
      i += point(i).length;
      if (text.slice(start, i) === 'r' && text[i] === '#' && identifierStart.test(point(i + 1))) i++;
      while (identifierPart.test(point(i))) i += point(i).length;
      tokens.push({ value: text.slice(start, i), start, end: i });
    } else { i += point(i).length; tokens.push({ value: text.slice(start, i), start, end: i }); }
  }
  const risks: Risk[] = [];
  const brackets: number[] = [], bracketEnds = new Map<number, number>();
  tokens.forEach((token, i) => {
    if (token.value === '[') brackets.push(i);
    else if (token.value === ']' && brackets.length) bracketEnds.set(brackets.pop()!, i);
  });
  let depth = 0, testDepth: number | null = null, pendingTest = false, testHeader = false, attributeEnd = -1;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i], value = token.value;
    if (value === '#' && tokens[i + 1]?.value === '[') {
      const end = bracketEnds.get(i + 1) ?? tokens.length;
      if (end === i + 3 && tokens[i + 2].value === 'test' ||
        end === i + 6 && tokens.slice(i + 2, end).map(part => part.value).join('') === 'cfg(test)') pendingTest = true;
      attributeEnd = Math.max(attributeEnd, end);
    }
    if (i > attributeEnd && pendingTest && (value === 'fn' || value === 'mod')) testHeader = true;
    if (value === '{' && i > attributeEnd) {
      depth++;
      if (pendingTest && testHeader && testDepth === null) testDepth = depth;
      pendingTest = false; testHeader = false;
    }
    const skip = ignoreTests && testDepth !== null;
    if (!skip) {
      if (value === '.' && tokens[i + 1]?.value === 'unwrap' && tokens[i + 2]?.value === '(' && tokens[i + 3]?.value === ')') {
        risks.push({ kind: 'unwrap', start: token.start, end: tokens[i + 3].end });
      } else if (value === '.' && tokens[i + 1]?.value === 'expect' && tokens[i + 2]?.value === '(') {
        risks.push({ kind: 'expect', start: token.start, end: tokens[i + 2].end });
      } else if (['panic', 'unreachable', 'todo', 'unimplemented'].includes(value) && tokens[i + 1]?.value === '!') {
        risks.push({ kind: value as RiskKind, start: token.start, end: tokens[i + 1].end });
      } else if (value === 'unsafe') risks.push({ kind: 'unsafe', start: token.start, end: token.end });
    }
    if (value === '}' && i > attributeEnd) { if (testDepth === depth) testDepth = null; depth = Math.max(0, depth - 1); }
    if (value === ';' && i > attributeEnd) { pendingTest = false; testHeader = false; }
  }
  return risks;
}
