import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

type FeatherName = keyof typeof Feather.glyphMap;

export default function TabIcon({
  name,
  focused,
  activeColor = C.accent,
}: {
  name: FeatherName;
  focused: boolean;
  activeColor?: string;
}) {
  return <Feather name={name} size={22} color={focused ? activeColor : C.textMuted} />;
}
