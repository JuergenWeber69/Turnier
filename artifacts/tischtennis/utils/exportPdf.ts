import { Match, Player, Tournament } from '@/types';
import { DoublesTournament } from '@/types/doubles';
import { calculateStandings, getKORoundName } from './tournament';
import { calculateDoublesStandings } from './doubles';

function getPlayer(players: Player[], id: string): Player | undefined {
  return players.find(p => p.id === id);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function pname(players: Player[], id: string): string {
  if (id === 'BYE') return 'Freilos';
  if (id === 'TBD') return '–';
  return getPlayer(players, id)?.name ?? '?';
}

function matchBox(m: Match, players: Player[]): string {
  const n1 = pname(players, m.player1Id);
  const n2 = pname(players, m.player2Id);
  const done = m.completed && m.score1 !== null && m.score2 !== null;
  const w1 = done && (m.score1 ?? 0) > (m.score2 ?? 0);
  const w2 = done && (m.score2 ?? 0) > (m.score1 ?? 0);
  const s1 = done ? String(m.score1) : '';
  const s2 = done ? String(m.score2) : '';
  return `<div class="mbox">
      <div class="mrow ${w1 ? 'mwin' : ''}"><span class="mname">${n1}</span><span class="mscore">${s1}</span></div>
      <div class="mrow ${w2 ? 'mwin' : ''}"><span class="mname">${n2}</span><span class="mscore">${s2}</span></div>
    </div>`;
}

function renderBracket(columns: { title: string; matches: Match[] }[], players: Player[]): string {
  return `<div class="bracket">
    ${columns.map(c => `<div class="bround">
      <div class="brtitle">${c.title}</div>
      <div class="brmatches">${c.matches.map(m => matchBox(m, players)).join('')}</div>
    </div>`).join('')}
  </div>`;
}

function standingsTable(
  title: string,
  playerIds: string[],
  matches: Match[],
  group: 'A' | 'B' | 'C' | 'none',
  players: Player[],
): string {
  return `
    <h2>${title}</h2>
    <table>
      <thead><tr><th>#</th><th>Name</th><th>TTR</th><th>S</th><th>N</th><th>Sätze</th><th>Punkte</th></tr></thead>
      <tbody>${standingsRows(playerIds, matches, group, players)}</tbody>
    </table>`;
}

function standingsRows(playerIds: string[], matches: Match[], group: 'A' | 'B' | 'C' | 'none', players: Player[]): string {
  const standings = calculateStandings(playerIds, matches, group);
  return standings.map((s, i) => {
    const p = getPlayer(players, s.playerId);
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `
      <tr class="${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">
        <td class="rank">${medal}</td>
        <td>${p?.name ?? '?'}</td>
        <td class="num">${p?.ttr ?? ''}</td>
        <td class="num">${s.wins}</td>
        <td class="num">${s.losses}</td>
        <td class="num">${s.setsWon}:${s.setsLost}</td>
        <td class="num pts">${s.matchPoints}</td>
      </tr>`;
  }).join('');
}

function buildHtml(t: Tournament): string {
  const winner = t.players.find(p => p.id === t.winnerId);
  const winnerBanner = winner ? `
    <div class="winner-banner">🏆 Turniersieger: <strong>${winner.name}</strong></div>` : '';

  const tournamentName = t.name || 'Turnier';

  let modeLabel: string;
  let resultSection = '';

  if (t.mode === 'simpleko') {
    modeLabel = 'Einfaches KO';
    const total = t.totalRounds;
    const columns: { title: string; matches: Match[] }[] = [];
    for (let r = 1; r <= total; r++) {
      if (total - r > 2) continue; // nur ab Viertelfinale
      const ms = t.matches.filter(m => m.round === r);
      if (ms.length === 0) continue;
      columns.push({ title: getKORoundName(r, total), matches: ms });
    }
    resultSection = `<h2>Turnierraster</h2>${renderBracket(columns, t.players)}`;
  } else if (t.mode === 'swiss') {
    modeLabel = `Schweizer System · ${t.totalRounds} Runden`;
    resultSection = standingsTable('Abschlusstabelle', t.players.map(p => p.id), t.matches, 'none', t.players);
  } else {
    // roundrobin
    const isThreeGroup = t.groupCPlayerIds.length > 0;
    const isTwoGroup = !isThreeGroup && t.groupAPlayerIds.length > 0;

    if (isThreeGroup) {
      modeLabel = 'Jeder gegen Jeden · 3 Gruppen + KO';
      resultSection =
        standingsTable('Gruppe A', t.groupAPlayerIds, t.matches, 'A', t.players) +
        standingsTable('Gruppe B', t.groupBPlayerIds, t.matches, 'B', t.players) +
        standingsTable('Gruppe C', t.groupCPlayerIds, t.matches, 'C', t.players);
    } else if (isTwoGroup) {
      modeLabel = 'Jeder gegen Jeden · 2 Gruppen + KO';
      resultSection =
        standingsTable('Gruppe A', t.groupAPlayerIds, t.matches, 'A', t.players) +
        standingsTable('Gruppe B', t.groupBPlayerIds, t.matches, 'B', t.players);
    } else {
      modeLabel = 'Jeder gegen Jeden · Einfache Gruppe';
      resultSection = standingsTable('Abschlusstabelle', t.players.map(p => p.id), t.matches, 'none', t.players);
    }

    // KO-Phase der Gruppenturniere (entscheidendes Endergebnis)
    const koMatches = t.matches.filter(m => m.phase !== 'group');
    if (koMatches.length > 0) {
      const qf = koMatches.filter(m => m.phase.startsWith('qf')).sort((a, b) => a.phase.localeCompare(b.phase));
      const semi = koMatches.filter(m => m.phase === 'semi1' || m.phase === 'semi2').sort((a, b) => a.phase.localeCompare(b.phase));
      const final = koMatches.filter(m => m.phase === 'final');
      const third = koMatches.filter(m => m.phase === 'third');
      const cols: { title: string; matches: Match[] }[] = [];
      if (qf.length) cols.push({ title: 'Viertelfinale', matches: qf });
      if (semi.length) cols.push({ title: 'Halbfinale', matches: semi });
      if (final.length) cols.push({ title: 'Finale', matches: final });
      if (cols.length > 0) {
        resultSection += `<h2>KO-Phase</h2>${renderBracket(cols, t.players)}`;
        if (third.length > 0) {
          resultSection += `<h3>Spiel um Platz 3</h3><div class="third-box">${matchBox(third[0], t.players)}</div>`;
        }
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${tournamentName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 24px 20px; }
  .header { border-bottom: 3px solid #f97316; padding-bottom: 16px; margin-bottom: 24px; }
  .club { font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  h1 { font-size: 26px; font-weight: 800; color: #f97316; margin-bottom: 6px; }
  .meta { font-size: 13px; color: #555; }
  .winner-banner { background: #fff7ed; border: 2px solid #f97316; border-radius: 10px;
    padding: 14px 18px; font-size: 17px; margin: 20px 0; color: #c2410c; }
  h2 { font-size: 16px; font-weight: 700; margin: 24px 0 10px; color: #374151;
    text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  h3 { font-size: 14px; font-weight: 600; margin: 18px 0 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 4px; }
  thead { background: #f9fafb; }
  th { text-align: left; padding: 8px 10px; font-weight: 600; color: #6b7280;
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  td.rank { font-weight: 700; width: 36px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.pts { font-weight: 700; color: #f97316; }
  td.score { font-weight: 700; text-align: center; font-size: 15px; }
  td.winner { color: #16a34a; font-weight: 600; }
  tr.gold td { background: #fffbeb; }
  tr.silver td { background: #f8fafc; }
  tr.bronze td { background: #fff7f0; }
  .bracket { display: flex; gap: 16px; margin-bottom: 8px; align-items: stretch; }
  .bround { flex: 1; display: flex; flex-direction: column; }
  .brtitle { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    color: #6b7280; text-align: center; margin-bottom: 10px; }
  .brmatches { flex: 1; display: flex; flex-direction: column; justify-content: space-around; gap: 14px; }
  .mbox { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .mrow { display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; font-size: 12px; }
  .mrow + .mrow { border-top: 1px solid #f3f4f6; }
  .mwin { font-weight: 700; color: #c2410c; background: #fff7ed; }
  .mname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px; }
  .mscore { font-variant-numeric: tabular-nums; font-weight: 700; }
  .third-box { max-width: 280px; }
  .footer { margin-top: 32px; font-size: 11px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="club">TV Stetten · Tischtennis</div>
    <h1>${tournamentName}</h1>
    <div class="meta">${modeLabel} · ${t.players.length} Spieler · ${formatDate(t.createdAt)}</div>
  </div>

  ${winnerBanner}
  ${resultSection}

  <div class="footer">Erstellt mit Turnier-App TV Stetten · ${formatDate(Date.now())}</div>
</body>
</html>`;
}

export async function exportTournamentPdf(tournament: Tournament): Promise<void> {
  const html = buildHtml(tournament);

  // Dynamic imports so that module-load errors don't crash the whole app on startup
  const { printAsync, printToFileAsync } = await import('expo-print');
  const { isAvailableAsync, shareAsync } = await import('expo-sharing');

  try {
    const canShare = await isAvailableAsync();
    if (canShare) {
      const { uri } = await printToFileAsync({ html, base64: false });
      await shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${tournament.name || 'Turnier'} exportieren`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await printAsync({ html });
    }
  } catch {
    await printAsync({ html });
  }
}

// ── Doubles PDF ───────────────────────────────────────────────────────────────

function buildDoublesPdf(t: DoublesTournament): string {
  const standings = calculateDoublesStandings(t);
  const tournamentName = t.name || 'Doppelturnier';

  const standingRows = standings.map((s, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const cls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    return `<tr class="${cls}">
      <td class="rank">${medal}</td>
      <td>${s.pair.displayName}</td>
      <td class="num">${s.wins}</td>
      <td class="num">${s.losses}</td>
      <td class="num">${s.setsWon}:${s.setsLost}</td>
      <td class="num pts">${s.points}</td>
    </tr>`;
  }).join('');

  const winner = standings[0];
  const winnerBanner = winner ? `
    <div class="winner-banner">🏆 Sieger: <strong>${winner.pair.displayName}</strong></div>` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>${tournamentName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 24px 20px; }
  .header { border-bottom: 3px solid #f97316; padding-bottom: 16px; margin-bottom: 24px; }
  .club { font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  h1 { font-size: 26px; font-weight: 800; color: #f97316; margin-bottom: 6px; }
  .meta { font-size: 13px; color: #555; }
  .winner-banner { background: #fff7ed; border: 2px solid #f97316; border-radius: 10px;
    padding: 14px 18px; font-size: 17px; margin: 20px 0; color: #c2410c; }
  h2 { font-size: 16px; font-weight: 700; margin: 24px 0 10px; color: #374151;
    text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  h3 { font-size: 14px; font-weight: 600; margin: 18px 0 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 4px; }
  thead { background: #f9fafb; }
  th { text-align: left; padding: 8px 10px; font-weight: 600; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  td.rank { font-weight: 700; width: 36px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.pts { font-weight: 700; color: #f97316; }
  td.score { font-weight: 700; text-align: center; font-size: 15px; }
  td.winner { color: #16a34a; font-weight: 600; }
  tr.gold td { background: #fffbeb; }
  tr.silver td { background: #f8fafc; }
  tr.bronze td { background: #fff7f0; }
  .footer { margin-top: 32px; font-size: 11px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="club">TV Stetten · Tischtennis</div>
    <h1>${tournamentName}</h1>
    <div class="meta">Doppelturnier · ${t.pairs.length} Doppel · ${t.totalRounds} Runden · ${formatDate(t.createdAt)}</div>
  </div>
  ${winnerBanner}
  <h2>Abschlusstabelle</h2>
  <table>
    <thead><tr><th>#</th><th>Doppel</th><th>S</th><th>N</th><th>Sätze</th><th>Punkte</th></tr></thead>
    <tbody>${standingRows}</tbody>
  </table>
  <div class="footer">Erstellt mit Turnier-App TV Stetten · ${formatDate(Date.now())}</div>
</body>
</html>`;
}

export async function exportDoublesPdf(tournament: DoublesTournament): Promise<void> {
  const html = buildDoublesPdf(tournament);
  const { printAsync, printToFileAsync } = await import('expo-print');
  const { isAvailableAsync, shareAsync } = await import('expo-sharing');
  try {
    const canShare = await isAvailableAsync();
    if (canShare) {
      const { uri } = await printToFileAsync({ html, base64: false });
      await shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${tournament.name || 'Doppelturnier'} exportieren`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await printAsync({ html });
    }
  } catch {
    await printAsync({ html });
  }
}
