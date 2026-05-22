import { useRef, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ViewToken } from 'react-native';
import { C } from '@/constants/theme';

interface ScrollPickerProps {
  visible: boolean;
  title: string;
  items: string[];
  selectedIndex: number;
  onConfirm: (index: number) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;

export default function ScrollPicker({
  visible, title, items, selectedIndex, onConfirm, onClose,
}: ScrollPickerProps) {
  const listRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(selectedIndex);

  useEffect(() => {
    if (!visible) return;
    setCurrent(selectedIndex);
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
    }, 50);
  }, [visible, selectedIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const mid = viewableItems[Math.floor(viewableItems.length / 2)];
      if (mid?.index != null) setCurrent(mid.index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.line }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>{title}</Text>
            <TouchableOpacity onPress={() => { onConfirm(current); onClose(); }}>
              <Text style={{ color: C.accent, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Selection highlight */}
          <View style={{ position: 'relative', height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
            {/* Center highlight bar */}
            <View pointerEvents="none" style={{
              position: 'absolute',
              top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
              left: 0, right: 0,
              height: ITEM_HEIGHT,
              backgroundColor: `${C.accent}18`,
              borderTopWidth: 1, borderBottomWidth: 1,
              borderColor: `${C.accent}40`,
            }} />

            <FlatList
              ref={listRef}
              data={items}
              keyExtractor={(_, i) => String(i)}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
              contentContainerStyle={{
                paddingTop: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
                paddingBottom: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
              }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCurrent(index);
                    listRef.current?.scrollToIndex({ index, animated: true });
                  }}
                  style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    color: index === current ? C.accent : C.textSecondary,
                    fontSize: index === current ? 17 : 15,
                    fontFamily: index === current ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          <View style={{ height: 32 }} />
        </View>
      </View>
    </Modal>
  );
}
