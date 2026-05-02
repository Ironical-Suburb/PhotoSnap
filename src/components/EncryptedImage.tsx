import React, { useEffect, useState } from 'react';
import {
  Image, View, ActivityIndicator, StyleSheet,
} from 'react-native';
import type { ImageStyle, StyleProp, ImageResizeMode } from 'react-native';
import { decryptToLocalUri } from '../lib/crypto';
import { C } from '../theme';

type Props = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
};

export default function EncryptedImage({ uri, style, resizeMode = 'cover' }: Props) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLocalUri(null);

    decryptToLocalUri(uri)
      .then((path) => { if (!cancelled) { setLocalUri(path); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [uri]);

  if (loading) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator color={C.primary} size="small" />
      </View>
    );
  }

  if (!localUri) {
    return <View style={[styles.placeholder, style]} />;
  }

  return (
    <Image
      source={{ uri: localUri }}
      style={style}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: C.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
