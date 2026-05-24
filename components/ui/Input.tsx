import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  iconName?: keyof typeof Feather.glyphMap;
  rightElement?: React.ReactNode;
}

export default function Input({ label, error, iconName, rightElement, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(props.secureTextEntry ?? false);

  const borderColor = error ? C.danger : focused ? C.accent : C.line;

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text
          style={{
            color: C.textSecondary,
            fontSize: 11,
            letterSpacing: 1,
            marginBottom: 8,
            fontFamily: 'Inter_600SemiBold',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: props.multiline ? 'flex-start' : 'center',
          backgroundColor: C.surface2,
          borderWidth: 1.5,
          borderColor,
          borderRadius: 12,
          height: props.multiline ? undefined : 56,
          minHeight: 56,
          paddingHorizontal: 16,
          paddingVertical: props.multiline ? 12 : 0,
        }}
      >
        {iconName && (
          <Feather name={iconName} size={18} color={C.textMuted} style={{ marginRight: 10 }} />
        )}
        <TextInput
          {...props}
          secureTextEntry={secure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[{
            flex: 1,
            color: C.textPrimary,
            fontSize: 16,
            fontFamily: 'Inter_400Regular',
          }, style]}
          placeholderTextColor={C.textMuted}
        />
        {props.secureTextEntry && (
          <TouchableOpacity onPress={() => setSecure((v) => !v)} hitSlop={8}>
            <Feather name={secure ? 'eye-off' : 'eye'} size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
        {!props.secureTextEntry && rightElement}
      </View>
      {error && (
        <Text style={{ color: C.danger, fontSize: 12, marginTop: 4, fontFamily: 'Inter_400Regular' }}>
          {error}
        </Text>
      )}
    </View>
  );
}
