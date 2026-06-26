import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Section {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  steps: { label: string; detail: string }[];
}

const SECTIONS: Section[] = [
  {
    icon: 'people',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    title: 'Spieler eingeben',
    steps: [
      { label: 'Namen eintragen', detail: 'Mindestens 5, maximal 18 Spieler. Die Reihenfolge spielt keine Rolle — die App sortiert automatisch nach TTR.' },
      { label: 'TTR-Wert angeben', detail: 'Jeder Spieler braucht einen TTR-Wert für die Setzung. Der Wert wird nicht gespeichert und muss bei jedem Turnier neu eingegeben werden.' },
      { label: 'CSV importieren', detail: 'Über „CSV importieren" können Namen und TTR-Werte aus einer Textliste eingefügt werden — Format: eine Zeile pro Spieler, Name und TTR durch Komma oder Semikolon getrennt.' },
      { label: 'Namens-Vorschläge', detail: 'Beim Eintippen erscheinen bekannte Spielernamen als Vorschläge (Tipp auf die Pille übernimmt den Namen). Namen werden automatisch für künftige Turniere gespeichert.' },
    ],
  },
  {
    icon: 'grid',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    title: 'Jeder gegen Jeden',
    steps: [
      { label: 'Bis 9 Spieler', detail: 'Alle spielen in einer Gruppe gegeneinander. Es wird Runde für Runde gespielt (Rundenverfahren nach Kreis-Methode).' },
      { label: 'Ab 10 Spieler', detail: 'Die App teilt automatisch in zwei Gruppen auf (TTR-Setzung: stärkste und schwächste Spieler kommen in verschiedene Gruppen). Nach der Gruppenphase folgt eine KO-Phase mit Halbfinale, Spiel um Platz 3 und Finale.' },
      { label: 'Tabelle', detail: 'Immer unter dem Tab „Tabelle" einsehbar. Sortierung: Punkte → Satzverhältnis → direkter Vergleich.' },
    ],
  },
  {
    icon: 'git-network',
    iconBg: '#fef3c7',
    iconColor: '#d97706',
    title: 'Schweizer System',
    steps: [
      { label: 'Mindestens 8 Spieler', detail: 'Das Schweizer System läuft über eine feste Anzahl Runden (abhängig von der Spielerzahl). Kein Spieler scheidet aus.' },
      { label: 'Paarung nach Punkten', detail: 'Runde 1 wird nach TTR-Setzung (Fold-Methode: Platz 1 gegen Platz n/2+1 usw.) gepaart. Ab Runde 2 spielen immer Spieler mit gleicher Punktzahl gegeneinander.' },
      { label: 'Kein Wiederholungsspiel', detail: 'Die App verhindert automatisch, dass zwei Spieler zweimal gegeneinander spielen.' },
    ],
  },
  {
    icon: 'people',
    iconBg: '#d1fae5',
    iconColor: '#059669',
    title: 'Doppelturnier',
    steps: [
      { label: 'Eigene Spielerliste', detail: 'Das Doppelturnier hat eine separate Spielerliste. Die Spieler aus dem Einzel-Turnier werden nicht übernommen.' },
      { label: 'Einmalige Auslosung', detail: 'Die App lost die Doppelpaare vor dem Start automatisch aus. Mit „Neu auslosen" kann diese Start-Auslosung wiederholt werden, bis das Ergebnis passt.' },
      { label: 'Feste Doppel', detail: 'Nach dem Start bleiben die Doppelpaare für das gesamte Turnier gleich. Beim Starten der nächsten Runde werden keine neuen Doppelpaarungen ausgelost.' },
      { label: 'Dreier-Doppel', detail: 'Bei ungerader Spielerzahl gibt es ein Dreier-Doppel. Wer von den dreien gerade nicht dran ist, wird angezeigt.' },
    ],
  },
  {
    icon: 'trophy',
    iconBg: '#fef3c7',
    iconColor: '#d97706',
    title: 'Ergebnis eintragen',
    steps: [
      { label: 'Karte antippen', detail: 'Auf eine Begegnung tippen, um das Ergebnis einzutragen. Das Ergebnis-Fenster öffnet sich.' },
      { label: '3 Gewinnsätze', detail: 'Gespielt wird nach dem Modus 3 Gewinnsätze (Best-of-5). Mögliche Ergebnisse: 3:0, 3:1 oder 3:2. Kein anderes Ergebnis ist möglich.' },
      { label: 'Schnellauswahl', detail: 'Die sechs möglichen Ergebnisse (3:0, 3:1, 3:2, 0:3, 1:3, 2:3) werden als Schaltflächen angezeigt — einfach antippen und speichern.' },
      { label: 'Korrektur', detail: 'Ein eingetragenes Ergebnis kann jederzeit durch erneutes Antippen der Karte korrigiert werden.' },
    ],
  },
  {
    icon: 'arrow-forward-circle',
    iconBg: '#f3f4f6',
    iconColor: '#374151',
    title: 'Runden & Turnierverlauf',
    steps: [
      { label: 'Runde für Runde', detail: 'Die App zeigt immer nur die aktuelle Runde. Sobald alle Spiele einer Runde eingetragen sind, erscheint unten der Button „Runde X starten".' },
      { label: 'Nächste Runde starten', detail: 'Beim Doppelturnier bleiben die ausgelosten Doppel bestehen; es wird nur die nächste Runde freigeschaltet.' },
      { label: 'Turnier beendet', detail: 'Am Ende erscheint der Sieger in einem Banner. Bei Jeder-gegen-Jeden mit 10+ Spielern startet danach die KO-Phase.' },
    ],
  },
  {
    icon: 'share-outline',
    iconBg: '#f3e8ff',
    iconColor: '#7c3aed',
    title: 'PDF exportieren',
    steps: [
      { label: 'Teilen-Symbol', detail: 'Das Teilen-Symbol (↑) oben rechts im Header ist während des laufenden Turniers verfügbar.' },
      { label: 'Inhalt des PDFs', detail: 'Das PDF enthält die Abschlusstabelle (Platzierung, Siege, Niederlagen, Sätze, Punkte) sowie alle Spielergebnisse nach Runden geordnet.' },
      { label: 'Speichern & Teilen', detail: 'Nach dem Tippen öffnet sich der System-Dialog: PDF per WhatsApp, Mail oder AirDrop teilen oder direkt im Dateien-Ordner speichern.' },
    ],
  },
  {
    icon: 'refresh',
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    title: 'Turnier zurücksetzen',
    steps: [
      { label: 'Neu-Symbol', detail: 'Das Pfeil-Symbol (↺) oben rechts setzt das laufende Turnier zurück. Alle Ergebnisse werden gelöscht.' },
      { label: 'Daten werden lokal gespeichert', detail: 'Die App speichert den Turnierstand automatisch auf dem Gerät. Bei einem Neustart der App wird der letzte Stand wiederhergestellt.' },
    ],
  },
];

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = makeStyles(colors);
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (i: number) => setExpanded(prev => prev === i ? null : i);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Anleitung</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Turnier-App TV Stetten</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}>

        {/* Intro */}
        <View style={[styles.intro, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
          <Ionicons name="trophy" size={22} color={colors.primary} />
          <Text style={[styles.introText, { color: colors.primary }]}>
            Tischtennis Turnierverwaltung für TV Stetten — Rundenturnier, Schweizer System und Doppelturnier.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((sec, i) => {
          const open = expanded === i;
          return (
            <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: open ? colors.primary : colors.border }]}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggle(i)}
                activeOpacity={0.75}>
                <View style={[styles.iconBox, { backgroundColor: sec.iconBg }]}>
                  <Ionicons name={sec.icon} size={20} color={sec.iconColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{sec.title}</Text>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>

              {open && (
                <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
                  {sec.steps.map((step, j) => (
                    <View key={j} style={[styles.step, j > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                      <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stepLabel, { color: colors.foreground }]}>{step.label}</Text>
                        <Text style={[styles.stepDetail, { color: colors.mutedForeground }]}>{step.detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          TV Stetten · Tischtennis · Turnier-App
        </Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 8, paddingBottom: 12,
      borderBottomWidth: 1,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
    headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
    intro: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 16,
    },
    introText: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 20 },
    card: {
      borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    },
    iconBox: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
    cardBody: { borderTopWidth: 1, paddingHorizontal: 14, paddingBottom: 4 },
    step: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      paddingVertical: 12,
    },
    dot: {
      width: 7, height: 7, borderRadius: 4, marginTop: 6,
    },
    stepLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 3 },
    stepDetail: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
    footer: {
      textAlign: 'center', fontSize: 12,
      fontFamily: 'Inter_400Regular', marginTop: 16,
    },
  });
}
