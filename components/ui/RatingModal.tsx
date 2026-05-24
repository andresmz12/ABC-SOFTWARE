/**
 * RatingModal — shown to clients when a job is completed
 * 1-5 star rating + optional comment
 */
import { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

interface RatingModalProps {
  visible: boolean;
  jobId: string;
  clientId: string;
  providerId: string;
  es: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function RatingModal({
  visible,
  jobId,
  clientId,
  providerId,
  es,
  onClose,
  onSubmitted,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const displayRating = hoveredRating || rating;

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(
        es ? 'Selecciona una calificación' : 'Select a rating',
        es ? 'Por favor elige entre 1 y 5 estrellas.' : 'Please choose between 1 and 5 stars.',
      );
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        job_id: jobId,
        client_id: clientId,
        provider_id: providerId,
        rating,
        comment: comment.trim() || null,
      });
      if (error && !error.message.includes('unique')) throw error;
      onSubmitted?.();
      onClose();
      setRating(0);
      setComment('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const ratingLabels: Record<number, [string, string]> = {
    1: ['Poor', 'Malo'],
    2: ['Fair', 'Regular'],
    3: ['Good', 'Bueno'],
    4: ['Very good', 'Muy bueno'],
    5: ['Excellent!', '¡Excelente!'],
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 24,
          padding: 28,
          width: '100%',
          maxWidth: 400,
          borderWidth: 1,
          borderColor: C.line,
        }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: `${C.accent}15`,
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Feather name="star" size={28} color={C.accent} />
            </View>
            <Text style={{ color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: -0.3 }}>
              {es ? '¿Cómo fue el servicio?' : 'How was the service?'}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
              {es
                ? 'Tu opinión ayuda a otros clientes y mejora la plataforma.'
                : 'Your feedback helps other clients and improves the platform.'}
            </Text>
          </View>

          {/* Stars */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                onPressIn={() => setHoveredRating(star)}
                onPressOut={() => setHoveredRating(0)}
                activeOpacity={0.7}
              >
                <Feather
                  name="star"
                  size={36}
                  color={star <= displayRating ? '#F59E0B' : C.line}
                  style={{ opacity: star <= displayRating ? 1 : 0.5 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          {displayRating > 0 && (
            <Text style={{ color: '#F59E0B', fontSize: 14, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginBottom: 20 }}>
              {ratingLabels[displayRating]?.[es ? 1 : 0]}
            </Text>
          )}
          {displayRating === 0 && <View style={{ height: 28 }} />}

          {/* Comment */}
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={es ? 'Deja un comentario (opcional)...' : 'Leave a comment (optional)...'}
            placeholderTextColor={C.textMuted}
            style={{
              backgroundColor: C.surface2,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 14,
              fontFamily: 'Inter_400Regular',
              color: C.textPrimary,
              minHeight: 80,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: C.line,
              marginBottom: 20,
            }}
            multiline
            maxLength={500}
          />

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>
                {es ? 'Omitir' : 'Skip'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={{
                flex: 2, height: 52, borderRadius: 12,
                backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
                opacity: saving ? 0.6 : 1,
              }}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Enviar Calificación' : 'Submit Review'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
