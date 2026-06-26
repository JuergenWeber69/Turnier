import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('handout-turnier-app.pdf');

const ML = 52;
const MR = 52;
const PW = 595;
const PH = 842;
const CW = PW - ML - MR;
const BODY_BOTTOM = PH - 60; // leave room for footer

const INK  = '#1a1a1a';
const MUTED = '#555555';
const RULE = '#d0d0d0';
const ACC  = '#ea580c';

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 52, bottom: 52, left: ML, right: MR },
  info: { Title: 'Turnier-App TV Stetten – Kurzanleitung' },
  autoFirstPage: false,
});
doc.pipe(fs.createWriteStream(OUT));

// ── Footer drawn on every content page ───────────────────────────────────────
let pageNum = 0;
function footer() {
  doc.save();
  doc.moveTo(ML, PH - 42).lineTo(ML + CW, PH - 42).strokeColor(RULE).lineWidth(0.4).stroke();
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
     .text('Turnier-App TV Stetten  ·  Kurzanleitung', ML, PH - 34, { width: CW / 2, lineBreak: false })
     .text(`Seite ${pageNum}`, ML, PH - 34, { width: CW, align: 'right', lineBreak: false });
  doc.restore();
}

function addContentPage() {
  pageNum++;
  doc.addPage();
  footer();
  doc.y = 52;
}

// ── Guard: start a new page if less than `minPts` pts remain ─────────────────
function guard(minPts = 60) {
  if (doc.y > BODY_BOTTOM - minPts) addContentPage();
}

// ── Primitives ────────────────────────────────────────────────────────────────

function hRule(color = RULE, weight = 0.4) {
  doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).strokeColor(color).lineWidth(weight).stroke();
}

function sp(pts: number) {
  doc.y += pts;
}

function sectionTitle(text: string) {
  guard(70);
  sp(16);
  // thin orange bar + bold uppercase text
  doc.rect(ML, doc.y, 3, 13).fill(ACC);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11)
     .text(text.toUpperCase(), ML + 10, doc.y, { width: CW - 10, lineBreak: false });
  sp(14);
  hRule();
  sp(10);
}

function subTitle(text: string) {
  guard(40);
  sp(8);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(10)
     .text(text, ML, doc.y, { width: CW, lineBreak: false });
  sp(13);
}

function body(text: string, indent = 0) {
  const w = CW - indent;
  const h = doc.heightOfString(text, { width: w, lineGap: 2 });
  guard(h + 8);
  doc.fillColor(INK).font('Helvetica').fontSize(10)
     .text(text, ML + indent, doc.y, { width: w, lineGap: 2 });
  sp(6);
}

function bullet(text: string) {
  const w = CW - 14;
  const h = doc.heightOfString(text, { width: w, lineGap: 2 });
  guard(h + 4);
  const startY = doc.y;
  doc.fillColor(MUTED).font('Helvetica').fontSize(10)
     .text('\u2013', ML + 2, startY, { width: 12, lineBreak: false });
  doc.fillColor(INK).font('Helvetica').fontSize(10)
     .text(text, ML + 14, startY, { width: w, lineGap: 2 });
  // advance by actual rendered height
  doc.y = startY + h + 4;
}

function note(text: string) {
  const w = CW - 14;
  const h = doc.heightOfString(text, { width: w, lineGap: 2 });
  const boxH = h + 14;
  guard(boxH + 8);
  sp(4);
  doc.rect(ML, doc.y, CW, boxH).fill('#f4f4f4');
  const boxY = doc.y;
  doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(9)
     .text(text, ML + 8, boxY + 7, { width: w, lineGap: 2 });
  doc.y = boxY + boxH + 8;
}

function kv(key: string, val: string) {
  const valW = CW - 95;
  const h = Math.max(12, doc.heightOfString(val, { width: valW, lineGap: 2 }));
  guard(h + 6);
  const startY = doc.y;
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(9.5)
     .text(key, ML, startY, { width: 88, lineBreak: false });
  doc.fillColor(INK).font('Helvetica').fontSize(9.5)
     .text(val, ML + 95, startY, { width: valW, lineGap: 2 });
  doc.y = startY + h + 5;
}

