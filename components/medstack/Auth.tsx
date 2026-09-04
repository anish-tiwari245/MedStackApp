import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { storage } from '@/lib/storage';
import { COLORS } from '@/constants/medstack-colors';
import { sharedStyles } from '@/styles/shared';
import type { User } from '@/types/medstack';

export default function Auth({ onAuthed }: { onAuthed: (user: User) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Enter an email and password.');
      return;
    }
    setBusy(true);
    try {
      const users = await storage.loadUsers();
      if (mode === 'signup') {
        if (users.some((u) => u.email === cleanEmail)) {
          setError('An account with that email already exists.');
          return;
        }
        const user: User = {
          id: `${Date.now()}`,
          email: cleanEmail,
          password,
          name: name.trim() || cleanEmail.split('@')[0],
        };
        await storage.saveUsers([...users, user]);
        onAuthed(user);
      } else {
        const user = users.find((u) => u.email === cleanEmail);
        if (!user || user.password !== password) {
          setError('Incorrect email or password.');
          return;
        }
        onAuthed(user);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={sharedStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>
          Med<Text style={styles.brandEm}>Stack</Text>
        </Text>
        <Text style={styles.tag}>SAFETY MAP</Text>

        <View style={[sharedStyles.card, styles.card]}>
          <Text style={sharedStyles.h2}>{mode === 'signin' ? 'Welcome back' : 'Create an account'}</Text>
          <Text style={sharedStyles.subtle}>
            {mode === 'signin' ? 'Sign in to see your saved medications.' : 'Sign up to start building your safety map.'}
          </Text>

          {mode === 'signup' && (
            <View style={{ marginTop: 14 }}>
              <Text style={sharedStyles.eyebrow}>NAME</Text>
              <TextInput style={sharedStyles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={COLORS.inkFaint} />
            </View>
          )}
          <View style={{ marginTop: 14 }}>
            <Text style={sharedStyles.eyebrow}>EMAIL</Text>
            <TextInput
              style={sharedStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.inkFaint}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={{ marginTop: 14 }}>
            <Text style={sharedStyles.eyebrow}>PASSWORD</Text>
            <TextInput
              style={sharedStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              placeholderTextColor={COLORS.inkFaint}
              secureTextEntry
            />
          </View>

          {!!error && <Text style={sharedStyles.errorText}>{error}</Text>}

          <TouchableOpacity style={[sharedStyles.btnPrimaryFull, { marginTop: 18 }]} onPress={submit} disabled={busy}>
            <Text style={sharedStyles.btnPrimaryText}>{busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
          >
            <Text style={styles.switchModeText}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: COLORS.teal, fontWeight: '700' }}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>Demo account - stored on this device only, this is not a real authentication backend.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 40 },
  brand: { fontSize: 30, fontWeight: '400', color: COLORS.ink, fontFamily: 'Georgia', textAlign: 'center' },
  brandEm: { fontStyle: 'italic', color: COLORS.teal },
  tag: { fontSize: 12, color: COLORS.inkFaint, letterSpacing: 1, textAlign: 'center', marginTop: 4, marginBottom: 28 },
  card: { padding: 22 },
  switchMode: { alignItems: 'center', marginTop: 16 },
  switchModeText: { fontSize: 13, color: COLORS.inkSoft },
  note: { fontSize: 11, color: COLORS.inkFaint, textAlign: 'center', marginTop: 20, lineHeight: 16 },
});
