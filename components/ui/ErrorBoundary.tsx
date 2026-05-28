import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.danger}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Feather name="alert-triangle" size={30} color={C.danger} />
          </View>
          <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 8, textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>
            {this.state.error?.message ?? 'An unexpected error occurred. Please try again.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: undefined })}
            style={{ backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
