/**
 * storage.ts — Native (iOS/Android) implementation of the storage adapter
 * On web, storage.web.ts is loaded instead by the bundler — AsyncStorage
 * is NOT bundled for web at all, preventing import errors on Vercel.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = AsyncStorage;