// Simple table: cols = [{text, w}]
function tableHeader(cols: { text: string; w: number }[]) {
  guard(22);
  doc.rect(ML, doc.y, CW, 20).fill('#eeeeee');
  let x = ML;
  const rowY = doc.y;
  cols.forEach(({ text, w }) => {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5)
       .text(text, x + 4, rowY + 5, { width: w - 6, lineBreak: false });
    x += w;
  });
  doc.y = rowY + 20;
  hRule(RULE, 0.3);
}

function tableRow(cells: string[], widths: number[]) {
  // Calculate row height
  const h = cells.reduce((max, text, i) => {
    return Math.max(max, doc.heightOfString(text, { width: widths[i] - 8, lineGap: 1 }));
  }, 0);
  const rowH = Math.max(18, h + 10);
  guard(rowH);
  const rowY = doc.y;
  let x = ML;
  cells.forEach((text, i) => {
    doc.fillColor(INK).font('Helvetica').fontSize(9.5)
       .text(text, x + 4, rowY + 5, { width: widths[i] - 8, lineGap: 1 });
    x += widths[i];
  });
  doc.y = rowY + rowH;
  hRule(RULE, 0.3);
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE 1 — COVER
// ════════════════════════════════════════════════════════════════════════════
pageNum = 1;
doc.addPage();
footer();

// Orange header band
doc.rect(0, 0, PW, 100).fill(ACC);
doc.fillColor('#fff').font('Helvetica-Bold').fontSize(30)
   .text('Turnier-App', ML, 24, { width: CW, lineBreak: false });
doc.fillColor('rgba(255,255,255,0.82)').font('Helvetica').fontSize(15)
   .text('TV Stetten  ·  Tischtennis Turniersystem', ML, 62, { width: CW, lineBreak: false });

doc.y = 118;

body('Diese Kurzanleitung erklärt Schritt für Schritt, wie Sie mit der Turnier-App ein Tischtennis-Turnier von der Anmeldung bis zur Siegerehrung organisieren. Die App läuft vollständig offline auf dem Smartphone oder Tablet.');

sp(4);
sectionTitle('Inhalt');
const toc = [
  '1.  Spieler eingeben',
  '2.  Spielmodus wählen',
  '3.  Turnierbetrieb: Spiele eintragen',
  '4.  Tabelle & Auswertung',
  '5.  KO-Phase (Gruppen-Turniere)',
  '6.  Abschluss & PDF-Export',
  '7.  Hinweise & Tipps',
];
toc.forEach(line => {
  doc.fillColor(INK).font('Helvetica').fontSize(10)
     .text(line, ML + 4, doc.y, { width: CW - 4, lineBreak: false });
  sp(15);
});

sp(6);
sectionTitle('Spielmodi auf einen Blick');

const mW = [132, 118, 241];
tableHeader([
  { text: 'Modus', w: mW[0] },
  { text: 'Spieler', w: mW[1] },
  { text: 'Ablauf', w: mW[2] },
]);
([
  ['Jeder gegen Jeden', '5–8', 'Alle in einer Gruppe. Sieger nach Punkten.'],
  ['Jeder gegen Jeden', '9–16', '2 Gruppen → Halbfinale → Finale + Platz 3.'],
  ['Jeder gegen Jeden', '17–24', '3 Gruppen → Viertelfinale → Halbfinale → Finale.'],
  ['Schweizer System', 'mind. 8', '6 Runden, kein Ausscheiden. Paarung nach Punkten.'],
  ['Einfaches KO', '5–24', 'Direktes Ausscheiden. Bracket sofort sichtbar.'],
  ['Doppelturnier', '5–24', 'Jeder gegen Jeden mit festen Doppelpartnern.'],
] as string[][]).forEach(row => tableRow(row, mW));

// ════════════════════════════════════════════════════════════════════════════
// PAGE 2 — SCHRITT 1 & 2
// ════════════════════════════════════════════════════════════════════════════
addContentPage();

sectionTitle('1  Spieler eingeben');
body('Auf dem Startbildschirm tragen Sie Namen und optional den TTR-Wert (Tischtennis-Rating) jedes Teilnehmers ein.');
sp(4);
bullet('Mindestens 5, maximal 24 Spieler.');
bullet('TTR ist optional. Ohne TTR-Wert gilt die Eingabereihenfolge als Setzung — Spieler 1 gilt als der Stärkste.');
bullet('Spielernamen können über das Stift-Symbol im Turnierkopf nachträglich bearbeitet werden.');
bullet('CSV-Import: Eine Datei mit dem Format „Name;TTR" (eine Zeile pro Spieler) kann direkt eingelesen werden.');
sp(2);
note('Tipp: Namen werden gespeichert und bei künftigen Turnieren als Vorschläge angeboten, sobald man zu tippen beginnt.');

sectionTitle('2  Spielmodus wählen');
body('Nach der Spielereingabe tippen Sie auf „Weiter — Modus wählen". Wählen Sie den Modus passend zu Ihrer Teilnehmerzahl:');
sp(6);

subTitle('Jeder gegen Jeden');
body('Alle spielen gegeneinander. Die App bildet Gruppen automatisch nach TTR-Setzung (Schlangenprinzip):');
kv('≤ 8 Spieler', '1 Gruppe — alle spielen direkt gegeneinander, Sieger nach Gesamtpunkten.');
kv('9–16 Spieler', '2 Gruppen (A und B). Top 2 jeder Gruppe ziehen ins Halbfinale.');
kv('17–24 Spieler', '3 Gruppen (A, B, C). Die besten 8 spielen ein Viertelfinale.');
sp(2);
note('Schlangenprinzip: Spieler 1→A, 2→B, 3→C, 4→B, 5→A … So entstehen ausgeglichene Gruppen.');

sp(4);
subTitle('Schweizer System');
body('Mindestens 8 Spieler erforderlich. 6 Runden ohne Ausscheiden — Paarungen werden nach dem laufenden Punktestand gelost, bereits gespielte Begegnungen werden vermieden. Sieger ergibt sich aus der Abschlusstabelle.');

sp(4);
subTitle('Einfaches KO (Direkte Ausscheidung)');
body('Das vollständige Bracket wird beim Start generiert. Wer verliert, scheidet aus. Freilose erhalten die stärksten Spieler. Sobald ein Ergebnis eingetragen ist, zieht der Sieger automatisch in die nächste Runde vor.');
kv('5–8 Spieler',   'Viertelfinale (8er-Bracket).');
kv('9–16 Spieler',  'Achtelfinale (16er-Bracket).');
kv('17–24 Spieler', 'Beste 32 (32er-Bracket).');

sp(4);
subTitle('Doppelturnier');
body('Die Doppelpaare werden zu Beginn einmal ausgelost und bleiben für das gesamte Turnier gleich. Anschließend spielen die Doppel im Jeder-gegen-Jeden-Modus gegeneinander.');

// ════════════════════════════════════════════════════════════════════════════
// PAGE 3 — SCHRITT 3 & 4
// ════════════════════════════════════════════════════════════════════════════
addContentPage();

sectionTitle('3  Turnierbetrieb: Spiele eintragen');
body('Nach dem Start erscheint der Turnier-Hauptscreen. Zwei Tabs wechseln die Ansicht:');
sp(4);
kv('Tab SPIELE',  'Alle Partien der laufenden Runde mit Spielernamen und Ergebnis.');
kv('Tab TABELLE', 'Zwischentabelle mit Siegen, Niederlagen, Sätzen und Punkten.');
sp(8);

subTitle('Ergebnis eintragen');
body('Auf eine Partie tippen → Ergebnismaske öffnet sich → Sat-Ergebnis des Siegers antippen → „Speichern".');
sp(4);

const sW = [78, 413];
tableHeader([{ text: 'Ergebnis', w: sW[0] }, { text: 'Bedeutung', w: sW[1] }]);
([
  ['3 : 0', 'Klarer Sieg in drei Sätzen.'],
  ['3 : 1', 'Sieg nach vier Sätzen.'],
  ['3 : 2', 'Knappes Fünf-Satz-Spiel.'],
] as string[][]).forEach(r => tableRow(r, sW));

sp(8);
bullet('Freilose werden automatisch eingetragen (Sieg 3:0) — kein Tippen nötig.');
bullet('Eingetragene Ergebnisse können jederzeit durch erneutes Antippen korrigiert werden.');
bullet('Der Fortschrittsbalken im Runden-Header zeigt, wie viele Spiele noch ausstehen.');
sp(4);

subTitle('Runde weiterschalten');
bullet('Jeder gegen Jeden & Schweizer System: Schaltfläche „Runde X starten" erscheint, sobald alle Spiele abgeschlossen sind.');
bullet('Einfaches KO: Nächste Runde startet automatisch. Bracket-Ansicht über „Zur KO-Phase".');

sectionTitle('4  Tabelle & Auswertung');
body('Die Tabelle zeigt nach jeder Runde den Zwischenstand. Die Spalten bedeuten:');
sp(4);

const tW = [58, 433];
tableHeader([{ text: 'Spalte', w: tW[0] }, { text: 'Bedeutung', w: tW[1] }]);
([
  ['S', 'Siege (grün hervorgehoben)'],
  ['N', 'Niederlagen (rot hervorgehoben)'],
  ['Sätze', 'Gewonnene : verlorene Sätze'],
  ['Pkt', '2 Punkte pro Sieg, 0 pro Niederlage. Entscheidet die Platzierung.'],
] as string[][]).forEach(r => tableRow(r, tW));

sp(6);
note('Bei Punktegleichstand: Satzverhältnis, danach direktes Duell. Plätze 1 und 2 jeder Gruppe sind mit einem orangen Randbalken hervorgehoben.');
sp(6);

subTitle('Aktionsbuttons oben rechts im Turnierkopf');
kv('Teilen-Symbol',    'Ergebnisliste als PDF exportieren und teilen.');
kv('Stift-Symbol',     'Spielernamen nachträglich bearbeiten.');
kv('Aktualisieren',   'Turnier zurücksetzen (nach Bestätigung).');

// ════════════════════════════════════════════════════════════════════════════
// PAGE 4 — KO-PHASE, ABSCHLUSS, TIPPS
// ════════════════════════════════════════════════════════════════════════════
addContentPage();

sectionTitle('5  KO-Phase  (Gruppen-Turniere)');
body('Nach Abschluss aller Gruppenspiele erscheint die Schaltfläche „KO-Phase starten".');
sp(6);

subTitle('2 Gruppen (9–16 Spieler)');
body('Halbfinale: 1. Gruppe A gegen 2. Gruppe B  |  1. Gruppe B gegen 2. Gruppe A');
body('Finale (Halbfinal-Sieger) + Spiel um Platz 3 (Halbfinal-Verlierer).');

sp(4);
subTitle('3 Gruppen (17–24 Spieler)');
body('Viertelfinale mit 8 Teilnehmern: 3 Gruppensieger + 3 Zweite + 2 beste Drittplatzierte.');
body('Halbfinale → Finale + Spiel um Platz 3.');

sp(2);
note('Den vollständigen Bracket-Baum öffnen Sie über „Zur KO-Phase". Folgerunden werden erst freigegeben, wenn alle Vorrundenspiele gespielt sind.');

sectionTitle('6  Abschluss & PDF-Export');
bullet('Nach dem letzten Spiel wird der Sieger angezeigt. Taste „Ergebnisse als PDF" öffnet den Systemfreigabedialog.');
bullet('Das PDF enthält Turniername, alle Ergebnisse und die Abschlusstabelle.');
bullet('Anschließend „Turnier beenden" → alles wird zurückgesetzt, neues Turnier kann gestartet werden.');
sp(2);
note('Tipp: Den Turniernamen gleich am Anfang eintragen (z. B. „Vereinsmeisterschaft 2025") — er erscheint im PDF-Header.');

sectionTitle('7  Hinweise & Tipps');

subTitle('Datenspeicherung & Verbindung');
bullet('Das laufende Turnier wird automatisch gespeichert und nach einem Neustart wiederhergestellt.');
bullet('Spielernamen werden dauerhaft gespeichert und als Vorschläge wiederverwendet.');
bullet('Die App funktioniert vollständig offline — keine Internetverbindung nötig.');
bullet('Bei langen Turnieren empfiehlt sich eine Powerbank für das Gerät.');

sp(6);
subTitle('Häufige Fragen');
kv('Falsches Ergebnis?',   'Erneut auf die Partie tippen und das Ergebnis korrigieren.');
kv('Spieler vergessen?',   'Über das Stift-Symbol im Turnierkopf können Namen nachträglich geändert werden. Neue Spieler können nach dem Turnierstart nicht mehr hinzugefügt werden.');
kv('App neu gestartet?',   'Den zuletzt gespeicherten Stand wird automatisch geladen.');

doc.end();
console.log('PDF erstellt:', OUT);
