// CareerModal — the work + school hub. Pick a job (gated by education), clock in
// and out of shifts (paid per in-game hour), and enroll in the next education
// program to unlock better-paying work. Reads the live pet economy + a ~1s clock
// so the shift timer and study countdown tick in place.

import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { PetEconomy } from '../game/types';
import {
  JOBS,
  type JobDef,
  canAfford,
  coinsLabel,
  currentJob,
  educationTitle,
  isStudying,
  isWorking,
  nextEducation,
  qualifiesFor,
  shiftEarned,
  shiftElapsedSec,
  shiftMaxed,
  studyRemainingSec,
} from '../game/economy';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import {
  COLOR_OVERLAY,
  COLOR_WARNING,
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  BORDER_WIDTH,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
} from '../theme';

interface CareerModalProps {
  visible: boolean;
  economy: PetEconomy;
  now: number;
  onChooseJob: (jobId: string) => void;
  onQuit: () => void;
  onToggleWork: () => void;
  onEnroll: () => void;
  onClose: () => void;
}

function mmss(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Job row ────────────────────────────────────────────────────────────────────

interface JobRowProps {
  job:       JobDef;
  economy:   PetEconomy;
  onChoose:  (jobId: string) => void;
}

function JobRow({ job, economy, onChoose }: JobRowProps): React.ReactElement {
  const isCurrent = economy.jobId === job.id;
  const qualified = qualifiesFor(economy, job);
  const selectable = qualified && !isCurrent;

  const handlePress = (): void => {
    if (!selectable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onChoose(job.id);
  };

  // Right-side status: ON (current) · TAKE (qualified) · NEEDS <EDU> (locked)
  let statusLabel: string;
  let statusColor: string;
  if (isCurrent) {
    statusLabel = 'ON';
    statusColor = LCD_DARK;
  } else if (qualified) {
    statusLabel = 'TAKE';
    statusColor = LCD_SHADE2;
  } else {
    statusLabel = educationTitle(job.requiredEducation);
    statusColor = COLOR_WARNING;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!selectable}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, pays ${job.wagePerHour} per hour. ${isCurrent ? 'Current job' : qualified ? 'Tap to take' : `Requires ${educationTitle(job.requiredEducation)}`}`}
      style={[styles.row, isCurrent && styles.rowCurrent, !qualified && styles.rowLocked]}
    >
      <View style={styles.rowMain}>
        <PixelText variant="sm" color={LCD_DARK}>{job.title}</PixelText>
        <PixelText variant="tiny" color={LCD_SHADE2} style={styles.rowSub}>
          {job.wagePerHour}c/HR
        </PixelText>
      </View>
      <PixelText variant="tiny" color={statusColor}>{statusLabel}</PixelText>
    </TouchableOpacity>
  );
}

// ─── Career modal ────────────────────────────────────────────────────────────────

export function CareerModal({
  visible,
  economy,
  now,
  onChooseJob,
  onQuit,
  onToggleWork,
  onEnroll,
  onClose,
}: CareerModalProps): React.ReactElement {
  const job = currentJob(economy);
  const working = isWorking(economy);
  const studying = isStudying(economy);
  const next = nextEducation(economy);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          {/* Header: balance + education level */}
          <View style={styles.header}>
            <PixelText variant="md" color={LCD_DARK}>CAREER</PixelText>
            <PixelText variant="sm" color={LCD_DARK}>◈ {coinsLabel(economy)}</PixelText>
          </View>
          <PixelText variant="tiny" color={LCD_SHADE2} style={styles.eduLine}>
            EDUCATION: {educationTitle(economy.education)}
          </PixelText>

          <View style={styles.divider} />

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {/* ── Jobs ── */}
            <PixelText variant="tiny" color={LCD_SHADE2} style={styles.sectionLabel}>JOBS</PixelText>
            {JOBS.map((j) => (
              <JobRow key={j.id} job={j} economy={economy} onChoose={onChooseJob} />
            ))}

            {/* ── Work controls (only when employed) ── */}
            {job !== null && (
              <>
                <View style={styles.divider} />
                <View style={styles.workRow}>
                  <View style={styles.workStatus}>
                    {working ? (
                      <>
                        <PixelText variant="sm" color={LCD_DARK}>
                          WORKING {mmss(shiftElapsedSec(economy, now))}
                        </PixelText>
                        <PixelText variant="tiny" color={shiftMaxed(economy) ? COLOR_WARNING : LCD_SHADE2} style={styles.rowSub}>
                          +{shiftEarned(economy)}c{shiftMaxed(economy) ? ' · SHIFT FULL' : ''}
                        </PixelText>
                      </>
                    ) : (
                      <PixelText variant="tiny" color={LCD_SHADE2}>{job.title} · OFF THE CLOCK</PixelText>
                    )}
                  </View>
                  <PixelButton
                    label={working ? 'CLOCK OUT' : 'CLOCK IN'}
                    onPress={onToggleWork}
                    accessibilityLabel={working ? 'Clock out and bank wages' : 'Clock in to start earning'}
                  />
                </View>
                {!working && (
                  <View style={styles.quitRow}>
                    <TouchableOpacity
                      onPress={onQuit}
                      accessibilityRole="button"
                      accessibilityLabel={`Quit your job as ${job.title}`}
                    >
                      <PixelText variant="tiny" color={COLOR_WARNING}>[QUIT JOB]</PixelText>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* ── School ── */}
            <View style={styles.divider} />
            <PixelText variant="tiny" color={LCD_SHADE2} style={styles.sectionLabel}>SCHOOL</PixelText>
            {studying ? (
              <PixelText variant="sm" color={LCD_DARK} style={styles.schoolLine}>
                STUDYING… {mmss(studyRemainingSec(economy, now))} LEFT
              </PixelText>
            ) : next === null ? (
              <PixelText variant="sm" color={LCD_DARK} style={styles.schoolLine}>
                FULLY EDUCATED ✓
              </PixelText>
            ) : (
              <View style={styles.schoolRow}>
                <View style={styles.rowMain}>
                  <PixelText variant="sm" color={LCD_DARK}>{next.title}</PixelText>
                  <PixelText variant="tiny" color={LCD_SHADE2} style={styles.rowSub}>
                    {next.tuition}c · {next.durationSec}s
                  </PixelText>
                </View>
                <PixelButton
                  label="ENROLL"
                  onPress={onEnroll}
                  disabled={!canAfford(economy, next.tuition)}
                  accessibilityLabel={`Enroll in ${next.title} for ${next.tuition} coins`}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <PixelButton label="CLOSE" onPress={onClose} accessibilityLabel="Close career" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: COLOR_OVERLAY,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         SPACE_8,
  },
  panel: {
    width:           '100%',
    maxWidth:        320,
    maxHeight:       '85%',
    backgroundColor: LCD_BG,
    borderWidth:     BORDER_WIDTH,
    borderColor:     LCD_DARK,
    padding:         SPACE_6,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  eduLine: {
    marginTop: SPACE_2,
  },
  divider: {
    height:          BORDER_WIDTH,
    backgroundColor: LCD_SHADE2,
    opacity:         0.5,
    marginVertical:  SPACE_4,
  },
  list: {
    flexGrow: 0,
  },
  sectionLabel: {
    marginBottom: SPACE_2,
    letterSpacing: 1,
  },
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: SPACE_4,
    paddingHorizontal: SPACE_4,
  },
  rowCurrent: {
    backgroundColor: '#C7DE84', // faint highlight for the active job
  },
  rowLocked: {
    opacity: 0.5,
  },
  rowMain: {
    flex: 1,
  },
  rowSub: {
    marginTop: SPACE_2,
  },
  workRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  workStatus: {
    flex: 1,
  },
  quitRow: {
    marginTop: SPACE_2,
    alignItems: 'flex-start',
  },
  schoolRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  schoolLine: {
    paddingVertical: SPACE_2,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      SPACE_4,
  },
});
