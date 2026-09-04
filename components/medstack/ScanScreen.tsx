import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS } from '@/constants/medstack-colors';
import { sharedStyles } from '@/styles/shared';
import { api } from '@/lib/api';
import type { Drug } from '@/types/medstack';

export default function ScanScreen({ onAdd }: { onAdd: (d: Omit<Drug, 'id'>) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'idle' | 'live' | 'reading'>('live');
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const [mName, setMName] = useState('');
  const [mDose, setMDose] = useState('');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View style={sharedStyles.container} />;

  if (!permission.granted) {
    return (
      <View style={sharedStyles.centerBox}>
        <Text style={sharedStyles.eyebrow}>ADD A MEDICATION</Text>
        <Text style={sharedStyles.h2}>We need camera access</Text>
        <TouchableOpacity style={sharedStyles.btnPrimary} onPress={requestPermission}>
          <Text style={sharedStyles.btnPrimaryText}>Grant permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sharedStyles.btnGhost} onPress={() => setManual(true)}>
          <Text style={sharedStyles.btnGhostText}>Enter manually instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current) return;
    setStatus('reading');
    setError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
      const result = await api.scan(dataUrl, 'image/jpeg');
      onAdd({ name: result.drug, dosage: result.dosage, frequency: result.frequency });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message + ' - try again or enter manually.');
    } finally {
      setStatus('live');
    }
  };

  const addManual = () => {
    if (!mName.trim()) return;
    onAdd({ name: mName.trim().toLowerCase(), dosage: mDose.trim() || null });
    setMName('');
    setMDose('');
  };

  return (
    <View style={{ flex: 1, paddingTop: 8 }}>
      <Text style={sharedStyles.eyebrow}>ADD A MEDICATION</Text>

      {!manual && (
        <View style={[sharedStyles.card, { flex: 1, marginTop: 10, overflow: 'hidden' }]}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          <View style={{ padding: 12, gap: 8 }}>
            <TouchableOpacity style={sharedStyles.btnPrimaryFull} onPress={capture} disabled={status === 'reading'}>
              {status === 'reading' ? <ActivityIndicator color="#fff" /> : <Text style={sharedStyles.btnPrimaryText}>Scan label</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={sharedStyles.btnGhost} onPress={() => setManual(true)}>
              <Text style={sharedStyles.btnGhostText}>Enter manually instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {manual && (
        <View style={[sharedStyles.card, { marginTop: 10, padding: 18, gap: 12 }]}>
          <View>
            <Text style={sharedStyles.eyebrow}>MEDICATION NAME</Text>
            <TextInput style={sharedStyles.input} value={mName} onChangeText={setMName} placeholder="e.g. warfarin" placeholderTextColor={COLORS.inkFaint} />
          </View>
          <View>
            <Text style={sharedStyles.eyebrow}>DOSAGE (OPTIONAL)</Text>
            <TextInput style={sharedStyles.input} value={mDose} onChangeText={setMDose} placeholder="e.g. 5 mg" placeholderTextColor={COLORS.inkFaint} />
          </View>
          <TouchableOpacity style={sharedStyles.btnPrimary} onPress={addManual}>
            <Text style={sharedStyles.btnPrimaryText}>Add to stack</Text>
          </TouchableOpacity>
          <TouchableOpacity style={sharedStyles.btnGhost} onPress={() => setManual(false)}>
            <Text style={sharedStyles.btnGhostText}>Use camera instead</Text>
          </TouchableOpacity>
        </View>
      )}

      {!!error && <Text style={sharedStyles.errorText}>{error}</Text>}
    </View>
  );
}
