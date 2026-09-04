import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/medstack-colors';
import { sharedStyles } from '@/styles/shared';
import { SEV_META, worstFor } from '@/lib/severity';
import type { Drug, Group, Pair, Summary } from '@/types/medstack';

export default function StackScreen({
  drugs,
  groups,
  pairs,
  summary,
  onRemove,
  onRename,
  onCreateGroup,
  onDeleteGroup,
  onAssignGroup,
  onGoScan,
}: {
  drugs: Drug[];
  groups: Group[];
  pairs: Pair[];
  summary: Summary;
  onRemove: (id: string) => void;
  onRename: (id: string, displayName: string | null) => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (id: string) => void;
  onAssignGroup: (drugId: string, groupId: string | null) => void;
  onGoScan: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const submitGroup = () => {
    if (!groupName.trim()) return;
    onCreateGroup(groupName.trim());
    setGroupName('');
    setCreating(false);
  };

  const startRename = (d: Drug) => {
    setRenamingId(d.id);
    setRenameDraft(d.displayName || d.name);
  };

  const submitRename = (d: Drug) => {
    const trimmed = renameDraft.trim();
    onRename(d.id, !trimmed || trimmed.toLowerCase() === d.name.toLowerCase() ? null : trimmed);
    setRenamingId(null);
  };

  if (drugs.length === 0 && groups.length === 0) {
    return (
      <View style={sharedStyles.centerBox}>
        <Text style={sharedStyles.h2}>No medications yet</Text>
        <Text style={sharedStyles.subtle}>Scan a pill bottle to start building this person&apos;s safety map.</Text>
        <TouchableOpacity style={sharedStyles.btnPrimary} onPress={onGoScan}>
          <Text style={sharedStyles.btnPrimaryText}>Scan first bottle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ paddingTop: 8 }}>
      <View style={sharedStyles.rowBetween}>
        <Text style={sharedStyles.eyebrow}>GROUPS</Text>
        <TouchableOpacity style={styles.newGroupBtn} onPress={() => setCreating((c) => !c)}>
          <Text style={styles.newGroupBtnText}>{creating ? 'Cancel' : 'New group'}</Text>
        </TouchableOpacity>
      </View>

      {creating && (
        <View style={[sharedStyles.card, styles.groupForm]}>
          <Text style={sharedStyles.eyebrow}>GROUP NAME</Text>
          <TextInput
            style={sharedStyles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. Mon/Tue/Wed, Mornings"
            placeholderTextColor={COLORS.inkFaint}
            autoFocus
            onSubmitEditing={submitGroup}
          />
          <TouchableOpacity style={sharedStyles.btnPrimary} onPress={submitGroup}>
            <Text style={sharedStyles.btnPrimaryText}>Create group</Text>
          </TouchableOpacity>
        </View>
      )}

      {groups.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {groups.map((g) => (
            <View key={g.id} style={styles.groupPill}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupPillName}>{g.name}</Text>
                <Text style={styles.groupPillMeta}>
                  {drugs.filter((d) => d.groupId === g.id).length + ' med(s)'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onDeleteGroup(g.id)} hitSlop={8}>
                <Text style={styles.groupPillRemove}>x</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: 28 }}>
        <Text style={sharedStyles.eyebrow}>CURRENT STACK - {drugs.length}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          {summary.red > 0 && <Chip color="red" text={`${summary.red} stop`} />}
          {summary.yellow > 0 && <Chip color="amber" text={`${summary.yellow} caution`} />}
          {summary.green > 0 && <Chip color="green" text={`${summary.green} safe`} />}
        </View>
      </View>

      <View style={{ gap: 10, marginTop: 12 }}>
        {drugs.map((d) => {
          const sev = worstFor(d.name, pairs);
          const label = d.displayName || d.name;
          const isRenaming = renamingId === d.id;
          return (
            <View key={d.id} style={[sharedStyles.card, { padding: 14, borderLeftWidth: 3, borderLeftColor: SEV_META[sev].dot }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  {isRenaming ? (
                    <TextInput
                      style={styles.renameInput}
                      value={renameDraft}
                      onChangeText={setRenameDraft}
                      autoFocus
                      onSubmitEditing={() => submitRename(d)}
                      onBlur={() => submitRename(d)}
                      placeholder={d.name}
                      placeholderTextColor={COLORS.inkFaint}
                    />
                  ) : (
                    <View style={styles.nameRow}>
                      <Text style={sharedStyles.drugName}>{label}</Text>
                      <TouchableOpacity style={styles.editBtn} onPress={() => startRename(d)} hitSlop={6}>
                        <Text style={styles.editHint}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={[sharedStyles.subtle, { textAlign: 'left' }]}>
                    {[d.dosage, d.frequency].filter(Boolean).join(' - ') || 'No dosage recorded'}
                    {d.displayName ? ` - scanned as "${d.name}"` : ''}
                  </Text>
                </View>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: SEV_META[sev].dot }} />
                <TouchableOpacity onPress={() => onRemove(d.id)} hitSlop={8}>
                  <Text style={{ color: COLORS.inkFaint, fontSize: 18 }}>x</Text>
                </TouchableOpacity>
              </View>

              {groups.length > 0 && (
                <View style={styles.groupAssignRow}>
                  <Text style={styles.groupAssignLabel}>Group:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      onPress={() => onAssignGroup(d.id, null)}
                      style={[sharedStyles.filterChip, !d.groupId && sharedStyles.filterChipActive]}
                    >
                      <Text style={[sharedStyles.filterChipText, !d.groupId && sharedStyles.filterChipTextActive]}>None</Text>
                    </TouchableOpacity>
                    {groups.map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => onAssignGroup(d.id, g.id)}
                        style={[sharedStyles.filterChip, d.groupId === g.id && sharedStyles.filterChipActive]}
                      >
                        <Text style={[sharedStyles.filterChipText, d.groupId === g.id && sharedStyles.filterChipTextActive]}>{g.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Chip({ color, text }: { color: 'red' | 'amber' | 'green'; text: string }) {
  const bg = { red: COLORS.redSoft, amber: COLORS.amberSoft, green: COLORS.greenSoft }[color];
  const ink = { red: COLORS.redInk, amber: COLORS.amberInk, green: COLORS.greenInk }[color];
  const dot = { red: COLORS.red, amber: COLORS.amber, green: COLORS.green }[color];
  return (
    <View style={[sharedStyles.chip, { backgroundColor: bg }]}>
      <View style={[sharedStyles.chipDot, { backgroundColor: dot }]} />
      <Text style={{ color: ink, fontSize: 12, fontWeight: '500' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  newGroupBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  newGroupBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  groupForm: { marginTop: 10, padding: 16, gap: 4 },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 140,
  },
  groupPillName: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  groupPillMeta: { fontSize: 11, color: COLORS.inkFaint, marginTop: 1 },
  groupPillRemove: { color: COLORS.inkFaint, fontSize: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  editBtn: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  editHint: { fontSize: 10.5, fontWeight: '600', color: COLORS.teal, textTransform: 'uppercase' },
  renameInput: {
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  groupAssignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  groupAssignLabel: { fontSize: 10.5, color: COLORS.inkFaint },
});
