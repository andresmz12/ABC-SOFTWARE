import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

const schema = z.object({
  serviceType: z.enum(['commercial', 'residential']),
  city: z.string().min(2, 'Required'),
  state: z.string().min(2, 'Required'),
  zip: z.string().min(3, 'Required'),
  scheduledDate: z.string().min(8, 'Enter a date'),
  scheduledTime: z.string().min(4, 'Enter a time'),
  estimatedHours: z.string().min(1, 'Required'),
  budgetMin: z.string().min(1, 'Required'),
  budgetMax: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function PostJob() {
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'residential' },
  });

  const serviceType = watch('serviceType');

  const onSubmit = (data: FormData) => {
    Alert.alert('Job Posted', 'Your job has been posted. You will receive quotes from providers shortly.');
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>
      {label}
    </Text>
  );

  return (
    <ScreenWrapper scroll className="px-6">
      <View style={{ paddingTop: 32, paddingBottom: 24 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Post a Job</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>Tell providers what you need</Text>
      </View>

      {/* Service type */}
      <SectionLabel label="Service Type" />
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        {([
          { type: 'residential' as const, icon: 'home' as const,      label: 'Residential' },
          { type: 'commercial'  as const, icon: 'briefcase' as const, label: 'Commercial' },
        ]).map((s) => {
          const active = serviceType === s.type;
          return (
            <TouchableOpacity
              key={s.type}
              onPress={() => setValue('serviceType', s.type)}
              style={{
                flex: 1,
                backgroundColor: active ? `${C.accent}15` : C.surface,
                borderWidth: 1.5,
                borderColor: active ? C.accent : C.line,
                borderRadius: 14,
                padding: 16,
                alignItems: 'center',
              }}
              activeOpacity={0.85}
            >
              <Feather name={s.icon} size={22} color={active ? C.accent : C.textMuted} />
              <Text style={{ color: active ? C.textPrimary : C.textMuted, fontSize: 14, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular', marginTop: 8 }}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Location */}
      <SectionLabel label="Location" />
      <Controller control={control} name="city"  render={({ field: { onChange, value } }) => <Input label="City"       value={value} onChangeText={onChange} iconName="map-pin" placeholder="Miami"   error={errors.city?.message}  />} />
      <Controller control={control} name="state" render={({ field: { onChange, value } }) => <Input label="State"      value={value} onChangeText={onChange} iconName="map"     placeholder="FL"      error={errors.state?.message} />} />
      <Controller control={control} name="zip"   render={({ field: { onChange, value } }) => <Input label="ZIP Code"   value={value} onChangeText={onChange} iconName="hash"    placeholder="33101"   keyboardType="number-pad" error={errors.zip?.message} />} />

      {/* Schedule */}
      <SectionLabel label="Schedule" />
      <Controller control={control} name="scheduledDate" render={({ field: { onChange, value } }) => <Input label="Date"       value={value} onChangeText={onChange} iconName="calendar" placeholder="MM/DD/YYYY" error={errors.scheduledDate?.message} />} />
      <Controller control={control} name="scheduledTime" render={({ field: { onChange, value } }) => <Input label="Time"       value={value} onChangeText={onChange} iconName="clock"    placeholder="09:00 AM"  error={errors.scheduledTime?.message} />} />
      <Controller control={control} name="estimatedHours" render={({ field: { onChange, value } }) => <Input label="Duration (hours)" value={value} onChangeText={onChange} keyboardType="decimal-pad" iconName="activity" placeholder="3" error={errors.estimatedHours?.message} />} />

      {/* Budget */}
      <SectionLabel label="Budget" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="budgetMin" render={({ field: { onChange, value } }) => <Input label="Min ($)" value={value} onChangeText={onChange} keyboardType="decimal-pad" iconName="dollar-sign" placeholder="80" error={errors.budgetMin?.message} />} />
        </View>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="budgetMax" render={({ field: { onChange, value } }) => <Input label="Max ($)" value={value} onChangeText={onChange} keyboardType="decimal-pad" iconName="dollar-sign" placeholder="120" />} />
        </View>
      </View>

      {/* Description */}
      <SectionLabel label="Description" />
      <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
        <View style={{ marginBottom: 16 }}>
          <View style={{ backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, padding: 16, minHeight: 100 }}>
            <Text
              style={{ color: value ? C.textPrimary : C.textMuted, fontSize: 15, fontFamily: 'Inter_400Regular' }}
              onPress={() => {}}
            >
              {value || 'Describe what you need — number of rooms, special instructions, supplies...'}
            </Text>
          </View>
        </View>
      )} />

      <Button label="Post Job" onPress={handleSubmit(onSubmit)} className="mt-4 mb-6" />
    </ScreenWrapper>
  );
}
